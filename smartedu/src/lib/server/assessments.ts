import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { toStudentQuestion, type StudentQuestion } from '@/lib/assessment/dto'
import { acceptsAnswers } from '@/lib/assessment/policy'
import { buildSubmitResults, type SubmitAnswer } from '@/lib/assessment/submit'
import { planAttempt, type PoolQuestion, type Variant } from '@/lib/assessment/variant'
import { mapDbError } from '@/lib/server/db-errors'

export interface AttemptRow {
  id: string
  assessment_id: string
  student_id: string
  status: 'in_progress' | 'submitted' | 'finalized'
  started_at: string
  deadline_at: string
  submitted_at: string | null
}

export interface AttemptState {
  attempt: { id: string; status: AttemptRow['status']; deadline_at: string; server_now: string }
  assessment: { id: string; title: string; duration_minutes: number }
  questions: StudentQuestion[]
  responses: Record<string, unknown>
}

/** Nazoratni boshlash (yoki davom ettirish). Reja serverda tuziladi; DB funksiyasi shartlarni qayta tekshiradi. */
export async function startAttempt(
  admin: SupabaseClient,
  studentId: string,
  assessmentId: string,
): Promise<AttemptRow> {
  const { data: a } = await admin
    .from('assessments')
    .select('id, question_count, shuffle_questions, shuffle_options, is_published')
    .eq('id', assessmentId)
    .maybeSingle()
  if (!a || !a.is_published) mapDbError({ message: 'not_found' })

  const { data: aq } = await admin
    .from('assessment_questions')
    .select('position, points, questions(id, type, body, params)')
    .eq('assessment_id', assessmentId)
  const pool: PoolQuestion[] = (aq ?? []).flatMap((r) => {
    const q = r.questions as unknown as Omit<PoolQuestion, 'points' | 'position'> | null
    return q ? [{ ...q, points: Number(r.points), position: Number(r.position) }] : []
  })
  if (pool.length === 0) mapDbError({ message: 'not_found' })

  const plan = planAttempt({
    studentId,
    assessmentId,
    pool,
    questionCount: a?.question_count ?? null,
    shuffleQuestions: Boolean(a?.shuffle_questions),
    shuffleOptions: Boolean(a?.shuffle_options),
  })
  const { data, error } = await admin.rpc('app_start_attempt', {
    p_assessment_id: assessmentId,
    p_student_id: studentId,
    p_seed: plan.seed,
    p_answers: plan.answers,
  })
  if (error) mapDbError(error)
  return data as AttemptRow
}

interface AnswerJoin {
  id: string
  question_id: string
  position: number
  points_max: number
  variant: Variant
  response: unknown
  questions: {
    type: PoolQuestion['type']
    body: PoolQuestion['body']
    params: PoolQuestion['params']
    lab_ref: { lab_id: string } | null
  }
}

/** Urinish holati (talaba uchun, KALITSIZ). Muddat o'tgan bo'lsa avtomatik topshiradi. */
export async function loadAttemptState(
  admin: SupabaseClient,
  studentId: string,
  attemptId: string,
): Promise<AttemptState | null> {
  let { data: attempt } = await admin
    .from('attempts')
    .select('*')
    .eq('id', attemptId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (!attempt) return null

  if (
    attempt.status === 'in_progress' &&
    !acceptsAnswers(new Date(attempt.deadline_at), new Date())
  ) {
    attempt = await submitAttempt(admin, attemptId)
  }
  const { data: assessment } = await admin
    .from('assessments')
    .select('id, title, duration_minutes')
    .eq('id', attempt.assessment_id)
    .single()
  const { data: rows } = await admin
    .from('answers')
    .select(
      'id, question_id, position, points_max, variant, response, questions(type, body, params, lab_ref)',
    )
    .eq('attempt_id', attemptId)
    .order('position')
  const answers = (rows ?? []) as unknown as AnswerJoin[]

  const questions = answers.map((a) =>
    toStudentQuestion(
      {
        id: a.question_id,
        type: a.questions.type,
        body: a.questions.body,
        params: a.questions.params,
        lab_ref: a.questions.lab_ref,
      },
      { position: a.position, points_max: a.points_max, variant: a.variant },
    ),
  )
  const responses: Record<string, unknown> = {}
  for (const a of answers)
    if (a.response !== null && a.response !== undefined) responses[a.question_id] = a.response

  return {
    attempt: {
      id: attempt.id,
      status: attempt.status,
      deadline_at: attempt.deadline_at,
      server_now: new Date().toISOString(),
    },
    assessment: assessment as AttemptState['assessment'],
    questions,
    responses,
  }
}

/** Topshirish: avtomatik tekshirish + atomik yozish. Qayta chaqirilsa — o'zgarishsiz. */
export async function submitAttempt(admin: SupabaseClient, attemptId: string): Promise<AttemptRow> {
  const { data: attempt } = await admin
    .from('attempts')
    .select('id, student_id, assessment_id, status')
    .eq('id', attemptId)
    .maybeSingle()
  if (!attempt) mapDbError({ message: 'not_found' })

  const { data: rows } = await admin
    .from('answers')
    .select('id, question_id, points_max, variant, response, questions(type, params)')
    .eq('attempt_id', attemptId)
  const list = (rows ?? []) as unknown as {
    id: string
    question_id: string
    points_max: number
    variant: SubmitAnswer['variant']
    response: unknown
    questions: { type: SubmitAnswer['type']; params: SubmitAnswer['params'] }
  }[]

  const { data: keys } = await admin
    .from('question_keys')
    .select('question_id, correct')
    .in(
      'question_id',
      list.map((r) => r.question_id),
    )
  const keyBy = new Map(
    (keys ?? []).map((k) => [k.question_id as string, { correct: k.correct as unknown }]),
  )

  const results = buildSubmitResults(
    list.map((r) => ({
      id: r.id,
      type: r.questions.type,
      points_max: Number(r.points_max),
      response: r.response,
      variant: r.variant,
      params: r.questions.params,
      key: keyBy.get(r.question_id) ?? null,
    })),
  )
  const { data, error } = await admin.rpc('app_submit_attempt', {
    p_attempt_id: attemptId,
    p_results: results,
  })
  if (error) mapDbError(error)
  return data as AttemptRow
}

/** Muddati o'tgan, lekin topshirilmagan urinishlarni topshiradi (o'qituvchi natijalarni ochganda). */
export async function submitExpiredAttempts(
  admin: SupabaseClient,
  assessmentId: string,
): Promise<number> {
  const cutoff = new Date(Date.now() - 6000).toISOString()
  const { data } = await admin
    .from('attempts')
    .select('id')
    .eq('assessment_id', assessmentId)
    .eq('status', 'in_progress')
    .lt('deadline_at', cutoff)
  let n = 0
  for (const a of data ?? []) {
    await submitAttempt(admin, a.id as string)
    n++
  }
  return n
}
