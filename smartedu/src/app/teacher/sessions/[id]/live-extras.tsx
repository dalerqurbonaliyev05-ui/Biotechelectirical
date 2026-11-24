'use client'

import { useCallback, useEffect, useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'
import type { SessionState } from '@/lib/session-state'

const X = t.extras

interface Ask {
  id: string
  body: string
  votes: number
  answered: boolean
  onBoard: boolean
}

/**
 * Savol qutisi (anonim, ovoz bo'yicha) va tezkor so'rov. Savol muallifi bu yerda HECH QACHON ko'rsatilmaydi.
 * `onPoll` — so'rov ochish/yopish (state yangilanadi va talabalarga signal ketadi).
 */
export function LiveExtras({
  state,
  onPoll,
  onSignal,
}: {
  state: SessionState
  onPoll: (
    json: { action: 'open'; body: string; options?: string[] } | { action: 'close' },
  ) => Promise<void>
  onSignal: () => void
}) {
  const [asks, setAsks] = useState<Ask[]>([])
  const [body, setBody] = useState('')
  const [opts, setOpts] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const active = state.status === 'active'
  const poll = state.poll

  const load = useCallback(
    () =>
      apiJson<{ asks: Ask[] }>(`/api/sessions/${state.id}/asks`)
        .then((r) => setAsks(r.asks))
        .catch(() => undefined),
    [state.id],
  )
  useEffect(() => {
    void load()
    if (!active) return
    const id = setInterval(load, 6000)
    return () => clearInterval(id)
  }, [load, active])

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setErr(null)
    try {
      await fn()
    } catch (e) {
      setErr(errorText(e instanceof ClientApiError ? e.code : undefined))
    } finally {
      setBusy(false)
    }
  }
  const moderate = (ask: Ask, patch: Record<string, boolean>) =>
    run(async () => {
      await apiJson(`/api/sessions/${state.id}/asks`, {
        method: 'PATCH',
        json: { ask_id: ask.id, ...patch },
      })
      await load()
      onSignal()
    })

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card space-y-2">
        <h2 className="font-semibold">{X.pollTitle}</h2>
        {poll && poll.status === 'open' ? (
          <div className="space-y-2">
            <p className="font-medium">{poll.body}</p>
            {poll.options.map((o) => (
              <div key={o.id} className="text-sm">
                <div className="flex justify-between">
                  <span>{o.text}</span>
                  <span className="tabular-nums">
                    {o.count} ({o.pct}%)
                  </span>
                </div>
                <div className="h-2 rounded bg-slate-100">
                  <div className="h-2 rounded bg-brand-600" style={{ width: `${o.pct}%` }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-slate-500">
              {poll.total} {X.pollTotal}
            </p>
            <button
              className="btn-secondary"
              disabled={busy || !active}
              onClick={() => run(() => onPoll({ action: 'close' }))}
            >
              {X.pollClose}
            </button>
          </div>
        ) : (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              const options = opts
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean)
              void run(async () => {
                await onPoll({
                  action: 'open',
                  body: body.trim(),
                  ...(options.length >= 2 ? { options } : {}),
                })
                setBody('')
                setOpts('')
              })
            }}
          >
            <input
              className="input"
              placeholder={X.pollQuestion}
              value={body}
              maxLength={200}
              onChange={(e) => setBody(e.target.value)}
            />
            <input
              className="input"
              placeholder={X.pollOptions}
              value={opts}
              onChange={(e) => setOpts(e.target.value)}
            />
            <button className="btn-primary" disabled={busy || !active || body.trim().length < 3}>
              {X.pollOpen}
            </button>
          </form>
        )}
        {err && <p className="text-sm text-red-600">{err}</p>}
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">{X.asksTitle}</h2>
        <p className="text-xs text-slate-500">{X.asksLead}</p>
        {asks.length === 0 ? (
          <p className="text-sm text-slate-500">{X.noAsks}</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {asks.map((a) => (
              <li
                key={a.id}
                className={`rounded-lg border p-2 ${a.onBoard ? 'border-brand-600 bg-brand-50' : ''}`}
              >
                <p className={`text-sm ${a.answered ? 'text-slate-400 line-through' : ''}`}>
                  {a.body}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="badge">
                    👍 {a.votes} {X.votes}
                  </span>
                  <button
                    className="text-brand-600 underline"
                    disabled={busy || !active}
                    onClick={() => moderate(a, { on_board: !a.onBoard })}
                  >
                    {a.onBoard ? X.offBoard : X.toBoard}
                  </button>
                  <button
                    className="underline"
                    disabled={busy}
                    onClick={() => moderate(a, { answered: !a.answered })}
                  >
                    {X.markAnswered}
                  </button>
                  <button
                    className="text-red-600 underline"
                    disabled={busy}
                    onClick={() => moderate(a, { hidden: true })}
                  >
                    {X.hide}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
