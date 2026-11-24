import Link from 'next/link'
import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n'
import { loadSessionAnalytics } from '@/lib/server/analytics'
import { requireRole } from '@/lib/server/session'
import { createClient } from '@/lib/supabase/server'

const A = t.analytics
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('uz-UZ', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Tashkent',
  })

export default async function SessionAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole('teacher', 'admin')
  const { id } = await params
  if (!GUID.test(id)) notFound()
  const d = await loadSessionAnalytics(await createClient(), id)
  if (!d) notFound()

  return (
    <div className="space-y-5">
      <Link href="/teacher/analytics" className="text-sm text-brand-600 hover:underline">
        {t.results.back}
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{d.title}</h1>
        <p className="text-sm text-slate-500">{fmt(d.startedAt)}</p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="card">
          <p className="text-2xl font-bold">{d.participants}</p>
          <p className="text-xs text-slate-500">{A.attended}</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold">{d.auditorium}</p>
          <p className="text-xs text-slate-500">{t.attendance.auditorium}</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold">{d.remote}</p>
          <p className="text-xs text-slate-500">{t.attendance.remote}</p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{A.attendanceTitle}</h2>
        {d.attendance.total === 0 ? (
          <p className="card text-sm text-slate-500">{A.attendancePending}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <div className="card">
              <p className="text-2xl font-bold text-green-700">{d.attendance.present}</p>
              <p className="text-xs text-slate-500">{A.attendancePresent}</p>
            </div>
            <div className="card">
              <p className="text-2xl font-bold text-red-600">{d.attendance.nb}</p>
              <p className="text-xs text-slate-500">{A.attendanceNb}</p>
            </div>
            <div className="card">
              <p className="text-2xl font-bold">{d.attendance.avgRatioPct ?? '—'}%</p>
              <p className="text-xs text-slate-500">{A.attendanceAvg}</p>
            </div>
            <div className="card">
              <p className="text-2xl font-bold">{d.guests}</p>
              <p className="text-xs text-slate-500">
                {A.guests} · {A.breaksCount}: {d.breaks}
              </p>
            </div>
          </div>
        )}
        <Link
          href={`/teacher/sessions/${id}/nb`}
          className="text-sm text-brand-600 hover:underline"
        >
          {A.nbLink}
        </Link>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{A.reactionsTitle}</h2>
        <p className="text-xs text-slate-500">{A.reactionsLead}</p>
        {d.reactions.length === 0 ? (
          <p className="card text-sm text-slate-500">{A.noReactions}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{A.slide}</th>
                  <th>👍 {A.understood}</th>
                  <th>🤔 {A.confused}</th>
                  <th>{A.share}</th>
                </tr>
              </thead>
              <tbody>
                {d.reactions.map((r) => (
                  <tr key={r.slide} className={r.hard ? 'bg-red-50' : ''}>
                    <td>
                      {r.slide} {r.hard && <span className="badge">{A.hardSlide}</span>}
                    </td>
                    <td>{r.understood}</td>
                    <td>{r.confused}</td>
                    <td>{r.pctUnderstood === null ? '—' : `${r.pctUnderstood}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{A.byQuestion}</h2>
        {d.questions.length === 0 ? (
          <p className="card text-slate-500">{A.noQuestions}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{A.slide}</th>
                  <th>{A.question}</th>
                  <th>{A.topic}</th>
                  <th>{A.answers}</th>
                  <th>{A.correctShare}</th>
                </tr>
              </thead>
              <tbody>
                {d.questions.map((q) => (
                  <tr key={q.id}>
                    <td>{q.slide}</td>
                    <td className="max-w-md">
                      <span className="line-clamp-2">{q.text}</span>
                    </td>
                    <td>{q.topic ?? '—'}</td>
                    <td>
                      {q.answered}{' '}
                      <span className="text-xs text-slate-400">({q.answeredPct}%)</span>
                    </td>
                    <td>
                      <b className={q.correctPct < 60 ? 'text-red-600' : 'text-green-700'}>
                        {q.answered ? `${q.correctPct}%` : '—'}
                      </b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {d.topics.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{A.topicsTitle}</h2>
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
                {d.topics.map((x) => (
                  <tr key={x.topic}>
                    <td>{x.topic || A.noTopic}</td>
                    <td>{x.total}</td>
                    <td>{x.correct}</td>
                    <td>{x.pct}%</td>
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
