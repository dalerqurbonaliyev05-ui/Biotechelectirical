import { LIVE_TYPES, lectureQuestionSchema } from '@/lib/lecture-schemas'
import { ApiError, handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { createClient } from '@/lib/supabase/server'

export const POST = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`lecture-write:${profile.id}`, 60, 60_000)
  const id = idParam((await params).id)
  const body = await readJson(req, lectureQuestionSchema)
  const supabase = await createClient()

  const { data: lec } = await supabase
    .from('lectures')
    .select('id, subject_id, page_count')
    .eq('id', id)
    .maybeSingle()
  if (!lec) throw new ApiError(404, 'not_found')
  if (body.slide_no > Number(lec.page_count))
    throw new ApiError(400, 'validation', 'slide_out_of_range')
  const { data: q } = await supabase
    .from('questions')
    .select('id, type')
    .eq('id', body.question_id)
    .eq('subject_id', lec.subject_id)
    .maybeSingle()
  if (!q) throw new ApiError(404, 'not_found')
  if (!(LIVE_TYPES as readonly string[]).includes(q.type as string))
    throw new ApiError(400, 'validation', 'type_not_live')

  const { data, error } = await supabase
    .from('lecture_questions')
    .insert({
      lecture_id: id,
      slide_no: body.slide_no,
      question_id: body.question_id,
      time_limit_sec: body.time_limit_sec ?? null,
    })
    .select('id')
    .single()
  if (error) mapDbError(error)
  return ok({ id: data?.id })
})
