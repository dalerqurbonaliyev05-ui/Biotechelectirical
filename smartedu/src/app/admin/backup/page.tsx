import { BACKUP_TABLES } from '@/lib/backup-tables'
import { t } from '@/lib/i18n'

const B = t.admin.backup

export const metadata = { title: B.title }

export default function BackupPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{B.title}</h1>
      <p className="text-slate-600">{B.lead}</p>
      <ul className="space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        {B.notes.map((n) => (
          <li key={n}>• {n}</li>
        ))}
      </ul>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {BACKUP_TABLES.map((x) => (
          <li key={x.table} className="card flex items-center justify-between gap-2 py-3">
            <div>
              <p className="font-mono text-sm">{x.table}</p>
              {x.omit && (
                <p className="text-xs text-slate-400">
                  {B.omitted}: {x.omit.join(', ')}
                </p>
              )}
            </div>
            <a className="btn-secondary" href={`/api/admin/export/${x.table}`} download>
              CSV
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
