import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'
import { listMySubjects } from '@/lib/server/teacher-data'
import { QuestionImport } from './question-import'

export default async function QuestionImportPage() {
  const me = await requireRole('teacher', 'admin')
  const subjects = await listMySubjects(me)
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.questions.importTitle}</h1>
      <p className="text-slate-600">{t.questions.importLead}</p>
      <QuestionImport subjects={subjects} />
    </div>
  )
}
