import { z } from 'zod'
import { parseResponse } from '@/lib/assessment/submit'
import { ApiError, handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  items: z
    .array(z.object({ question_id: z.guid(), response: z.unknown() }))
    .min(1)
    .max(50),
})

/** Avtosaqlash (bir nechta savolni birdan: oflayn navbat tiklanganda). Muddat DB soati bilan tekshiriladi. */
export const POST = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['student'])
  limit(`save:${profile.id}`, 240, 60_000)
  const attemptId = idParam((await params).id)
  const { items } = await readJson(req, schema)

  const admin = createAdminClient()
  const { data: attempt } = await admin
    .from('attempts')
    .select('id')
    .eq('id', attemptId)
    .eq('student_id', profile.id)
    .maybeSingle()
  if (!attempt) throw new ApiError(404, 'not_found')

  const { data: rows } = await admin
    .from('answers')
    .select('question_id, questions(type)')
    .eq('attempt_id', attemptId)
  const typeBy = new Map(
    (rows ?? []).map((r) => [
      r.question_id as string,
      (r.questions as unknown as { type: 'mcq' | 'numeric' | 'short_text' | 'lab_task' }).type,
    ]),
  )

  const clean = items.map((it) => {
    const type = typeBy.get(it.question_id)
    const response = type ? parseResponse(type, it.response) : null
    if (!type || response === null) throw new ApiError(400, 'validation')
    return { question_id: it.question_id, response }
  })

  const { data, error } = await admin.rpc('app_save_answers', {
    p_attempt_id: attemptId,
    p_student_id: profile.id,
    p_items: clean,
  })
  if (error) mapDbError(error)
  return ok({ saved: data as number, server_now: new Date().toISOString() })
})
