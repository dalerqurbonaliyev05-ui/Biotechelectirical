import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/lib/server/api'
import { currentPoll, pinnedAsk } from '@/lib/server/extras'
import { currentQuestionView } from '@/lib/server/live-questions'
import { bookUrl } from '@/lib/books'
import { serverEnv } from '@/lib/env'
import type { PlanItem, SessionState } from '@/lib/session-state'
import type { SessionProfile } from '@/lib/types'

export interface SessionRow {
  id: string
  lecture_id: string
  created_by: string
  group_id: string | null
  code: string
  status: 'active' | 'ended'
  current_slide: number
  rev: number
  allow_guests: boolean
  min_attendance_ratio: number
  top_reactors: number
  show_reactor_names: boolean
  bonus_enabled: boolean
  confused_enabled: boolean
  share_annotations: boolean
  focus_seq: number
  break_started_at: string | null
  started_at: string
  ended_at: string | null
}

/** Sessiya ustunlari (bir joyda: ro'yxat o'zgarsa hamma so'rov mos keladi). */
export const SESSION_COLS =
  'id, lecture_id, created_by, group_id, code, status, current_slide, rev, allow_guests, min_attendance_ratio, top_reactors, show_reactor_names, bonus_enabled, confused_enabled, share_annotations, focus_seq, break_started_at, started_at, ended_at'

/**
 * Sessiyani boshqarish huquqi: yaratuvchi o'qituvchi yoki admin. `userClient` — RLS ostida,
 * shuning uchun boshqa o'qituvchining sessiyasi umuman ko'rinmaydi (404).
 */
export async function findControlledSession(
  userClient: SupabaseClient,
  profile: SessionProfile,
  id: string,
): Promise<SessionRow | null> {
  const { data } = await userClient
    .from('lecture_sessions')
    .select(SESSION_COLS)
    .eq('id', id)
    .maybeSingle()
  const row = data as SessionRow | null
  if (!row || (profile.role !== 'admin' && row.created_by !== profile.id)) return null
  return row
}

export async function getControlledSession(
  userClient: SupabaseClient,
  profile: SessionProfile,
  id: string,
): Promise<SessionRow> {
  const row = await findControlledSession(userClient, profile, id)
  if (!row) throw new ApiError(404, 'not_found')
  return row
}

/** Shaxsiy bucket'dagi PDF uchun 2 soatlik imzolangan havola (faqat server chaqiradi). */
export async function signedPdfUrl(
  admin: SupabaseClient,
  lectureId: string,
): Promise<string | null> {
  const { data: lec } = await admin
    .from('lectures')
    .select('pdf_path')
    .eq('id', lectureId)
    .maybeSingle()
  if (!lec) return null
  const { data } = await admin.storage
    .from('lectures')
    .createSignedUrl(lec.pdf_path as string, 7200)
  return data?.signedUrl ?? null
}

export async function buildSessionState(
  admin: SupabaseClient,
  s: SessionRow,
): Promise<SessionState> {
  const [{ data: lec }, { count }, question, { data: planned }, { data: asked }, { data: bks }] =
    await Promise.all([
      admin.from('lectures').select('title, page_count').eq('id', s.lecture_id).single(),
      admin
        .from('session_participants')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', s.id),
      currentQuestionView(admin, s),
      admin
        .from('lecture_questions')
        .select('id, slide_no, position, is_bonus, time_limit_sec, questions(body)')
        .eq('lecture_id', s.lecture_id)
        .order('slide_no')
        .order('position'),
      admin.from('session_questions').select('lecture_question_id').eq('session_id', s.id),
      admin
        .from('slide_books')
        .select('id, title, slug, page')
        .eq('lecture_id', s.lecture_id)
        .eq('slide_no', s.current_slide)
        .order('created_at'),
    ])
  const booksBase = serverEnv().booksBaseUrl
  const [poll, pinned] = await Promise.all([currentPoll(admin, s.id), pinnedAsk(admin, s.id)])
  const done = new Set((asked ?? []).map((a) => a.lecture_question_id as string | null))
  const plan: PlanItem[] = (planned ?? []).map((p) => ({
    id: p.id as string,
    slide: Number(p.slide_no),
    text: String(
      (p.questions as unknown as { body: { text?: string } } | null)?.body.text ?? '',
    ).slice(0, 120),
    asked: done.has(p.id as string),
    timeLimitSec: (p.time_limit_sec as number | null) ?? null,
    isBonus: Boolean(p.is_bonus),
  }))
  return {
    id: s.id,
    rev: s.rev,
    slide: s.current_slide,
    pageCount: Number(lec?.page_count ?? 1),
    status: s.status,
    code: s.code,
    participants: count ?? 0,
    title: String(lec?.title ?? ''),
    question,
    plan,
    books: (bks ?? []).map((b) => ({
      id: b.id as string,
      title: String(b.title),
      url: bookUrl(booksBase, String(b.slug), (b.page as number | null) ?? null),
    })),
    poll,
    pinnedAsk: pinned,
    focusSeq: s.focus_seq,
    onBreak: s.break_started_at !== null,
    settings: {
      allowGuests: s.allow_guests,
      minAttendanceRatio: Number(s.min_attendance_ratio),
      topReactors: s.top_reactors,
      showReactorNames: s.show_reactor_names,
      bonusEnabled: s.bonus_enabled,
      confusedEnabled: s.confused_enabled,
      shareAnnotations: s.share_annotations,
    },
  }
}
