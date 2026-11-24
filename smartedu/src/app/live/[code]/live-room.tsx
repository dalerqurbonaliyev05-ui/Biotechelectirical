'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'
import type { LiveQuestionView } from '@/lib/live-question'
import { parseStateEvent, sessionChannel } from '@/lib/session-state'
import { createClient } from '@/lib/supabase/browser'
import { secondsLeft, useCountdown } from '@/lib/use-countdown'

const L = t.liveStudent
const LETTERS = 'ABCDEFGH'

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

interface LiveView {
  slide: number
  status: 'active' | 'ended'
  rev: number
  page_count: number
  question: LiveQuestionView | null
  mine: {
    answered: boolean
    isCorrect?: boolean
    points?: number
    bonus?: number
    total?: number
  } | null
  correctText: string | null
  me: { points: number; rank: number; of: number; medal: string | null } | null
}

/** Talaba telefoni: qo'shilish, slayd raqami, jonli savollarga javob, natija va reyting. */
export function LiveRoom({ code, qrToken }: { code: string; qrToken?: string }) {
  const [phase, setPhase] = useState<'joining' | 'joined' | 'error' | 'replaced'>('joining')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<Joined | null>(null)
  const [view, setView] = useState<LiveView | null>(null)
  const [connected, setConnected] = useState(false)
  const started = useRef(false)
  const revRef = useRef(0)
  const hasQuestion = useRef(false)

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
      setView(null)
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

  const refresh = useCallback(async () => {
    if (!info) return
    try {
      const v = await apiJson<LiveView>(`/api/live/${info.session_id}/question`, {
        headers: { 'x-join-token': info.join_token },
      })
      if (v.rev >= revRef.current) {
        revRef.current = v.rev
        hasQuestion.current = Boolean(v.question)
        setView(v)
      }
    } catch (err) {
      if (err instanceof ClientApiError && err.code === 'token_replaced') setPhase('replaced')
    }
  }, [info])

  useEffect(() => {
    if (!info) return
    void refresh()
    const sb = createClient()
    const ch = sb
      .channel(sessionChannel(info.session_id), { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        const ev = parseStateEvent(payload)
        if (!ev || ev.rev <= revRef.current) return
        // Hodisa ishonchsiz: qiymatni qabul qilmaymiz, faqat "yangilanish bor" signali sifatida serverdan so'raymiz.
        // Savol yo'q va slayd oddiy almashayotgan bo'lsa so'rov yubormaymiz (bepul tarif tejamkorligi).
        if (ev.q || hasQuestion.current || ev.status === 'ended') void refresh()
        else setView((v) => (v ? { ...v, slide: ev.slide, rev: ev.rev } : v))
        if (!(ev.q || hasQuestion.current || ev.status === 'ended')) revRef.current = ev.rev
      })
      .subscribe((st) => setConnected(st === 'SUBSCRIBED'))
    // Realtime uzilganda zaxira: har 5 s da so'rov (ulangan bo'lsa yubormaymiz)
    const poll = setInterval(() => {
      if (ch.state !== 'joined') void refresh()
    }, 5_000)
    return () => {
      clearInterval(poll)
      void sb.removeChannel(ch)
    }
  }, [info, refresh])

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

  const ended = view?.status === 'ended'
  const q = view?.question ?? null

  return (
    <div className="mx-auto max-w-md space-y-4 pb-10">
      <div className="card space-y-1 text-center">
        <p className="text-sm text-green-700">✓ {L.joined}</p>
        <h1 className="text-lg font-bold">{info?.title}</h1>
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

      {ended ? (
        <FinalCard view={view} />
      ) : q && info ? (
        <QuestionCard
          key={q.id}
          q={q}
          view={view}
          info={info}
          onAnswered={refresh}
          onReplaced={() => setPhase('replaced')}
        />
      ) : (
        <div className="card space-y-1 text-center">
          <p className="text-sm text-slate-500">{L.slide}</p>
          <p className="text-5xl font-bold tabular-nums">
            {view?.slide ?? info?.slide}
            <span className="text-xl text-slate-400">
              {' '}
              / {view?.page_count ?? info?.page_count}
            </span>
          </p>
          <p className="pt-2 text-slate-600">{L.waiting}</p>
          {view?.me && <RankLine me={view.me} />}
        </div>
      )}
      <p className={`text-center text-xs ${connected ? 'text-green-700' : 'text-slate-400'}`}>
        {L.connection}: {connected ? L.liveOn : L.liveOff}
      </p>
    </div>
  )
}

function RankLine({ me }: { me: NonNullable<LiveView['me']> }) {
  return (
    <p className="pt-2 text-sm">
      {L.yourRank}:{' '}
      <b>
        {me.medal ? t.live.medals[me.medal] : ''} {me.rank}
      </b>{' '}
      / {me.of} · {L.totalPoints}: <b>{me.points}</b>
    </p>
  )
}

