import { describeCorrect } from '@/lib/assessment/result-view'
import { handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { currentQuestion, sessionRating } from '@/lib/server/live-questions'
import { requireParticipant } from '@/lib/server/live'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildLiveQuestion } from '@/lib/live-question'

/**
 * Talaba uchun dars holati: slayd, joriy savol (kalitsiz). Javob to'g'riligi, to'g'ri javob va reyting FAQAT savol
 * yopilgandan keyin (yoki savol bo'lmasa) qaytadi — ochiq paytda qo'shnidan ko'chirish uchun ma'lumot yo'q.
 * Token mos kelmasa `token_replaced` (talaba boshqa qurilmadan qo'shilgan).
 */
export const GET = handle<{ sessionId: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['student'])
  limit(`live-question:${profile.id}`, 120, 60_000)
  const sessionId = idParam((await params).sessionId)
  const admin = createAdminClient()
  await requireParticipant(admin, profile.id, sessionId, req.headers.get('x-join-token'))

  const { data: s } = await admin
    .from('lecture_sessions')
    .select('id, current_slide, status, rev, lectures(page_count)')
    .eq('id', sessionId)
    .single()
  const base = {
    slide: s?.current_slide as number,
    status: s?.status as string,
    rev: s?.rev as number,
    page_count: (s?.lectures as unknown as { page_count: number } | null)?.page_count ?? 1,
  }

  const cur = await currentQuestion(admin, { id: sessionId, current_slide: base.slide })
  const question = cur ? buildLiveQuestion(cur.sq, cur.q, new Date()) : null
  const isOpen = question?.status === 'open'

  let mine: {
    answered: boolean
    isCorrect?: boolean
    points?: number
    bonus?: number
    total?: number
  } | null = null
  let correctText: string | null = null
  if (cur) {
    const { data: a } = await admin
      .from('session_answers')
      .select('is_correct, points, bonus')
      .eq('session_question_id', cur.sq.id)
      .eq('student_id', profile.id)
      .maybeSingle()
    mine = { answered: Boolean(a) }
    if (a && !isOpen)
      Object.assign(mine, {
        isCorrect: a.is_correct,
        points: a.points,
        bonus: a.bonus,
        total: Number(a.points) + Number(a.bonus),
      })
    if (!isOpen) {
      const { data: key } = await admin
        .from('question_keys')
        .select('correct')
        .eq('question_id', cur.sq.question_id)
        .maybeSingle()
      correctText = describeCorrect(cur.q, key as { correct: unknown } | null, cur.sq.variant)
    }
  }

  let me: { points: number; rank: number; of: number; medal: string | null } | null = null
  if (!isOpen) {
    const rating = await sessionRating(admin, sessionId)
    const mineRow = rating.find((r) => r.studentId === profile.id)
    if (mineRow)
      me = { points: mineRow.points, rank: mineRow.rank, of: rating.length, medal: mineRow.medal }
  }
  return ok({ ...base, question, mine, correctText, me })
})
