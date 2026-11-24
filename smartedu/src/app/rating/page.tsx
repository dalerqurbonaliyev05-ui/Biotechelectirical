import { t } from '@/lib/i18n'
import { loadStudentSemester } from '@/lib/server/analytics'
import { requireRole } from '@/lib/server/session'
import { createAdminClient } from '@/lib/supabase/admin'

const S = t.semester
const fmt = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' }) : '—'

export const metadata = { title: S.title }

export default async function RatingPage() {
  const me = await requireRole('student')
  const d = await loadStudentSemester(createAdminClient(), me.id, me.group_id)
  const empty = d.sessions.length === 0 && d.assessments.length === 0

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">{S.myTitle}</h1>
      <p className="text-xs text-slate-500">{S.formula}</p>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="card">
          <p className="text-2xl font-bold">{d.mine?.totals.total ?? 0}</p>
          <p className="text-xs text-slate-500">{S.myTotal}</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold">
            {d.mine?.rank ?? '—'}
            <span className="text-sm font-normal text-slate-500"> / {d.groupSize}</span>
          </p>
          <p className="text-xs text-slate-500">{S.myRank}</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold">{d.average}</p>
          <p className="text-xs text-slate-500">{S.average}</p>
        </div>
      </div>

      {empty && <p className="card text-slate-500">{S.none}</p>}

      {d.top.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{S.top}</h2>
          <ol className="card divide-y divide-slate-100 p-0">
            {d.top.map((r) => (
              <li
                key={`${r.rank}-${r.name}`}
                className={`flex items-center gap-3 px-4 py-2 ${r.mine ? 'bg-brand-50 font-semibold' : ''}`}
              >
                <span className="w-8 text-center">
                  {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank}
                </span>
                <span className="flex-1">
                  {r.name} {r.mine && <span className="text-xs text-slate-500">{S.youMark}</span>}
                </span>
                <span className="tabular-nums">{r.total}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-slate-400">{S.privacyNote}</p>
        </section>
      )}

      {d.sessions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{S.liveBreakdown}</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.analytics.lesson}</th>
                  <th>{t.analytics.date}</th>
                  <th>{S.answered}</th>
                  <th>{S.points}</th>
                </tr>
              </thead>
              <tbody>
                {d.sessions.map((s, i) => (
                  <tr key={i}>
                    <td>{s.title}</td>
                    <td>{fmt(s.startedAt)}</td>
                    <td>
                      {s.correct}/{s.answered}
                    </td>
                    <td className="font-medium">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {d.assessments.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{S.assessBreakdown}</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.assessments.fields.title}</th>
                  <th>{S.points}</th>
                  <th>{S.weight}</th>
                  <th>{S.contribution}</th>
                </tr>
              </thead>
              <tbody>
                {d.assessments.map((a, i) => (
                  <tr key={i}>
                    <td>{a.title}</td>
                    <td>
                      {a.total} / {a.max}
                    </td>
                    <td>{a.weight}</td>
                    <td className="font-medium">{a.contribution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
