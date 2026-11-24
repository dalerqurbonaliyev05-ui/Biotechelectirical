import Link from 'next/link'
import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n'
import { submitExpiredAttempts } from '@/lib/server/assessments'
import { requireRole } from '@/lib/server/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ResultsActions } from './results-actions'

const T = t.teacherResults

interface AttemptRow {
  id: string
  student_id: string
  status: 'in_progress' | 'submitted' | 'finalized'
  total_score: number | null
  max_score: number | null
  leave_count: number
  profiles: { full_name: string; student_code: string | null } | null
}

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('teacher', 'admin')
  const { id } = await params
  const supabase = await createClient()
  const { data: a } = await supabase
    .from('assessments')
    .select('id, title, group_id, answers_revealed_at')
    .eq('id', id)
    .maybeSingle()
  if (!a) notFound()

  await submitExpiredAttempts(createAdminClient(), id)
  const { data } = await supabase
    .from('attempts')
    .select(
      'id, student_id, status, total_score, max_score, leave_count, profiles!attempts_student_id_fkey(full_name, student_code)',
    )
    .eq('assessment_id', id)
  const attempts = ((data ?? []) as unknown as AttemptRow[]).sort(
    (x, y) => Number(y.total_score ?? 0) - Number(x.total_score ?? 0),
  )
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, student_code')
    .eq('role', 'student')
    .eq('group_id', a.group_id)
    .eq('is_active', true)
    .order('full_name')
  const started = new Set(attempts.map((x) => x.student_id))
  const notStarted = (students ?? []).filter((s) => !started.has(s.id as string))

  const done = attempts.filter((x) => x.status !== 'in_progress')
  const pct = (x: AttemptRow) =>
    Number(x.max_score ?? 0) > 0 ? (Number(x.total_score ?? 0) / Number(x.max_score)) * 100 : 0
  const avg = done.length ? done.reduce((s, x) => s + pct(x), 0) / done.length : 0
  const best = done.length ? Math.max(...done.map(pct)) : 0
  const low = done.length ? Math.min(...done.map(pct)) : 0

  return (
    <div className="space-y-4">
      <Link href="/teacher/assessments" className="text-sm text-brand-600 hover:underline">
        {t.grading.back}
      </Link>
      <h1 className="text-2xl font-bold">
        {T.title}: {a.title}
      </h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [T.summary.participants, `${done.length} / ${(students ?? []).length}`],
          [T.summary.average, `${avg.toFixed(1)}%`],
          [T.summary.best, `${best.toFixed(1)}%`],
          [T.summary.lowest, `${low.toFixed(1)}%`],
        ].map(([k, v]) => (
          <div key={k} className="card text-center">
            <p className="text-xl font-bold">{v}</p>
            <p className="text-xs text-slate-500">{k}</p>
          </div>
        ))}
      </div>

      <ResultsActions assessmentId={id} revealed={Boolean(a.answers_revealed_at)} />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{T.code}</th>
              <th>{T.student}</th>
              <th>{T.status}</th>
              <th>{T.total}</th>
              <th>{T.percent}</th>
              <th title={T.leavesHint}>{T.leaves}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {attempts.map((x) => (
              <tr key={x.id}>
                <td className="font-mono text-xs">{x.profiles?.student_code}</td>
                <td>{x.profiles?.full_name}</td>
                <td>
                  <span className="badge">{T.statuses[x.status]}</span>
                </td>
                <td>
                  {x.status === 'in_progress'
                    ? '—'
                    : `${Number(x.total_score ?? 0)} / ${Number(x.max_score ?? 0)}`}
                </td>
                <td>{x.status === 'in_progress' ? '—' : pct(x).toFixed(1)}</td>
                <td>{x.leave_count}</td>
                <td>
                  {x.status !== 'in_progress' && (
                    <Link
                      href={`/teacher/assessments/${id}/results/${x.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      {T.detail}
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {attempts.length === 0 && (
              <tr>
                <td colSpan={7} className="text-slate-500">
                  {t.app.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {notStarted.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-semibold">
            {T.notStarted} ({notStarted.length})
          </h2>
          <p className="text-sm text-slate-600">{notStarted.map((s) => s.full_name).join(', ')}</p>
        </section>
      )}
    </div>
  )
}
