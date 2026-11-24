'use client'

import { useEffect, useRef, useState } from 'react'
import { PdfViewer } from '@/components/pdf-viewer'
import { apiJson } from '@/lib/api-client'
import { QrCode } from '@/components/qr-code'
import { t } from '@/lib/i18n'
import type { SessionState } from '@/lib/session-state'
import { useLiveSession } from '@/lib/use-live-session'

const L = t.live

/** Katta ekran uchun: slayd, raqam, QR + kod, ishtirokchilar. Klaviatura bilan boshqariladi. */
export function BoardView({
  initial,
  pdfUrl,
  siteUrl,
}: {
  initial: SessionState
  pdfUrl: string
  siteUrl: string
}) {
  const { state, connected, setSlide } = useLiveSession(initial, 5000)
  const root = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrWarn, setQrWarn] = useState(false)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const s = stateRef.current
      if (s.status !== 'active') return
      const go = (n: number) => {
        if (n < 1 || n > s.pageCount) return
        setError(false)
        setSlide(n).catch(() => setError(true))
      }
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault()
        go(s.slide + 1)
      } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
        e.preventDefault()
        go(s.slide - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSlide])

  // Davomat QR'i vaqt chegarali token bilan har oynada yangilanadi (rasmga olib keyin ishlatib bo'lmasin)
  const sessionId = state.id
  const active = state.status === 'active'
  useEffect(() => {
    if (!active) return
    let stop = false
    let timer: ReturnType<typeof setTimeout>
    const load = async () => {
      try {
        const r = await apiJson<{ url: string; next_in_ms: number }>(
          `/api/sessions/${sessionId}/qr-token`,
        )
        if (stop) return
        setQrUrl(r.url)
        setQrWarn(false)
        timer = setTimeout(load, Math.max(3000, r.next_in_ms - 1500))
      } catch {
        if (stop) return
        setQrWarn(true)
        timer = setTimeout(load, 15_000)
      }
    }
    void load()
    return () => {
      stop = true
      clearTimeout(timer)
    }
  }, [sessionId, active])

  const joinUrl = qrUrl ?? `${siteUrl}/live/${state.code}`
  const host = siteUrl.replace(/^https?:\/\//, '')

  return (
    <div ref={root} className="flex h-screen flex-col bg-black text-white">
      <div className="relative min-h-0 flex-1">
        {pdfUrl ? (
          <PdfViewer url={pdfUrl} page={state.slide} fit="contain" className="size-full" />
        ) : (
          <p className="p-10 text-2xl">{t.lectures.pdfError}</p>
        )}
        <div className="absolute top-3 right-4 rounded-xl bg-black/60 px-4 py-2 text-3xl font-bold tabular-nums">
          {state.slide} / {state.pageCount}
        </div>
        <button
          className="absolute top-3 left-4 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
          onClick={() => root.current?.requestFullscreen?.().catch(() => undefined)}
        >
          {L.fullscreen}
        </button>
        {state.status === 'ended' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-6xl font-bold">{L.ended}</p>
          </div>
        )}
        {qrWarn && (
          <p className="absolute bottom-3 left-4 rounded bg-amber-600 px-3 py-1 text-sm">
            {t.attendance.qrWarn}
          </p>
        )}
        {error && (
          <p role="alert" className="absolute bottom-3 left-4 rounded bg-red-600 px-3 py-1 text-lg">
            {t.app.error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-8 border-t border-white/20 bg-slate-900 px-8 py-4">
        <div className="flex items-center gap-6">
          <QrCode text={joinUrl} size={150} className="rounded-lg p-1" />
          <div>
            <p className="text-2xl text-slate-300">
              {L.joinAt}: <b className="text-white">{host}/live</b>
            </p>
            <p className="text-lg text-slate-400">{L.joinCode}</p>
            <p className="font-mono text-7xl leading-none font-bold tracking-[0.2em]">
              {state.code}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-6xl font-bold tabular-nums">{state.participants}</p>
          <p className="text-xl text-slate-300">{L.participants}</p>
          <p className={`mt-1 text-sm ${connected ? 'text-green-400' : 'text-amber-400'}`}>
            {connected ? L.connected : L.disconnected}
          </p>
        </div>
      </div>
    </div>
  )
}
