import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { canRevealAnswers, type AttemptStatus, type RevealPolicy } from '@/lib/assessment/policy'
import { describeCorrect, describeResponse, renderQuestionText } from '@/lib/assessment/result-view'
import type { PoolQuestion, Variant } from '@/lib/assessment/variant'
import { bookUrl } from '@/lib/books'
import { serverEnv } from '@/lib/env'
import { rankEntries } from '@/lib/ranking'

export interface AnswerView {
  answerId: string
  position: number
  type: PoolQuestion['type']
  text: string
  pointsMax: number
  score: number | null
  isCorrect: boolean | null
  pending: boolean
  response: string
  /** Faqat ochilishi ruxsat berilganda (yoki o'qituvchiga) */
  correct: string | null
  explanation: string | null
  feedback: string | null
  book: { url: string; slug: string; page: number | null } | null
}

export interface AuditView {
  at: string
  action: string
  actor: string
  oldScore: number | null
  newScore: number | null
  reason: string | null
}

interface AnswerRow {
  id: string
  question_id: string
  position: number
  points_max: number
  variant: Variant
  response: unknown
  score: number | null
  is_correct: boolean | null
  needs_review: boolean
  feedback: string | null
}
type QuestionRow = Pick<PoolQuestion, 'id' | 'type' | 'body' | 'params'> & {
  book_ref: { slug: string; page?: number | null } | null
}

function buildAnswerViews(
  rows: AnswerRow[],
  questions: Map<string, QuestionRow>,
  keys: Map<string, { correct: unknown; explanation: string | null }> | null,
): AnswerView[] {
  const { booksBaseUrl } = serverEnv()
  return rows.flatMap((a) => {
    const q = questions.get(a.question_id)
    if (!q) return []
    const key = keys?.get(a.question_id) ?? null
    const fullyCorrect = a.is_correct === true
    return [
      {
        answerId: a.id,
        position: a.position,
        type: q.type,
        text: renderQuestionText(q, a.variant),
        pointsMax: Number(a.points_max),
        score: a.score === null ? null : Number(a.score),
        isCorrect: a.is_correct,
        pending: a.needs_review,
        response: describeResponse(q, a.response, a.variant),
        correct: keys ? describeCorrect(q, key, a.variant) : null,
        explanation: keys ? (key?.explanation ?? null) : null,
        feedback: a.feedback,
        // "Bu mavzuni kitobning N-betida o'qing": to'liq to'g'ri bo'lmagan javoblarda ko'rsatiladi
        book:
          q.book_ref && !fullyCorrect
            ? {
                slug: q.book_ref.slug,
                page: q.book_ref.page ?? null,
                url: bookUrl(booksBaseUrl, q.book_ref.slug, q.book_ref.page),
              }
            : null,
      },
    ]
  })
}

async function auditViews(
  client: SupabaseClient,
  admin: SupabaseClient,
  attemptId: string,
): Promise<AuditView[]> {
  const { data } = await client
    .from('audit_log')
    .select('at, action, actor_id, old_value, new_value, reason')
    .eq('attempt_id', attemptId)
    .in('action', ['score.set', 'score.adjust', 'attempt.finalize'])
    .order('at')
  const rows = data ?? []
  const ids = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[]
  const { data: people } = ids.length
    ? await admin.from('profiles').select('id, full_name').in('id', ids)
    : { data: [] }
  const names = new Map((people ?? []).map((p) => [p.id as string, p.full_name as string]))
  return rows.map((r) => ({
    at: r.at as string,
    action: r.action as string,
    actor: r.actor_id ? (names.get(r.actor_id as string) ?? '—') : 'Tizim',
    oldScore: (r.old_value as { score?: number | null } | null)?.score ?? null,
    newScore:
      (r.new_value as { score?: number | null; total_score?: number | null } | null)?.score ??
      (r.new_value as { total_score?: number } | null)?.total_score ??
      null,
    reason: (r.reason as string | null) ?? null,
  }))
}

export interface StudentResultView {
  attemptId: string
  title: string
  status: AttemptStatus
  totalScore: number
  maxScore: number
  percent: number
  rank: { rank: number; of: number } | null
  answersRevealed: boolean
  answers: AnswerView[]
  audit: AuditView[]
}

/**
 * Talaba natijasi. `userClient` — talabaning o'z sessiyasi: attempts/answers/audit_log faqat RLS ruxsat bergandan
 * keyin (natija e'lon qilingan bo'lsa) qaytadi. Savollar va kalitlar uchun `admin` — faqat reveal ruxsat bergandagina.
 */
