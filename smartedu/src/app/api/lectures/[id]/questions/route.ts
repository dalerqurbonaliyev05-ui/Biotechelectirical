import { questionInputSchema, toDbRows } from '@/lib/assessment/schemas'
import { LIVE_TYPES, checkpointQuestionSchema } from '@/lib/lecture-schemas'
import { ApiError, handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { createClient } from '@/lib/supabase/server'

/**
 * Nuqtaga ("shu slayddan keyin") savol qo'shish: bankdan yoki yangi test savoli. Nuqta kerak bo'lsa yaratiladi.
 * Oxirgi slayddan keyingi nuqta — yakuniy test (kind = final).
 */
export const POST = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`lecture-write:${profile.id}`, 60, 60_000)
  const id = idParam((await params).id)
  const body = await readJson(req, checkpointQuestionSchema)
  const supabase = await createClient()

  const { data: lec } = await supabase
    .from('lectures')
    .select('id, subject_id, page_count')
    .eq('id', id)
    .maybeSingle()
  if (!lec) throw new ApiError(404, 'not_found')
  if (body.after_slide > Number(lec.page_count))
    throw new ApiError(400, 'validation', 'slide_out_of_range')

  let questionId = body.question_id
  let createdQuestion: string | null = null
  if (body.new_question) {
    const parsed = questionInputSchema.safeParse({
      type: 'mcq',
      subject_id: lec.subject_id,
      ...body.new_question,
    })
    if (!parsed.success)
      throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'invalid')
    const { question, key } = toDbRows(parsed.data)
    const { data: q, error } = await supabase
      .from('questions')
      .insert({ ...question, created_by: profile.id })
      .select('id')
      .single()
    if (error || !q) throw error ?? new Error('insert_failed')
    const { error: kErr } = await supabase
      .from('question_keys')
      .insert({ question_id: q.id, ...key })
    if (kErr) {
      await supabase.from('questions').delete().eq('id', q.id)
      throw kErr
    }
    questionId = createdQuestion = q.id as string
  } else {
    const { data: q } = await supabase
      .from('questions')
      .select('id, type')
      .eq('id', questionId as string)
      .eq('subject_id', lec.subject_id)
      .maybeSingle()
    if (!q) throw new ApiError(404, 'not_found')
    if (!(LIVE_TYPES as readonly string[]).includes(q.type as string))
      throw new ApiError(400, 'validation', 'type_not_live')
  }

  const { data: cp, error: cErr } = await supabase
    .from('lecture_checkpoints')
    .upsert(
      {
        lecture_id: id,
        after_slide: body.after_slide,
        kind: body.after_slide === Number(lec.page_count) ? 'final' : 'checkpoint',
      },
      { onConflict: 'lecture_id,after_slide' },
    )
    .select('id')
    .single()
  if (cErr || !cp) throw cErr ?? new Error('checkpoint_failed')
  const { data: last } = await supabase
    .from('lecture_questions')
    .select('position')
    .eq('checkpoint_id', cp.id)
    .order('position', { ascending: false })
    .limit(1)

  const { data, error } = await supabase
    .from('lecture_questions')
    .insert({
      lecture_id: id,
      checkpoint_id: cp.id,
      slide_no: body.after_slide,
      question_id: questionId,
      time_limit_sec: body.time_limit_sec ?? 30,
      is_bonus: body.is_bonus ?? false,
      position: Number(last?.[0]?.position ?? 0) + 1,
    })
    .select('id')
    .single()
  if (error) {
    if (createdQuestion) await supabase.from('questions').delete().eq('id', createdQuestion)
    mapDbError(error)
  }
  return ok({ id: data?.id, question_id: questionId })
})
