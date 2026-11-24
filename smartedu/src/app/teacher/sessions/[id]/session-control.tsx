'use client'

import Link from 'next/link'
import { useState } from 'react'
import { PdfViewer } from '@/components/pdf-viewer'
import { ClientApiError, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'
import type { SessionState } from '@/lib/session-state'
import { useLiveSession } from '@/lib/use-live-session'

const L = t.live

/** O'qituvchi boshqaruvi (telefonda ham qulay): slayd almashtirish, doska havolasi, darsni tugatish. */
export function SessionControl({
  initial,
  pdfUrl,
  siteUrl,
}: {
  initial: SessionState
  pdfUrl: string
  siteUrl: string
}) {
  const { state, connected, setSlide, end } = useLiveSession(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const active = state.status === 'active'

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(errorText(err instanceof ClientApiError ? err.code : undefined))
    } finally {
      setBusy(false)
    }
  }
  const go = (n: number) => n >= 1 && n <= state.pageCount && run(() => setSlide(n))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{state.title}</h1>
          <p className="text-sm text-slate-500">
            {L.joinCode}: <b className="font-mono text-lg text-slate-900">{state.code}</b> ·{' '}
            {siteUrl.replace(/^https?:\/\//, '')}/live · {L.participants}:{' '}
            <b>{state.participants}</b>
          </p>
          <p className={`text-xs ${connected ? 'text-green-700' : 'text-amber-700'}`}>
            {connected ? L.connected : L.disconnected}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/teacher/sessions/${state.id}/attendance`} className="btn-secondary">
            {t.attendance.open}
          </Link>
          {active && (
            <Link href={`/board/${state.id}`} target="_blank" className="btn-primary">
              {L.openBoard}
            </Link>
          )}
          {active && (
            <button
              className="btn-danger"
              disabled={busy}
              onClick={() => confirm(L.endConfirm) && run(end)}
            >
              {L.endLesson}
            </button>
          )}
        </div>
      </div>
      {active && <p className="text-xs text-slate-500">{L.boardHint}</p>}
      {!active && <p className="rounded-lg bg-slate-100 p-3 font-medium">{L.ended}</p>}

      <div className="card space-y-3">
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-100">
          {pdfUrl ? (
            <PdfViewer url={pdfUrl} page={state.slide} fit="contain" className="size-full" />
          ) : (
            <p className="p-6 text-sm text-red-600">{t.lectures.pdfError}</p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            className="btn-secondary min-w-24 text-lg"
            disabled={!active || busy || state.slide <= 1}
            onClick={() => go(state.slide - 1)}
          >
            ‹ {L.prev}
          </button>
          <span className="text-xl font-bold tabular-nums">
            {state.slide} / {state.pageCount}
          </span>
          <button
            className="btn-primary min-w-24 text-lg"
            disabled={!active || busy || state.slide >= state.pageCount}
            onClick={() => go(state.slide + 1)}
          >
            {L.next} ›
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm">
          <label htmlFor="jump">{L.slide}:</label>
          <input
            id="jump"
            className="input w-24 text-center"
            type="number"
            min={1}
            max={state.pageCount}
            defaultValue={state.slide}
            key={state.slide}
            disabled={!active}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void go(Number((e.target as HTMLInputElement).value))
            }}
          />
        </div>
        {error && (
          <p role="alert" className="text-center text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