export async function loadStudentResult(
  userClient: SupabaseClient,
  admin: SupabaseClient,
  attemptId: string,
): Promise<StudentResultView | null> {
  const { data: attempt } = await userClient
    .from('attempts')
    .select('id, assessment_id, status, total_score, max_score')
    .eq('id', attemptId)
    .maybeSingle()
  if (!attempt) return null
  const { data: a } = await userClient
    .from('assessments')
    .select('id, title, reveal_answers, answers_revealed_at, closes_at')
    .eq('id', attempt.assessment_id)
    .maybeSingle()
  if (!a) return null

  const { data: rows } = await userClient
    .from('answers')
    .select(
      'id, question_id, position, points_max, variant, response, score, is_correct, needs_review, feedback',
    )
    .eq('attempt_id', attemptId)
    .order('position')
  const answers = (rows ?? []) as AnswerRow[]

  const { data: qs } = await admin
    .from('questions')
    .select('id, type, body, params, book_ref')
    .in(
      'id',
      answers.map((r) => r.question_id),
    )
  const questions = new Map((qs ?? []).map((q) => [q.id as string, q as unknown as QuestionRow]))

  const reveal = canRevealAnswers(
    {
      policy: a.reveal_answers as RevealPolicy,
      status: attempt.status as AttemptStatus,
      closesAt: new Date(a.closes_at),
      revealedAt: a.answers_revealed_at ? new Date(a.answers_revealed_at) : null,
    },
    new Date(),
  )
  let keys: Map<string, { correct: unknown; explanation: string | null }> | null = null
  if (reveal) {
    const { data: ks } = await admin
      .from('question_keys')
      .select('question_id, correct, explanation')
      .in(
        'question_id',
        answers.map((r) => r.question_id),
      )
    keys = new Map(
      (ks ?? []).map((k) => [
        k.question_id as string,
        { correct: k.correct as unknown, explanation: (k.explanation as string | null) ?? null },
      ]),
    )
  }

  let rank: StudentResultView['rank'] = null
  if (attempt.status === 'finalized') {
    const { data: all } = await admin
      .from('attempts')
      .select('id, total_score')
      .eq('assessment_id', attempt.assessment_id)
      .eq('status', 'finalized')
    const ranks = rankEntries(
      (all ?? []).map((t) => ({ id: t.id as string, score: Number(t.total_score ?? 0) })),
    )
    const mine = ranks.get(attemptId)
    if (mine) rank = { rank: mine, of: all?.length ?? 0 }
  }

  const total = Number(attempt.total_score ?? 0)
  const max = Number(attempt.max_score ?? 0)
  return {
    attemptId,
    title: a.title,
    status: attempt.status as AttemptStatus,
    totalScore: total,
    maxScore: max,
    percent: max > 0 ? Math.round((total / max) * 1000) / 10 : 0,
    rank,
    answersRevealed: reveal,
    answers: buildAnswerViews(answers, questions, keys),
    audit: await auditViews(userClient, admin, attemptId),
  }
}

export interface TeacherAttemptView {
  attemptId: string
  assessmentId: string
  assessmentTitle: string
  studentName: string
  studentCode: string | null
  status: AttemptStatus
  totalScore: number
  maxScore: number
  leaveCount: number
  pendingCount: number
  answers: AnswerView[]
  audit: AuditView[]
}

/** O'qituvchi/admin uchun urinish tafsiloti (RLS ostida: faqat o'z nazorati). Kalitlar ham ko'rinadi. */
export async function loadTeacherAttempt(
  userClient: SupabaseClient,
  admin: SupabaseClient,
  attemptId: string,
): Promise<TeacherAttemptView | null> {
  const { data: t } = await userClient
    .from('attempts')
    .select('id, assessment_id, student_id, status, total_score, max_score, leave_count')
    .eq('id', attemptId)
    .maybeSingle()
  if (!t) return null
  const [{ data: a }, { data: student }, { data: rows }] = await Promise.all([
    userClient.from('assessments').select('id, title').eq('id', t.assessment_id).maybeSingle(),
    userClient
      .from('profiles')
      .select('full_name, student_code')
      .eq('id', t.student_id)
      .maybeSingle(),
    userClient
      .from('answers')
      .select(
        'id, question_id, position, points_max, variant, response, score, is_correct, needs_review, feedback',
      )
      .eq('attempt_id', attemptId)
      .order('position'),
  ])
  const answers = (rows ?? []) as AnswerRow[]
  const ids = answers.map((r) => r.question_id)
  const [{ data: qs }, { data: ks }] = await Promise.all([
    userClient.from('questions').select('id, type, body, params, book_ref').in('id', ids),
    userClient
      .from('question_keys')
      .select('question_id, correct, explanation')
      .in('question_id', ids),
  ])
  const questions = new Map((qs ?? []).map((q) => [q.id as string, q as unknown as QuestionRow]))
  const keys = new Map(
    (ks ?? []).map((k) => [
      k.question_id as string,
      { correct: k.correct as unknown, explanation: (k.explanation as string | null) ?? null },
    ]),
  )
  return {
    attemptId,
    assessmentId: t.assessment_id,
    assessmentTitle: a?.title ?? '',
    studentName: student?.full_name ?? '',
    studentCode: student?.student_code ?? null,
    status: t.status as AttemptStatus,
    totalScore: Number(t.total_score ?? 0),
    maxScore: Number(t.max_score ?? 0),
    leaveCount: Number(t.leave_count ?? 0),
    pendingCount: answers.filter((r) => r.needs_review).length,
    answers: buildAnswerViews(answers, questions, keys),
    audit: await auditViews(userClient, admin, attemptId),
  }
}
