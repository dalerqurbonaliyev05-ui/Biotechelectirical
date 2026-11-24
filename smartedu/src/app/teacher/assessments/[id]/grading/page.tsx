import Link from 'next/link'
import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n'
import { submitExpiredAttempts } from '@/lib/server/assessments'
import { bestLabResults } from '@/lib/server/lab'
import { requireRole } from '@/lib/server/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { GradingBoard, type GradingItem } from './grading-board'

interface Row {
  id: string
  points_max: number
  response: { text?: string } | null
  attempts: { id: string; student_id: string; profiles: { full_name: string } | null }
  questions: {
    type: string
    body: { text?: string }
    params: { rubric?: { criterion: string; points: number }[] }
    lab_ref: { lab_id: string } | null
  }
  question_id: string
}

export default async function GradingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('teacher', 'admin')
  const { id } = await params
  const supabase = await createClient()
  const { data: a } = await supabase
    .from('assessments')
    .select('id, title, opens_at')
    .eq('id', id)
    .maybeSingle()
  if (!a) notFound()

  // Muddati o'tgan, lekin topshirilmagan urinishlar avtomatik topshiriladi
  await submitExpiredAttempts(createAdminClient(), id)

  const { data } = await supabase
    .from('answers')
    .select(
      'id, question_id, points_max, response, attempts!inner(id, assessment_id, student_id, profiles!attempts_student_id_fkey(full_name)), questions(type, body, params, lab_ref)',
    )
    .eq('needs_review', true)
    .eq('attempts.assessment_id', id)
    .order('question_id')
    .limit(1000)
  const rows = (data ?? []) as unknown as Row[]

  // lab_task: tashqi laboratoriyadan kelgan (jumladan topshirishdan KEYIN kelgan) natija — ball taklifi
  const admin = createAdminClient()
  const labByStudent = new Map<string, Awaited<ReturnType<typeof bestLabResults>>>()
  for (const r of rows) {
    if (!r.questions.lab_ref || labByStudent.has(r.attempts.student_id)) continue
    labByStudent.set(
      r.attempts.student_id,
      await bestLabResults(
        admin,
        r.attempts.student_id,
        [r.questions.lab_ref.lab_id],
        new Date(a.opens_at),
      ),
    )
  }

  const items: GradingItem[] = rows.map((r, i) => ({
    answerId: r.id,
    questionId: r.question_id,
    questionText: String(r.questions.body.text ?? ''),
    type: r.questions.type,
    rubric: r.questions.params.rubric ?? null,
    pointsMax: Number(r.points_max),
    answerText: r.response?.text ?? '',
    label: `#${i + 1}`,
    name: r.attempts.profiles?.full_name ?? '',
    lab: r.questions.lab_ref
      ? (() => {
          const best = labByStudent.get(r.attempts.student_id)?.get(r.questions.lab_ref.lab_id)
          return best ? { score: best.score, max: best.max_score } : null
        })()
      : null,
  }))

  const { data: statuses } = await supabase
    .from('attempts')
    .select('status')
    .eq('assessment_id', id)
  const submitted = (statuses ?? []).filter((s) => s.status === 'submitted').length

  return (
    <div className="space-y-4">
      <Link href="/teacher/assessments" className="text-sm text-brand-600 hover:underline">
        {t.grading.back}
      </Link>
      <h1 className="text-2xl font-bold">
        {t.grading.title}: {a.title}
      </h1>
      <p className="text-slate-600">{t.grading.lead}</p>
      <GradingBoard assessmentId={id} items={items} awaitingFinalize={submitted} />
    </div>
  )
}
