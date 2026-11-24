import { questionInputSchema, toDbRows } from '@/lib/assessment/schemas'
import { ApiError, handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { createClient } from '@/lib/supabase/server'

type P = { id: string }

/** Tahrirlash. Savol nazoratda ishlatilgan bo'lsa matn/javob/parametr o'zgarmaydi (DB trigger) → 409. */
export const PUT = handle<P>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`question-write:${profile.id}`, 120, 60_000)
  const id = idParam((await params).id)
  const input = await readJson(req, questionInputSchema)
  const { question, key } = toDbRows(input)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('questions')
    .update(question)
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) mapDbError(error)
  if (!data) throw new ApiError(404, 'not_found')
  const { error: kErr } = await supabase.from('question_keys').update(key).eq('question_id', id)
  if (kErr) mapDbError(kErr)
  return ok({ id })
})

export const DELETE = handle<P>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`question-write:${profile.id}`, 120, 60_000)
  const id = idParam((await params).id)
  const { data, error } = await (
    await createClient()
  )
    .from('questions')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) mapDbError(error)
  if (!data || data.length === 0) throw new ApiError(404, 'not_found')
  return ok({ ok: true })
})
