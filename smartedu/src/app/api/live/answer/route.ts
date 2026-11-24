import { z } from 'zod'
import { parseResponse } from '@/lib/assessment/submit'
import { gradeLiveResponse } from '@/lib/live-question'
import { scoreLiveAnswer } from '@/lib/live-score'
import { ApiError, handle, limit, ok, readJson, requireLiveUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { requireParticipant } from '@/lib/server/live'
import type { LiveQ, SqRow } from '@/lib/server/live-questions'
import { getSettings } from '@/lib/server/settings'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  session_question_id: z.guid(),
  token: z.string().min(10).max(100),
  response: z.unknown(),
})

/**
 * Jonli savolga javob. Vaqt SERVERDA o'lchanadi (mijoz soatiga ishonilmaydi); ball toza funksiya
 * (lib/live-score.ts) bilan hisoblanadi; ikki marta javob DB unique cheklovi bilan ham taqiqlangan.
 * Javobda to'g'rilik QAYTARILMAYDI (savol yopilguncha oshkor bo'lmasin).
 */
export const POST = handle(async (req) => {
  const receivedAt = Date.now() // ← javob serverga yetib kelgan vaqt
  const { userId } = await requireLiveUser()
  limit(`live-answer:${userId}`, 60, 60_000)
  const body = await readJson(req, schema)

  const admin = createAdminClient()
  const { data: sq } = await admin
    .from('session_questions')
    .select('*')
    .eq('id', body.session_question_id)
    .maybeSingle()
  if (!sq) throw new ApiError(404, 'not_found')
  const row = sq as SqRow
  await requireParticipant(admin, userId, row.session_id, body.token)
  // Bonus savol: faqat belgilangan (eng faol) talabalar javob bera oladi
  if (row.audience === 'targeted' && !row.target_ids.includes(userId))
    throw new ApiError(403, 'not_target')

  const { data: session } = await admin
    .from('lecture_sessions')
    .select('status')
    .eq('id', row.session_id)
    .single()
  if (session?.status !== 'active') throw new ApiError(409, 'session_ended')

  const { data: question } = await admin
    .from('questions')
    .select('type, body, params')
    .eq('id', row.question_id)
    .single()
  const q = question as unknown as LiveQ
  const response = parseResponse(q.type as 'mcq' | 'numeric', body.response)
  if (response === null) throw new ApiError(400, 'validation')
  const { data: key } = await admin
    .from('question_keys')
    .select('correct')
    .eq('question_id', row.question_id)
    .maybeSingle()
  const isCorrect = gradeLiveResponse(
    q,
    key as { correct: unknown } | null,
    row.variant ?? {},
    response,
  )

  const { data: prior } = await admin
    .from('session_answers')
    .select('id')
    .eq('session_question_id', row.id)
    .eq('student_id', userId)
    .maybeSingle()
  const settings = await getSettings(admin)
  const result = scoreLiveAnswer({
    isCorrect,
    openedAtMs: Date.parse(row.opened_at),
    answeredAtMs: receivedAt,
    timeLimitMs: row.time_limit_sec * 1000,
    closedAtMs: row.closed_at ? Date.parse(row.closed_at) : null,
    maxBonus: settings.max_speed_bonus,
    correctPoints: settings.correct_points,
    graceMs: settings.live_grace_ms,
    alreadyAnswered: Boolean(prior),
  })
  if (result.status !== 'accepted') return ok({ accepted: false, status: result.status })

  const { data, error } = await admin.rpc('app_record_live_answer', {
    p_session_question_id: row.id,
    p_student_id: userId,
    p_response: response,
    p_is_correct: isCorrect,
    p_points: result.points,
    p_bonus: result.bonus,
    p_elapsed_ms: Math.round(result.elapsedMs),
  })
  if (error) mapDbError(error)
  // Poyga holati: ikki so'rov bir vaqtda kelsa, DB unique cheklovi bittasini "duplicate" qiladi
  if ((data as { out_status: string }[])[0]?.out_status === 'duplicate')
    return ok({ accepted: false, status: 'duplicate' })
  return ok({ accepted: true, late: result.late })
})
