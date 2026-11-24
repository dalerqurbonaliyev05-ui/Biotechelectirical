import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'
import { loadAssessmentFormData } from '@/lib/server/teacher-data'
import { createClient } from '@/lib/supabase/server'
import { AssessmentForm, toLocalInput, type AssessmentDraft } from '../assessment-form'

export default async function EditAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('teacher', 'admin')
  const { id } = await params
  const supabase = await createClient()
  const { data: a } = await supabase.from('assessments').select('*').eq('id', id).maybeSingle()
  if (!a) notFound()
  const { data: aq } = await supabase
    .from('assessment_questions')
    .select('question_id, points, position')
    .eq('assessment_id', id)
    .order('position')
  const { count } = await supabase
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('assessment_id', id)
  const data = await loadAssessmentFormData(me)

  const initial: AssessmentDraft = {
    subject_id: a.subject_id,
    group_id: a.group_id,
    title: a.title,
    description: a.description ?? '',
    opens_at: toLocalInput(a.opens_at),
    closes_at: toLocalInput(a.closes_at),
    duration_minutes: String(a.duration_minutes),
    question_count: a.question_count ? String(a.question_count) : '',
    shuffle_questions: a.shuffle_questions,
    shuffle_options: a.shuffle_options,
    show_score: a.show_score,
    reveal_answers: a.reveal_answers,
    weight: String(a.weight),
    is_published: a.is_published,
    questions: (aq ?? []).map((q) => ({
      question_id: String(q.question_id),
      points: String(Number(q.points)),
    })),
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.assessments.editTitle}</h1>
      <AssessmentForm
        assessmentId={id}
        initial={initial}
        {...data}
        hasAttempts={(count ?? 0) > 0}
      />
    </div>
  )
}
