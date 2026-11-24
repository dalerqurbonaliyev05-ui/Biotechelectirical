'use client'

import { useCallback, useEffect, useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'
import type { SessionState } from '@/lib/session-state'

const G = t.guests

interface Participant {
  id: string
  name: string
  code: string | null
  isGuest: boolean
  guestGroup: string | null
  mode: string
  rejoin: number
  blocked: boolean
  linked: boolean
}

/** Dars sozlamalari + kodni yangilash + ishtirokchilar (bloklash, dars tugagach mehmonni talabaga bog'lash). */
export function SessionExtras({
  state,
  onState,
}: {
  state: SessionState
  onState: (s: SessionState) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [list, setList] = useState<Participant[]>([])
  const [open, setOpen] = useState(false)
  const active = state.status === 'active'

  const fail = (err: unknown) =>
    setError(errorText(err instanceof ClientApiError ? err.code : undefined))
  const reload = useCallback(
    () =>
      apiJson<{ participants: Participant[] }>(`/api/sessions/${state.id}/participants`)
        .then((r) => setList(r.participants))
        .catch(() => undefined),
    [state.id],
  )

  useEffect(() => {
    if (!open) return
    void reload()
    const id = setInterval(reload, 10_000)
    return () => clearInterval(id)
  }, [open, reload])

  async function patch(body: Record<string, unknown>) {
    setError(null)
    try {
      onState(
        await apiJson<SessionState>(`/api/sessions/${state.id}/settings`, {
          method: 'PATCH',
          json: body,
        }),
      )
    } catch (err) {
      fail(err)
    }
  }
  async function rotate() {
    if (!confirm(G.rotateConfirm)) return
    try {
      onState(
        await apiJson<SessionState>(`/api/sessions/${state.id}/rotate-code`, { method: 'POST' }),
      )
    } catch (err) {
      fail(err)
    }
  }
  async function act(pid: string, json: Record<string, unknown>) {
    setError(null)
    try {
      await apiJson(`/api/sessions/${state.id}/participants/${pid}`, { method: 'POST', json })
      await reload()
    } catch (err) {
      fail(err)
    }
  }

  const s = state.settings
  const toggle = (key: string, label: string, value: boolean) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={value} onChange={(e) => patch({ [key]: e.target.checked })} />{' '}
      {label}
    </label>
  )

  return (
    <>
      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{G.settings}</h2>
          {active && (
            <button className="btn-secondary" onClick={rotate}>
              {G.rotateCode}
            </button>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {toggle('allow_guests', G.allowGuests, s.allowGuests)}
          {toggle('bonus_enabled', G.bonusOn, s.bonusEnabled)}
          {toggle('confused_enabled', G.confusedOn, s.confusedEnabled)}
          {toggle('show_reactor_names', G.showNames, s.showReactorNames)}
          {toggle('share_annotations', G.shareInk, s.shareAnnotations)}
          <label className="flex items-center gap-2 text-sm">
            {G.minRatio}
            <input
              className="input w-24"
              type="number"
              min={0}
              max={1}
              step={0.05}
              defaultValue={s.minAttendanceRatio}
              key={s.minAttendanceRatio}
              onBlur={(e) =>
                Number(e.target.value) !== s.minAttendanceRatio &&
                patch({ min_attendance_ratio: Number(e.target.value) })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            {G.topReactors}
            <input
              className="input w-24"
              type="number"
              min={1}
              max={10}
              defaultValue={s.topReactors}
              key={s.topReactors}
              onBlur={(e) =>
                Number(e.target.value) !== s.topReactors &&
                patch({ top_reactors: Number(e.target.value) })
              }
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </section>

      <section className="card space-y-3">
        <button
          className="flex w-full items-center justify-between font-semibold"
          onClick={() => setOpen(!open)}
        >
          <span>
            {G.title} ({state.participants})
          </span>
          <span>{open ? '▲' : '▼'}</span>
        </button>
        {open && (
          <>
            {!active && <p className="text-xs text-slate-500">{G.linkHint}</p>}
            <ul className="divide-y divide-slate-100 text-sm">
              {list.map((p) => (
                <li key={p.id} className="space-y-1 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1">
                      {p.name}{' '}
                      {p.code && <span className="font-mono text-xs text-slate-400">{p.code}</span>}
                      {p.isGuest && (
                        <span className="badge ml-1">
                          {G.badge}
                          {p.guestGroup ? `: ${p.guestGroup}` : ''}
                        </span>
                      )}
                      {p.linked && <span className="badge ml-1">{G.linked}</span>}
                      {p.blocked && (
                        <span className="badge ml-1 bg-red-100 text-red-700">{G.blocked}</span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400">
                      {p.mode === 'auditorium' ? t.attendance.auditorium : t.attendance.remote}
                      {p.rejoin > 0 ? ` · ↻${p.rejoin}` : ''}
                    </span>
                    {active &&
                      (p.blocked ? (
                        <button
                          className="text-brand-600 hover:underline"
                          onClick={() => act(p.id, { action: 'unblock' })}
                        >
                          {G.unblock}
                        </button>
                      ) : (
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => act(p.id, { action: 'block' })}
                        >
                          {G.block}
                        </button>
                      ))}
                  </div>
                  {!active && p.isGuest && (
                    <LinkGuest
                      sessionId={state.id}
                      onLink={(sid) => act(p.id, { action: 'link', student_id: sid })}
                    />
                  )}
                </li>
              ))}
              {list.length === 0 && <li className="py-2 text-slate-500">{t.app.empty}</li>}
            </ul>
          </>
        )}
      </section>
    </>
  )
}

function LinkGuest({
  sessionId,
  onLink,
}: {
  sessionId: string
  onLink: (studentId: string) => void
}) {
  const [q, setQ] = useState('')
  const [found, setFound] = useState<{ id: string; name: string; code: string | null }[]>([])
  useEffect(() => {
    if (q.trim().length < 2) return void setFound([])
    let live = true
    const id = setTimeout(
      () =>
        apiJson<{ students: typeof found }>(
          `/api/sessions/${sessionId}/students?q=${encodeURIComponent(q)}`,
        )
          .then((r) => live && setFound(r.students))
          .catch(() => undefined),
      300,
    )
    return () => {
      live = false
      clearTimeout(id)
    }
  }, [q, sessionId])
  return (
    <div className="space-y-1">
      <input
        className="input min-h-9"
        placeholder={G.linkSearch}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {found.length > 0 && (
        <ul className="rounded-lg border border-slate-200">
          {found.map((s) => (
            <li key={s.id}>
              <button
                className="w-full px-3 py-1.5 text-left hover:bg-slate-50"
                onClick={() => onLink(s.id)}
              >
                {G.link}: {s.name}{' '}
                <span className="font-mono text-xs text-slate-400">{s.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
