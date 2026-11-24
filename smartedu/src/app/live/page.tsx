import { CodeEntry } from '@/components/code-entry'
import { t } from '@/lib/i18n'

export const metadata = { title: t.liveStudent.title }

export default function LiveEntryPage() {
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">{t.liveStudent.title}</h1>
      <p className="text-slate-600">{t.liveStudent.lead}</p>
      <CodeEntry />
    </div>
  )
}
