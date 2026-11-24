import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'
import { loadAssessmentFormData } from '@/lib/server/teacher-data'
import { AssessmentForm, type AssessmentDraft } from '../assessment-form'

export default async function NewAssessmentPage() {
  const me = await requireRole('teacher', 'admin')
  const data = await loadAssessmentFormData(me)
  const initial: AssessmentDraft = {
    subject_id: data.subjects[0]?.id ?? '',
    group_id: '',
    title: '',
    description: '',
    opens_at: '',
    closes_at: '',
    duration_minutes: '30',
    question_count: '',
    shuffle_questions: true,
    shuffle_options: true,
    show_score: 'after_finalize',
    reveal_answers: 'manual',
    weight: '100',
    is_published: false,
    questions: [],
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.assessments.new}</h1>
      <AssessmentForm initial={initial} {...data} hasAttempts={false} />
    </div>
  )
}
