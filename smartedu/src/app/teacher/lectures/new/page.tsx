import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'
import { listMySubjects } from '@/lib/server/teacher-data'
import { LectureUpload } from './lecture-upload'

export default async function NewLecturePage() {
  const me = await requireRole('teacher', 'admin')
  const subjects = await listMySubjects(me)
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">{t.lectures.new}</h1>
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t.lectures.pptxNotice}</p>
      <LectureUpload userId={me.id} subjects={subjects} />
    </div>
  )
}
