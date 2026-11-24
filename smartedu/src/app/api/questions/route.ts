import { questionInputSchema, toDbRows } from '@/lib/assessment/schemas'
import { ApiError, handle, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { createClient } from '@/lib/supabase/server'

export const POST = handle(async (req) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`question-write:${profile.id}`, 120, 60_000)
  const input = await readJson(req, questionInputSchema)
  const { question, key } = toDbRows(input)

  // RLS: o'qituvchi faqat o'z fani uchun savol qo'sha oladi
  const supabase = await createClient()
  const { data: q, error } = await supabase
    .from('questions')
    .insert({ ...question, created_by: profile.id })
    .select('id')
    .single()
  if (error || !q) {
    if (error?.code === '42501') throw new ApiError(403, 'forbidden')
    throw error ?? new Error('insert_failed')
  }
  const { error: kErr } = await supabase.from('question_keys').insert({ question_id: q.id, ...key })
  if (kErr) {
    await supabase.from('questions').delete().eq('id', q.id)
    throw kErr
  }
  return ok({ id: q.id })
})
