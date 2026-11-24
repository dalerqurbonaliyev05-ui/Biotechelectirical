import { fromDbRows } from '@/lib/assessment/schemas'
import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'
import { listMySubjects } from '@/lib/server/teacher-data'
import { createClient } from '@/lib/supabase/server'
import { QuestionForm, emptyDraft, inputToDraft } from '../question-form'

export default async function NewQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const me = await requireRole('teacher', 'admin')
  const subjects = await listMySubjects(me)
  const { from } = await searchParams

  let initial = emptyDraft(subjects[0]?.id ?? '')
  if (from) {
    // "Nusxa": mavjud savol asosida yangi savol
    const supabase = await createClient()
    const { data: q } = await supabase.from('questions').select('*').eq('id', from).maybeSingle()
    const { data: key } = await supabase
      .from('question_keys')
      .select('correct, explanation')
      .eq('question_id', from)
      .maybeSingle()
    if (q) initial = inputToDraft(fromDbRows(q, key))
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.questions.new}</h1>
      <QuestionForm initial={initial} subjects={subjects} locked={false} />
    </div>
  )
}