function FinalCard({ view }: { view: LiveView | null }) {
  const me = view?.me
  return (
    <div className="card space-y-2 text-center">
      <p className="text-lg font-semibold">{L.finalTitle}</p>
      {me ? (
        <>
          <p className="text-6xl">{me.medal ? t.live.medals[me.medal] : '🏁'}</p>
          <p>
            {L.yourPlace}: <b className="text-2xl">{me.rank}</b> / {me.of}
          </p>
          <p>
            {L.totalPoints}: <b>{me.points}</b>
          </p>
        </>
      ) : (
        <p className="text-slate-600">{L.ended}</p>
      )}
    </div>
  )
}

function QuestionCard({
  q,
  view,
  info,
  onAnswered,
  onReplaced,
}: {
  q: LiveQuestionView
  view: LiveView | null
  info: Joined
  onAnswered: () => Promise<void>
  onReplaced: () => void
}) {
  const left = useCountdown(q)
  const open = q.status === 'open'
  const [picked, setPicked] = useState<string[]>([])
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState(q.defaultUnit ?? '')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const answered = sent || Boolean(view?.mine?.answered)
  const expired = left !== null && left <= 0
  const canAnswer = open && !answered && !expired && !busy

  async function send(response: unknown) {
    if (!canAnswer) return
    setBusy(true)
    setNote(null)
    try {
      const r = await apiJson<{ accepted: boolean; status?: string; late?: boolean }>(
        '/api/live/answer',
        { method: 'POST', json: { session_question_id: q.id, token: info.join_token, response } },
      )
      if (r.accepted) {
        setSent(true)
        if (r.late) setNote(L.late)
      } else if (r.status === 'duplicate') setSent(true)
      else setNote(L.statuses[r.status ?? ''] ?? errorText(undefined))
    } catch (err) {
      if (err instanceof ClientApiError && err.code === 'token_replaced') return onReplaced()
      setNote(errorText(err instanceof ClientApiError ? err.code : undefined))
    } finally {
      setBusy(false)
      void onAnswered()
    }
  }

  const mine = view?.mine
  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-slate-500">{L.question}</p>
        {open && (
          <p
            className={`rounded-lg px-3 py-1 font-mono text-2xl font-bold tabular-nums ${secondsLeft(left) <= 5 ? 'bg-red-100 text-red-700' : 'bg-slate-100'}`}
          >
            {expired ? L.timeUp : `${secondsLeft(left)}${L.secondsShort}`}
          </p>
        )}
      </div>
      <p className="text-lg font-medium whitespace-pre-wrap">{q.text}</p>

      {q.type === 'mcq' && (
        <div className="space-y-2">
          {q.options?.map((o, i) => {
            const on = picked.includes(o.id)
            return (
              <button
                key={o.id}
                disabled={!canAnswer}
                onClick={() => {
                  if (q.multiple)
                    setPicked(on ? picked.filter((x) => x !== o.id) : [...picked, o.id])
                  else void send({ selected: [o.id] }) // bitta javobli: bosish = yuborish (tezlik bonusi)
                }}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-2 p-3 text-left text-lg transition ${on ? 'border-brand-600 bg-brand-50' : 'border-slate-300 bg-white'} disabled:opacity-60`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold">
                  {LETTERS[i]}
                </span>
                {o.text}
              </button>
            )
          })}
          {q.multiple && (
            <button
              className="btn-primary w-full"
              disabled={!canAnswer || picked.length === 0}
              onClick={() => void send({ selected: picked })}
            >
              {L.send}
            </button>
          )}
        </div>
      )}

      {q.type === 'numeric' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (value.trim()) void send({ value, unit: unit || undefined })
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              className="input text-xl"
              inputMode="decimal"
              autoComplete="off"
              placeholder={L.numberPlaceholder}
              value={value}
              disabled={!canAnswer}
              onChange={(e) => setValue(e.target.value)}
            />
            {q.unitChoices && (
              <select
                className="input w-28"
                value={unit}
                disabled={!canAnswer}
                aria-label={t.attempt.unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                {q.unitChoices.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button className="btn-primary w-full" disabled={!canAnswer || !value.trim()}>
            {L.send}
          </button>
        </form>
      )}

      {note && (
        <p role="status" className="text-sm text-amber-800">
          {note}
        </p>
      )}
      {open && answered && (
        <p className="rounded-lg bg-green-50 p-3 text-center text-green-800">
          {L.sent} {L.sentWait}
        </p>
      )}
      {open && !answered && expired && <p className="text-center text-slate-600">{L.timeUp}</p>}

      {!open && (
        <div
          className={`space-y-1 rounded-xl p-4 text-center ${mine?.answered ? (mine.isCorrect ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900') : 'bg-slate-100 text-slate-700'}`}
        >
          <p className="text-xl font-bold">
            {mine?.answered ? (mine.isCorrect ? `✓ ${L.correct}` : `✗ ${L.wrong}`) : L.noAnswer}
          </p>
          {mine?.answered && (
            <p className="text-sm">
              {L.youGot}: <b>+{mine.total}</b>
              {Number(mine.bonus) > 0 && (
                <>
                  {' '}
                  ({L.bonusShort}: +{mine.bonus})
                </>
              )}
            </p>
          )}
          {view?.correctText && (
            <p className="text-sm">
              {L.correctWas}: <b>{view.correctText}</b>
            </p>
          )}
          {view?.me && <RankLine me={view.me} />}
        </div>
      )}
    </div>
  )
}
