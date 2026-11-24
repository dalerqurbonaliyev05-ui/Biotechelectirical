import Link from 'next/link'
import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'
import { createClient } from '@/lib/supabase/server'
import { DeleteAssessment } from './delete-button'

const A = t.assessments
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('uz-UZ', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Tashkent',
  })

interface Row {
  id: string
  title: string
  opens_at: string
  closes_at: string
  is_published: boolean
  subjects: { name: string } | null
  groups: { name: string } | null
}

export default async function AssessmentsPage() {
  await requireRole('teacher', 'admin')
  const supabase = await createClient()
  const { data } = await supabase
    .from('assessments')
    .select('id, title, opens_at, closes_at, is_published, subjects(name), groups(name)')
    .order('opens_at', { ascending: false })
    .limit(200)
  const rows = (data ?? []) as unknown as Row[]

  const { data: counts } = await supabase
    .from('attempts')
    .select('assessment_id, status')
    .in(
      'assessment_id',
      rows.map((r) => r.id),
    )
  const total = new Map<string, number>()
  const pending = new Map<string, number>()
  for (const c of counts ?? []) {
    total.set(c.assessment_id, (total.get(c.assessment_id) ?? 0) + 1)
    if (c.status === 'submitted')
      pending.set(c.assessment_id, (pending.get(c.assessment_id) ?? 0) + 1)
  }
  const now = Date.now()
  const stateOf = (r: Row) =>
    !r.is_published
      ? 'draft'
      : now < Date.parse(r.opens_at)
        ? 'upcoming'
        : now >= Date.parse(r.closes_at)
          ? 'closed'
          : 'open'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{A.title}</h1>
        <Link href="/teacher/assessments/new" className="btn-primary">
          + {A.new}
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="card text-slate-500">{A.empty}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{A.fields.title}</th>
                <th>{A.fields.group}</th>
                <th>{A.fields.opens}</th>
                <th>{A.fields.closes}</th>
                <th>{t.studentHome.states.open}</th>
                <th>{t.app.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.title}</b>
                    <br />
                    <span className="text-xs text-slate-400">{r.subjects?.name}</span>
                  </td>
                  <td>{r.groups?.name}</td>
                  <td className="whitespace-nowrap">{fmt(r.opens_at)}</td>
                  <td className="whitespace-nowrap">{fmt(r.closes_at)}</td>
                  <td>
                    <span className="badge">{A.status[stateOf(r)]}</span>
                    <p className="mt-1 text-xs text-slate-500">
                      {total.get(r.id) ?? 0} {A.attempts}
                      {(pending.get(r.id) ?? 0) > 0 &&
                        ` · ${pending.get(r.id)} ${t.grading.pending}`}
                    </p>
                  </td>
                  <td className="space-x-3 whitespace-nowrap">
                    <Link
                      href={`/teacher/assessments/${r.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      {t.app.edit}
                    </Link>
                    <Link
                      href={`/teacher/assessments/${r.id}/grading`}
                      className="text-brand-600 hover:underline"
                    >
                      {A.grading}
                    </Link>
                    <DeleteAssessment id={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
