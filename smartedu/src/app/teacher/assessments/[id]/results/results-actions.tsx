'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'

const T = t.teacherResults

export function ResultsActions({
  assessmentId,
  revealed,
}: {
  assessmentId: string
  revealed: boolean
}) {
  const router = useRouter()
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<string | void>) {
    setBusy(true)
    setMsg(null)
    try {
      setMsg((await fn()) ?? T.saved)
      router.refresh()
    } catch (err) {
      setMsg(errorText(err instanceof ClientApiError ? err.code : undefined))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card flex flex-wrap items-center gap-2">
      <button
        className="btn-secondary"
        disabled={busy}
        onClick={() =>
          run(async () => {
            const r = await apiJson<{ finalized: number; pending: number }>(
              `/api/assessments/${assessmentId}/finalize-all`,
              { method: 'POST' },
            )
            return `${r.finalized} ${t.grading.finalizedResult}, ${r.pending} ${t.grading.stillPending}`
          })
        }
      >
        {T.finalizeAll}
      </button>
      <button
        className="btn-secondary"
        disabled={busy}
        onClick={() =>
          run(async () => {
            await apiJson(`/api/assessments/${assessmentId}/reveal`, {
              method: 'POST',
              json: { reveal: !revealed },
            })
          })
        }
      >
        {revealed ? T.revealOff : T.revealOn}
      </button>
      {revealed && <span className="badge">{T.revealed}</span>}
      <span className="ml-auto flex items-center gap-2 text-sm">
        {T.export}:
        <a
          className="text-brand-600 underline"
          href={`/api/assessments/${assessmentId}/export?format=csv`}
          download
        >
          {T.csv}
        </a>
        <a
          className="text-brand-600 underline"
          href={`/api/assessments/${assessmentId}/export?format=xlsx`}
          download
        >
          {T.xlsx}
        </a>
      </span>
      {msg && (
        <p role="status" className="w-full text-sm text-slate-700">
          {msg}
        </p>
      )}
    </div>
  )
}
