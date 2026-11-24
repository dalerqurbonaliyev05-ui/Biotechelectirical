import Link from 'next/link'
import { t } from '@/lib/i18n'
import { loadSubjectOverview } from '@/lib/server/analytics'
import { requireRole } from '@/lib/server/session'
import { listMySubjects } from '@/lib/server/teacher-data'
import { createClient } from '@/lib/supabase/server'

const A = t.analytics
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('uz-UZ', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Tashkent',
  })

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>
}) {
  const me = await requireRole('teacher', 'admin')
  const subjects = await listMySubjects(me)
  const { subject } = await searchParams
  const current = subjects.find((s) => s.id === subject) ?? subjects[0]
  if (!current) return <p className="card text-slate-500">{A.noSubject}</p>

  const data = await loadSubjectOverview(await createClient(), current.id)
  const topicLabel = (x: string) => x || A.noTopic

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{A.title}</h1>
        <p className="text-sm text-slate-600">{A.lead}</p>
      </div>

      <form method="get" className="flex items-end gap-2">
        <div className="min-w-48">
          <label className="label" htmlFor="subject">
            {A.subject}
          </label>
          <select id="subject" name="subject" defaultValue={current.id} className="input">
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-secondary">{t.app.search}</button>
      </form>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{A.lessons}</h2>
        {data.sessions.length === 0 ? (
          <p className="card text-slate-500">{A.noLessons}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{A.lesson}</th>
                  <th>{A.date}</th>
                  <th>{A.attended}</th>
                  <th>{A.answers}</th>
                  <th>{A.correctShare}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.title}</td>
                    <td className="whitespace-nowrap">{fmt(s.startedAt)}</td>
                    <td>
                      {s.participants}{' '}
                      <span className="text-xs text-slate-400">
                        ({s.auditorium} {A.inRoom})
                      </span>
                    </td>
                    <td>{s.answers}</td>
                    <td>{s.answers ? `${s.correctPct}%` : '—'}</td>
                    <td>
                      <Link
                        href={`/teacher/analytics/sessions/${s.id}`}
                        className="text-brand-600 hover:underline"
                      >
                        {A.open}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{A.weakTitle}</h2>
        <p className="text-sm text-slate-600">{A.weakLead}</p>
        {data.weak.length === 0 ? (
          <p className="card text-sm text-slate-500">{A.noWeak}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.weak.map((w) => (
              <li
                key={w.topic}
                className="card flex items-center justify-between border-red-200 bg-red-50"
              >
                <span className="font-medium">{topicLabel(w.topic)}</span>
                <span className="text-red-700">
                  <b>{w.pct}%</b>{' '}
                  <span className="text-xs">
                    ({w.correct}/{w.total})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{A.topicsTitle}</h2>
        <p className="text-sm text-slate-600">
          {A.topicsLead} ({A.sources}: {data.liveAnswers} + {data.assessmentAnswers})
        </p>
        {data.topics.length === 0 ? (
          <p className="card text-sm text-slate-500">{t.app.empty}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{A.topic}</th>
                  <th>{A.total}</th>
                  <th>{A.correct}</th>
                  <th>{A.share}</th>
                </tr>
              </thead>
              <tbody>
                {data.topics.map((x) => (
                  <tr key={x.topic}>
                    <td>
                      {topicLabel(x.topic)}{' '}
                      {x.lowSample && <span className="badge ml-1">{A.lowSample}</span>}
                    </td>
                    <td>{x.total}</td>
                    <td>{x.correct}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded bg-slate-200">
                          <div
                            className={`h-full ${x.pct < 60 ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${x.pct}%` }}
                          />
                        </div>
                        {x.pct}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
