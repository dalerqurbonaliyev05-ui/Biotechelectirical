import Link from 'next/link'
import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n'
import { loadTeacherAttempt } from '@/lib/server/results'
import { requireRole } from '@/lib/server/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { AdjustScore, FinalizeButton } from './adjust-score'

const R = t.results
const T = t.teacherResults
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('uz-UZ', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Tashkent',
  })
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function AttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>
}) {
  await requireRole('teacher', 'admin')
  const { id, attemptId } = await params
  if (!GUID.test(attemptId)) notFound()
  const view = await loadTeacherAttempt(await createClient(), createAdminClient(), attemptId)
  if (!view || view.assessmentId !== id) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href={`/teacher/assessments/${id}/results`}
        className="text-sm text-brand-600 hover:underline"
      >
        {R.back}
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{view.studentName}</h1>
        <p className="text-sm text-slate-500">
          {view.studentCode} · {view.assessmentTitle} ·{' '}
          <span className="badge">{T.statuses[view.status]}</span> · {T.leaves}: {view.leaveCount}
        </p>
      </div>
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <p className="text-2xl font-bold">
          {view.totalScore} / {view.maxScore}
        </p>
        {view.status === 'submitted' &&
          (view.pendingCount > 0 ? (
            <p className="text-sm text-amber-700">
              {view.pendingCount} {T.unfinished}
            </p>
          ) : (
            <FinalizeButton attemptId={attemptId} />
          ))}
      </div>

      <ol className="space-y-3">
        {view.answers.map((a) => (
          <li key={a.answerId} className="card space-y-2">
            <p className="font-medium whitespace-pre-wrap">
              <span className="text-slate-400">{a.position}.</span> {a.text}
            </p>
            <p className="text-sm">
              <span className="text-slate-500">{T.studentAnswer}:</span> {a.response || R.noAnswer}
            </p>
            {a.correct && (
              <p className="text-sm text-green-800">
                <span className="text-slate-500">{T.expected}:</span> {a.correct}
              </p>
            )}
            <AdjustScore
              answerId={a.answerId}
              current={a.score}
              max={a.pointsMax}
              pending={a.pending}
              disabled={view.status === 'in_progress'}
            />
          </li>
        ))}
      </ol>

      {view.audit.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{R.auditTitle}</h2>
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
