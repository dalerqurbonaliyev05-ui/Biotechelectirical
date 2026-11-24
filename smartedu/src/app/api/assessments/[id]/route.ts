import { assessmentSchema } from '@/lib/assessment/assessment-schema'
import { ApiError, handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { createClient } from '@/lib/supabase/server'

type P = { id: string }

export const PUT = handle<P>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`assessment-write:${profile.id}`, 60, 60_000)
  const id = idParam((await params).id)
  const { questions, ...a } = await readJson(req, assessmentSchema)
  const supabase = await createClient()

  const { data: current } = await supabase
    .from('assessments')
    .select('id, subject_id, group_id')
    .eq('id', id)
    .maybeSingle()
  if (!current) throw new ApiError(404, 'not_found')
  const { count: attempts } = await supabase
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('assessment_id', id)

  const { data: cur } = await supabase
    .from('assessment_questions')
    .select('question_id, points')
    .eq('assessment_id', id)
  const same =
    (cur?.length ?? 0) === questions.length &&
    questions.every((q) =>
      cur?.some((c) => c.question_id === q.question_id && Number(c.points) === q.points),
    )
  // Boshlangan nazoratda savollar to'plami, ballari, fan va guruh o'zgarmaydi (natijalar buzilmasin)
  if (
    (attempts ?? 0) > 0 &&
    (!same || a.subject_id !== current.subject_id || a.group_id !== current.group_id)
  ) {
    throw new ApiError(409, 'has_attempts')
  }

  const { data: found } = await supabase
    .from('questions')
    .select('id')
    .eq('subject_id', a.subject_id)
    .in(
      'id',
      questions.map((q) => q.question_id),
    )
  if ((found?.length ?? 0) !== questions.length)
    throw new ApiError(400, 'validation', 'question_not_in_subject')

  const { data, error } = await supabase
    .from('assessments')
    .update(a)
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) mapDbError(error)
  if (!data) throw new ApiError(404, 'not_found')

  if (!same) {
    await supabase.from('assessment_questions').delete().eq('assessment_id', id)
    const { error: qErr } = await supabase.from('assessment_questions').insert(
      questions.map((q, i) => ({
        assessment_id: id,
        question_id: q.question_id,
        points: q.points,
        position: i + 1,
      })),
    )
    if (qErr) throw qErr
  }
  return ok({ id })
})

export const DELETE = handle<P>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`assessment-write:${profile.id}`, 60, 60_000)
  const id = idParam((await params).id)
  const supabase = await createClient()
  const { count } = await supabase
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('assessment_id', id)
  if ((count ?? 0) > 0) throw new ApiError(409, 'has_attempts')
  const { data, error } = await supabase.from('assessments').delete().eq('id', id).select('id')
  if (error) mapDbError(error)
  if (!data || data.length === 0) throw new ApiError(404, 'not_found')
  return ok({ ok: true })
})
