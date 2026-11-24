import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { describeCorrect } from '@/lib/assessment/result-view'
import { rngFor } from '@/lib/assessment/prng'
import { generateValues, type PoolQuestion, type Variant } from '@/lib/assessment/variant'
import { LIVE_TYPES } from '@/lib/lecture-schemas'
import { decideAdvance, type AdvanceAction } from '@/lib/checkpoint-flow'
import { buildLiveQuestion, sharedVariant, type LiveQuestionView } from '@/lib/live-question'
import { buildRating, type RatingRow, type ScoreRow } from '@/lib/live-rating'
import { ApiError } from '@/lib/server/api'
import { participantNames } from '@/lib/server/names'
import { mapDbError } from '@/lib/server/db-errors'
import type { SessionRow } from '@/lib/server/sessions'
import { getSettings } from '@/lib/server/settings'

export interface SqRow {
  id: string
  session_id: string
  lecture_question_id: string | null
  question_id: string
  slide_no: number
  time_limit_sec: number
  variant: Variant
  opened_at: string
  closed_at: string | null
}
export type LiveQ = Pick<PoolQuestion, 'type' | 'body' | 'params'>

/** Joriy slayddagi (eng oxirgi) savol — ochiq yoki yopilgan. Slayd o'zgarsa doska oddiy holatga qaytadi. */
export async function currentQuestion(
  admin: SupabaseClient,
  session: Pick<SessionRow, 'id' | 'current_slide'>,
): Promise<{ sq: SqRow; q: LiveQ } | null> {
  const { data: sq } = await admin
    .from('session_questions')
    .select('*')
    .eq('session_id', session.id)
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!sq || (sq as SqRow).slide_no !== session.current_slide) return null
  const { data: q } = await admin
    .from('questions')
    .select('type, body, params')
    .eq('id', (sq as SqRow).question_id)
    .single()
  return q ? { sq: sq as SqRow, q: q as unknown as LiveQ } : null
}

export async function currentQuestionView(
  admin: SupabaseClient,
  session: Pick<SessionRow, 'id' | 'current_slide'>,
): Promise<LiveQuestionView | null> {
  const cur = await currentQuestion(admin, session)
  return cur ? buildLiveQuestion(cur.sq, cur.q, new Date()) : null
}

/** Rejalashtirilgan savolni ochadi (avvalgi ochiq savol yopiladi). Savolning slaydi joriy slayd bo'lmasa — avval slaydga o'tiladi. */
export async function openPlannedQuestion(
  admin: SupabaseClient,
  session: SessionRow,
  lectureQuestionId: string,
): Promise<void> {
  const { data: lq } = await admin
    .from('lecture_questions')
    .select('id, lecture_id, slide_no, question_id, time_limit_sec, questions(type, body, params)')
    .eq('id', lectureQuestionId)
    .maybeSingle()
  if (!lq || lq.lecture_id !== session.lecture_id) throw new ApiError(404, 'not_found')
  const q = lq.questions as unknown as LiveQ | null
  if (!q || !(LIVE_TYPES as readonly string[]).includes(q.type))
    throw new ApiError(400, 'validation', 'type_not_live')

  if (Number(lq.slide_no) !== session.current_slide) {
    const { error } = await admin.rpc('app_session_set_slide', {
      p_session_id: session.id,
      p_slide: lq.slide_no,
    })
    if (error) mapDbError(error)
  }
  const settings = await getSettings(admin)
  // Raqamli savol: urug' = sessiya + savol → butun auditoriyaga bir xil qiymatlar
  const variant = sharedVariant(q, (vars) =>
    generateValues(vars, rngFor(`${session.id}:${lq.question_id}`)),
  )
  const { error } = await admin.rpc('app_open_session_question', {
    p_session_id: session.id,
    p_lecture_question_id: lq.id,
    p_question_id: lq.question_id,
    p_slide: lq.slide_no,
    p_limit: lq.time_limit_sec ?? settings.live_question_seconds,
    p_variant: variant,
    p_opened_at: new Date().toISOString(),
  })
  if (error) mapDbError(error)
}

/** Ochiq savol bo'lsa yopadi (yo'q bo'lsa — xato emas). */
export async function closeOpenQuestion(
  admin: SupabaseClient,
  sessionId: string,
): Promise<boolean> {
  const { error } = await admin.rpc('app_close_session_question', {
    p_session_id: sessionId,
    p_closed_at: new Date().toISOString(),
  })
  if (!error) return true
  if (String(error.message).includes('no_open_question')) return false
  mapDbError(error)
}

export interface AdvanceResult {
  action: AdvanceAction
}

/**
 * O'qituvchi "Keyingi" (yoki "o'tkazib yuborish") bosganda: nuqta oqimi (lib/checkpoint-flow.ts) bo'yicha
 * savolni yopadi/ochadi yoki slaydni almashtiradi. Faqat oldinga o'tishda ishlaydi.
 */
