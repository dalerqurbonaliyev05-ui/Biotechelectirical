'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'
import { parseStateEvent, sessionChannel } from '@/lib/session-state'
import { createClient } from '@/lib/supabase/browser'

const L = t.liveStudent

interface Joined {
  session_id: string
  mode: 'auditorium' | 'remote'
  rejoin: number
  qr_rejected: boolean
  join_token: string
  title: string
  slide: number
  page_count: number
  rev: number
}

/** Talaba telefoni: qo'shilish, slayd raqami, (8-bosqichda) savollar. */
export function LiveRoom({ code, qrToken }: { code: string; qrToken?: string }) {
  const [phase, setPhase] = useState<'joining' | 'joined' | 'error' | 'ended' | 'replaced'>(
    'joining',
  )
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<Joined | null>(null)
  const [slide, setSlide] = useState(1)
  const [connected, setConnected] = useState(false)
  const started = useRef(false)
  const revRef = useRef(0)

  async function join() {
    setPhase('joining')
    setError(null)
    try {
      const j = await apiJson<Joined>('/api/live/join', {
        method: 'POST',
        json: { code, token: qrToken },
      })
      revRef.current = j.rev
      setInfo(j)
      setSlide(j.slide)
      setPhase('joined')
      try {
        localStorage.setItem(`smartedu:live:${j.session_id}`, j.join_token)
      } catch {
        /* ixtiyoriy */
      }
    } catch (err) {
      const c = err instanceof ClientApiError ? err.code : undefined
      setError(c === 'forbidden' ? L.notYourGroup : errorText(c))
      setPhase('error')
    }
  }

  // React StrictMode (dev) effektni ikki marta ishga tushiradi: ikkinchi qo'shilish tokenni almashtirib yuborardi
  useEffect(() => {
    if (started.current) return
    started.current = true
    void join()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!info) return
    const sb = createClient()
    const refresh = async () => {
      try {
        const s = await apiJson<{ slide: number; status: string; rev: number }>(
          `/api/live/${info.session_id}/state`,
          { headers: { 'x-join-token': info.join_token } },
        )
        if (s.rev >= revRef.current) {
          revRef.current = s.rev
          setSlide(s.slide)
        }
        if (s.status === 'ended') setPhase('ended')
      } catch (err) {
        if (err instanceof ClientApiError && err.code === 'token_replaced') setPhase('replaced')
      }
    }
    const ch = sb
      .channel(sessionChannel(info.session_id), { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        const ev = parseStateEvent(payload)
        if (!ev || ev.rev <= revRef.current) return
        revRef.current = ev.rev
        setSlide(ev.slide) // faqat ko'rsatish uchun; muhim holat serverdan tekshiriladi
        if (ev.status === 'ended') void refresh()
      })
      .subscribe((st) => setConnected(st === 'SUBSCRIBED'))
    // Realtime uzilganda zaxira: har 10 s da so'rov (ulangan bo'lsa so'rov yubormaymiz — bepul tarif limitlari)
    const poll = setInterval(() => {
      if (!ch.state || ch.state !== 'joined') void refresh()
    }, 10_000)
    return () => {
      clearInterval(poll)
      void sb.removeChannel(ch)
    }
  }, [info])

  if (phase === 'joining') return <p className="py-10 text-center text-slate-600">{L.joining}</p>

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </p>
        <div className="flex justify-center gap-2">
          <button
            className="btn-primary"
            onClick={() => {
              started.current = true
              void join()
            }}
          >
            {L.rejoin}
          </button>
          <Link href="/live" className="btn-secondary">
            {L.enterCode}
          </Link>
        </div>
      </div>
    )
  }

  if (phase === 'replaced') {
    return (
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <p role="alert" className="rounded-lg bg-amber-50 p-4 text-amber-900">
          {L.replaced}
        </p>
        <button className="btn-primary" onClick={() => void join()}>
          {L.rejoin}
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card space-y-2 text-center">
        <p className="text-sm text-green-700">✓ {L.joined}</p>
        <h1 className="text-xl font-bold">{info?.title}</h1>
        <p>
          <span className="badge">
            {info?.mode === 'auditorium' ? L.modeAuditorium : L.modeRemote}
          </span>
        </p>
        {info?.qr_rejected && (
          <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{L.qrRejected}</p>
        )}
        {info && info.rejoin > 0 && <p className="text-xs text-slate-500">{L.rejoined}</p>}
      </div>
      {phase === 'ended' ? (
        <p className="card text-center font-medium">{L.ended}</p>
      ) : (
        <div className="card space-y-1 text-center">
          <p className="text-sm text-slate-500">{L.slide}</p>
          <p className="text-5xl font-bold tabular-nums">
            {slide}
            <span className="text-xl text-slate-400"> / {info?.page_count}</span>
          </p>
          <p className="pt-2 text-slate-600">{L.waiting}</p>
        </div>
      )}
      <p className={`text-center text-xs ${connected ? 'text-green-700' : 'text-slate-400'}`}>
        {L.connection}: {connected ? L.liveOn : L.liveOff}
      </p>
    </div>
  )
}
