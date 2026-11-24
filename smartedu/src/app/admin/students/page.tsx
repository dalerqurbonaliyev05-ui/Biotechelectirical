import Link from 'next/link'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, student_code, full_name, groups(name)')
    .eq('role', 'student')
    .order('student_code')
    .limit(500)
  const rows = (data ?? []) as unknown as {
    id: string
    student_code: string
    full_name: string
    groups: { name: string } | null
  }[]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t.nav.admin[1]?.label}</h1>
        <Link href="/admin/students/import" className="btn-primary">
          {t.importStudents.title}
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="card text-slate-500">{t.app.empty}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t.importStudents.columns.code}</th>
                <th>{t.importStudents.columns.name}</th>
                <th>{t.importStudents.columns.group}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono">{r.student_code}</td>
                  <td>{r.full_name}</td>
                  <td>{r.groups?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
