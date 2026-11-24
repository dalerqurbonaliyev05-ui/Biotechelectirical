import { assessmentSchema } from '@/lib/assessment/assessment-schema'
import { ApiError, handle, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { createClient } from '@/lib/supabase/server'

export const POST = handle(async (req) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`assessment-write:${profile.id}`, 60, 60_000)
  const { questions, ...a } = await readJson(req, assessmentSchema)
  const supabase = await createClient()

  // Savollar shu fanga tegishli va o'qituvchiga ko'rinadigan bo'lishi shart
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
    .insert({ ...a, created_by: profile.id })
    .select('id')
    .single()
  if (error || !data) {
    if (error?.code === '42501') throw new ApiError(403, 'forbidden')
    throw error ?? new Error('insert_failed')
  }
  const { error: qErr } = await supabase.from('assessment_questions').insert(
    questions.map((q, i) => ({
      assessment_id: data.id,
      question_id: q.question_id,
      points: q.points,
      position: i + 1,
    })),
  )
  if (qErr) {
    await supabase.from('assessments').delete().eq('id', data.id)
    throw qErr
  }
  return ok({ id: data.id })
})
