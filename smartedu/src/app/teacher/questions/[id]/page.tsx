import { notFound } from 'next/navigation'
import { fromDbRows } from '@/lib/assessment/schemas'
import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'
import { listMySubjects } from '@/lib/server/teacher-data'
import { createClient } from '@/lib/supabase/server'
import { QuestionForm, inputToDraft } from '../question-form'

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('teacher', 'admin')
  const { id } = await params
  const supabase = await createClient()
  const { data: q } = await supabase.from('questions').select('*').eq('id', id).maybeSingle()
  if (!q) notFound()
  const { data: key } = await supabase
    .from('question_keys')
    .select('correct, explanation')
    .eq('question_id', id)
    .maybeSingle()
  const { count } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .eq('question_id', id)
  const subjects = await listMySubjects(me)
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.questions.editTitle}</h1>
      <QuestionForm
        questionId={id}
        initial={inputToDraft(fromDbRows(q, key))}
        subjects={subjects}
        locked={(count ?? 0) > 0}
      />
    </div>
  )
}
