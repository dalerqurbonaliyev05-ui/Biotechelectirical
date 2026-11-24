import { z } from 'zod'
import { ApiError, handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  score: z.number().min(0).max(1000),
  rubric_scores: z
    .array(z.object({ criterion: z.string().max(300), points: z.number().min(0).max(1000) }))
    .max(20)
    .optional(),
  feedback: z.string().trim().max(2000).optional(),
  /** Ball allaqachon qo'yilgan bo'lsa o'zgartirish sababi SHART (audit_log ga yoziladi) */
  reason: z.string().trim().max(500).optional(),
})

export const POST = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`grade:${profile.id}`, 300, 60_000)
  const id = idParam((await params).id)
  const body = await readJson(req, schema)

  // RLS: o'qituvchi faqat o'z nazoratining javobini ko'radi (ko'rinmasa — 404)
  const { data: ans } = await (
    await createClient()
  )
    .from('answers')
    .select('id, points_max')
    .eq('id', id)
    .maybeSingle()
  if (!ans) throw new ApiError(404, 'not_found')

  const { data, error } = await createAdminClient().rpc('app_set_answer_score', {
    p_answer_id: id,
    p_score: body.score,
    p_is_correct: body.score >= Number(ans.points_max),
    p_actor: profile.id,
    p_reason: body.reason ?? null,
    p_feedback: body.feedback ?? null,
    p_rubric: body.rubric_scores ?? null,
  })
  if (error) mapDbError(error)
  const row = (data as { out_attempt_id: string; out_total: number }[])[0]
  return ok({ attempt_id: row?.out_attempt_id, total: row?.out_total })
})