export async function advanceSession(
  admin: SupabaseClient,
  session: SessionRow,
  skip: boolean,
): Promise<AdvanceResult> {
  const { data: open } = await admin
    .from('session_questions')
    .select('id')
    .eq('session_id', session.id)
    .is('closed_at', null)
    .limit(1)
  const { data: lec } = await admin
    .from('lectures')
    .select('page_count')
    .eq('id', session.lecture_id)
    .single()
  const { data: planned } = await admin
    .from('lecture_questions')
    .select('id, is_bonus')
    .eq('lecture_id', session.lecture_id)
    .eq('slide_no', session.current_slide)
    .order('position')
  const ids = (planned ?? []).map((p) => p.id as string)
  const { data: asked } = ids.length
    ? await admin
        .from('session_questions')
        .select('lecture_question_id')
        .eq('session_id', session.id)
        .in('lecture_question_id', ids)
    : { data: [] }
  const done = new Set((asked ?? []).map((a) => a.lecture_question_id as string))
  const regular = (planned ?? []).filter((p) => !p.is_bonus && !done.has(p.id as string))

  const action = decideAdvance({
    hasOpenQuestion: Boolean(open?.length),
    skip,
    pendingRegular: regular.length,
    bonusReady: false, // 9-bosqichda: eng faol talaba + bonus savol aniqlanadi
    slide: session.current_slide,
    pageCount: Number(lec?.page_count ?? 1),
  })

  if (action === 'close' || action === 'close_and_advance')
    await closeOpenQuestion(admin, session.id)
  if (action === 'open_next') await openPlannedQuestion(admin, session, regular[0]?.id as string)
  if (action === 'advance' || action === 'close_and_advance') {
    if (session.current_slide < Number(lec?.page_count ?? 1)) {
      const { error } = await admin.rpc('app_session_set_slide', {
        p_session_id: session.id,
        p_slide: session.current_slide + 1,
      })
      if (error) mapDbError(error)
    }
  }
  return { action }
}

export interface QuestionStats {
  questionId: string
  status: 'open' | 'closed'
  answered: number
  participants: number
  /** mcq: variant bo'yicha javoblar soni (ochiq paytda ham ko'rinadi — to'g'rilik emas) */
  counts: Record<string, number> | null
  /** Faqat savol YOPILGANDAN keyin */
  correct: { text: string; ids: string[]; count: number } | null
}

export async function questionStats(
  admin: SupabaseClient,
  session: SessionRow,
): Promise<QuestionStats | null> {
  const cur = await currentQuestion(admin, session)
  if (!cur) return null
  const { sq, q } = cur
  const [{ data: answers }, { count: participants }] = await Promise.all([
    admin.from('session_answers').select('response, is_correct').eq('session_question_id', sq.id),
    admin
      .from('session_participants')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session.id),
  ])
  const rows = answers ?? []
  let counts: Record<string, number> | null = null
  if (q.type === 'mcq') {
    counts = Object.fromEntries((q.body.options ?? []).map((o) => [o.id, 0]))
    for (const r of rows)
      for (const id of (r.response as { selected?: string[] } | null)?.selected ?? [])
        if (id in counts) counts[id] = (counts[id] ?? 0) + 1
  }
  let correct: QuestionStats['correct'] = null
  if (sq.closed_at) {
    const { data: key } = await admin
      .from('question_keys')
      .select('correct')
      .eq('question_id', sq.question_id)
      .maybeSingle()
    correct = {
      text: describeCorrect(q, key as { correct: unknown } | null, sq.variant),
      ids:
        q.type === 'mcq'
          ? (((key as { correct?: string[] } | null)?.correct as string[] | undefined) ?? [])
          : [],
      count: rows.filter((r) => r.is_correct).length,
    }
  }
  return {
    questionId: sq.id,
    status: sq.closed_at ? 'closed' : 'open',
    answered: rows.length,
    participants: participants ?? 0,
    counts,
    correct,
  }
}

// Reyting har talaba telefonidan so'raladi: bir necha yuz so'rov bir xil natijani qayta hisoblamasin (2 s kesh)
const ratingCache = new Map<string, { at: number; rows: RatingRow[] }>()

/** Sessiya reytingi (barcha ishtirokchilar, tartiblangan, medallar bilan). */
export async function sessionRating(
  admin: SupabaseClient,
  sessionId: string,
): Promise<RatingRow[]> {
  const hit = ratingCache.get(sessionId)
  if (hit && Date.now() - hit.at < 2000) return hit.rows
  const rows = await computeRating(admin, sessionId)
  ratingCache.set(sessionId, { at: Date.now(), rows })
  if (ratingCache.size > 50) ratingCache.delete(ratingCache.keys().next().value as string)
  return rows
}

async function computeRating(admin: SupabaseClient, sessionId: string): Promise<RatingRow[]> {
  const { data } = await admin
    .from('scores')
    .select('student_id, total_points, correct_count, correct_time_ms')
    .eq('session_id', sessionId)
    .limit(1000)
  const rows: ScoreRow[] = (data ?? []).map((r) => ({
    student_id: r.student_id as string,
    total_points: Number(r.total_points),
    correct_count: Number(r.correct_count),
    correct_time_ms: Number(r.correct_time_ms),
  }))
  // Ismlar: talaba — profil, mehmon — kiritgan ismi
  const people = await participantNames(
    admin,
    sessionId,
    rows.map((r) => r.student_id),
  )
  return buildRating(rows, new Map([...people].map(([id, p]) => [id, p.full_name])))
}
