'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'

const T = t.teacherResults

export function AdjustScore({
  answerId,
  current,
  max,
  pending,
  disabled,
}: {
  answerId: string
  current: number | null
  max: number
  pending: boolean
  disabled: boolean
}) {
  const router = useRouter()
  const [score, setScore] = useState(current === null ? '' : String(current))
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const changed = current === null || Number(score.replace(',', '.')) !== current

  async function save() {
    const n = Number(score.replace(',', '.'))
    if (score.trim() === '' || !Number.isFinite(n) || n < 0 || n > max)
      return setMsg({ ok: false, text: `0…${max}` })
    if (current !== null && n !== current && !reason.trim())
      return setMsg({ ok: false, text: T.reasonRequired })
    setBusy(true)
    setMsg(null)
    try {
      await apiJson(`/api/answers/${answerId}/grade`, {
        method: 'POST',
        json: { score: n, reason: reason.trim() || undefined },
      })
      setMsg({ ok: true, text: T.saved })
      setReason('')
      router.refresh()
    } catch (err) {
      const code = err instanceof ClientApiError ? err.code : undefined
      setMsg({ ok: false, text: code === 'reason_required' ? T.reasonRequired : errorText(code) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[8rem_1fr_auto]">
      <div>
        <label className="label" htmlFor={`s-${answerId}`}>
          {pending ? t.results.pending : T.newScore} (0–{max})
        </label>
        <input
          id={`s-${answerId}`}
          className="input"
          type="number"
          min={0}
          max={max}
          step="any"
          value={score}
          disabled={disabled}
          onChange={(e) => setScore(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor={`r-${answerId}`}>
          {T.reasonLabel}
        </label>
        <input
          id={`r-${answerId}`}
          className="input"
          value={reason}
          disabled={disabled}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <div className="flex items-end">
        <button className="btn-secondary" disabled={busy || disabled || !changed} onClick={save}>
          {T.adjust}
        </button>
      </div>
      {msg && (
        <p
          role="status"
          className={`text-sm sm:col-span-3 ${msg.ok ? 'text-green-700' : 'text-red-600'}`}
        >
          {msg.text}
        </p>
      )}
    </div>
  )
}

export function FinalizeButton({ attemptId }: { attemptId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function run() {
    setBusy(true)
    try {
      await apiJson(`/api/attempts/${attemptId}/finalize`, { method: 'POST' })
      router.refresh()
    } catch (e) {
      setErr(errorText(e instanceof ClientApiError ? e.code : undefined))
      setBusy(false)
    }
  }
  return (
    <div>
      <button className="btn-primary" disabled={busy} onClick={run}>
        {T.finalize}
      </button>
      {err && (
        <p role="alert" className="text-sm text-red-600">
          {err}
        </p>
      )}
    </div>
  )
}
