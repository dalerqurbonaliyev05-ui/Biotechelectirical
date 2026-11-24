import Link from 'next/link'
import { t } from '@/lib/i18n'
import { loadStudentResult } from '@/lib/server/results'
import { requireRole } from '@/lib/server/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const R = t.results
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('uz-UZ', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Tashkent',
  })

export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  await requireRole('student')
  const { attemptId } = await params
  // Foydalanuvchi sessiyasi bilan: RLS natija e'lon qilinmaguncha ma'lumot bermaydi
  const view = z_guid(attemptId)
    ? await loadStudentResult(await createClient(), createAdminClient(), attemptId)
    : null

  if (!view) {
    return (
      <div className="space-y-4">
        <Link href="/student" className="text-sm text-brand-600 hover:underline">
          {R.back}
        </Link>
        <p className="card text-slate-600">{R.notReleased}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/student" className="text-sm text-brand-600 hover:underline">
        {R.back}
      </Link>
      <h1 className="text-2xl font-bold">{view.title}</h1>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="card">
          <p className="text-2xl font-bold">
            {view.totalScore} / {view.maxScore}
          </p>
          <p className="text-xs text-slate-500">{R.score}</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold">{view.percent}%</p>
          <p className="text-xs text-slate-500">{R.percent}</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold">
            {view.rank ? `${view.rank.rank}` : '—'}
            {view.rank && (
              <span className="text-sm font-normal text-slate-500"> / {view.rank.of}</span>
            )}
          </p>
          <p className="text-xs text-slate-500">{R.rank}</p>
        </div>
      </div>

      {!view.answersRevealed && (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">{R.hidden}</p>
      )}

      <h2 className="text-lg font-semibold">{R.perQuestion}</h2>
      <ol className="space-y-3">
        {view.answers.map((a) => {
          const verdict = a.pending
            ? R.pending
            : a.isCorrect
              ? R.correct
              : a.score && a.score > 0
                ? R.partial
                : R.wrong
          const tone = a.pending
            ? 'bg-slate-100 text-slate-700'
            : a.isCorrect
              ? 'bg-green-100 text-green-800'
              : a.score && a.score > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800'
          return (
            <li key={a.answerId} className="card space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium whitespace-pre-wrap">
                  <span className="text-slate-400">{a.position}.</span> {a.text}
                </p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
                  {a.pending ? verdict : `${a.score ?? 0} / ${a.pointsMax}`}
                </span>
              </div>
              <p className="text-sm">
                <span className="text-slate-500">{R.yourAnswer}:</span> {a.response || R.noAnswer}
              </p>
              {a.correct !== null && a.correct !== '' && (
                <p className="text-sm text-green-800">
                  <span className="text-slate-500">{R.correctAnswer}:</span> {a.correct}
                </p>
              )}
              {a.explanation && (
                <p className="rounded-lg bg-slate-50 p-2 text-sm">
                  <span className="text-slate-500">{R.explanation}:</span> {a.explanation}
                </p>
              )}
              {a.feedback && (
                <p className="rounded-lg bg-slate-50 p-2 text-sm">
                  <span className="text-slate-500">{R.teacherComment}:</span> {a.feedback}
                </p>
              )}
              {a.book && (
                <a
                  href={a.book.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm text-brand-600 underline"
                >
                  📖{' '}
                  {a.book.page
                    ? R.readBook.replace('{page}', String(a.book.page))
                    : R.readBookNoPage}
                </a>
              )}
            </li>
          )
        })}
      </ol>

      {view.audit.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{R.auditTitle}</h2>
          <p className="text-xs text-slate-500">{R.auditNote}</p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{R.when}</th>
                  <th>{R.by}</th>
                  <th>{R.score}</th>
                  <th>{R.reason}</th>
                </tr>
              </thead>
              <tbody>
                {view.audit.map((e, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap">{fmt(e.at)}</td>
                    <td>{e.actor}</td>
                    <td>
                      {e.action === 'attempt.finalize'
                        ? R.auditFinalize
                        : e.action === 'score.set'
                          ? `${R.auditSet}: ${e.newScore}`
                          : `${R.auditAdjust}: ${e.oldScore} → ${e.newScore}`}
                    </td>
                    <td>{e.reason ?? '—'}</td>
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

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function z_guid(v: string): boolean {
  return GUID.test(v)
}
