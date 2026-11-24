import { t } from '@/lib/i18n'
import { StudentImport } from './student-import'

export const metadata = { title: t.importStudents.title }

export default function ImportPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.importStudents.title}</h1>
      <p className="text-slate-600">{t.importStudents.lead}</p>
      <StudentImport />
    </div>
  )
}
