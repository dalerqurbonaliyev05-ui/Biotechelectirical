'use client'

import type { RealtimeChannel } from '@supabase/supabase-js'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnnotationLayer } from '@/components/annotation-layer'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import type { AnnotationItem } from '@/lib/annotations'
import { t } from '@/lib/i18n'
import type { LiveQuestionView } from '@/lib/live-question'
import {
  REACTION_FLUSH_MS,
  addTap,
  emptyBatch,
  isEmpty,
  type ReactionBatch,
  type ReactionKind,
} from '@/lib/reactions'
import { parseStateEvent, sessionChannel, type PollState } from '@/lib/session-state'
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
  confused_enabled?: boolean
  focus_seq?: number
  on_break?: boolean
  share_annotations?: boolean
  poll?: PollState | null
  myVote?: string | null
  isTarget?: boolean
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
export function LiveRoom({
  code,
  qrToken,
  kind,
}: {
  code: string
  qrToken?: string
  kind: 'student' | 'visitor' | 'staff'
}) {
  const [phase, setPhase] = useState<'intro' | 'joining' | 'joined' | 'error' | 'replaced'>('intro')
  const [guestName, setGuestName] = useState('')
  const [guestGroup, setGuestGroup] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<Joined | null>(null)
  const [view, setView] = useState<LiveView | null>(null)
  const [connected, setConnected] = useState(false)
  const started = useRef(false)
  const revRef = useRef(0)
  const hasQuestion = useRef(false)
  const chRef = useRef<RealtimeChannel | null>(null)
  const focusBase = useRef<number | null>(null)
  const [focusOn, setFocusOn] = useState(false)
  const [onBreak, setOnBreak] = useState(false)
  const [annotTick, setAnnotTick] = useState(0)

  // "Doskaga qarang": hisoblagich oshsa — to'liq ekranli chaqiruv (birinchi qiymat faqat boshlang'ich sifatida olinadi)
  const noteFocus = useCallback((seq: number | undefined) => {
    if (seq === undefined) return
    if (focusBase.current === null) focusBase.current = seq
    else if (seq > focusBase.current) {
      focusBase.current = seq
      setFocusOn(true)
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([200, 100, 200])
    }
  }, [])

  async function join() {
    setPhase('joining')
    setError(null)
    try {
      if (kind === 'visitor') {
        // Mehmon: Supabase anonim kirishi (faqat shu sessiya uchun cheklangan identifikator)
        const sb = createClient()
        const { data: u } = await sb.auth.getUser()
        if (!u.user) {
          const { error: aErr } = await sb.auth.signInAnonymously()
          if (aErr) throw new ClientApiError('internal', 500)
        }
      }
      const j = await apiJson<Joined>('/api/live/join', {
        method: 'POST',
        json: {
          code,
          token: qrToken,
          ...(kind === 'visitor'
            ? { guest: { name: guestName, group: guestGroup || undefined } }
            : {}),
        },
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

  // Qo'shilish tugma bosilganda (qoida matni ko'rsatilgach); ikki marta bosish tokenni almashtirib yubormasin
  function accept() {
    if (started.current) return
    started.current = true
    void join()
  }

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
        setOnBreak(Boolean(v.on_break))
        noteFocus(v.focus_seq)
      }
    } catch (err) {
      if (err instanceof ClientApiError && err.code === 'token_replaced') setPhase('replaced')
    }
  }, [info, noteFocus])

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
      .on('broadcast', { event: 'focus' }, () => void refresh()) // signal: haqiqiy holat serverdan olinadi
      .on('broadcast', { event: 'annot' }, () => setAnnotTick((n) => n + 1)) // signal: izohlar serverdan olinadi
      .subscribe((st) => setConnected(st === 'SUBSCRIBED'))
    chRef.current = ch
    // Realtime uzilganda zaxira: har 5 s da so'rov (ulangan bo'lsa yubormaymiz)
    const poll = setInterval(() => {
      if (ch.state !== 'joined') void refresh()
    }, 5_000)
    return () => {
      clearInterval(poll)
      chRef.current = null
      void sb.removeChannel(ch)
    }
  }, [info, refresh])

  if (phase === 'intro') {
    if (kind === 'staff') return <p className="card text-center text-slate-600">{L.staffNote}</p>
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-bold">{t.guests.noticeTitle}</h1>
        <p className="card text-sm text-slate-700">{t.guests.notice}</p>
        {kind === 'visitor' && (
          <div className="card space-y-3">
            <p className="font-medium">{t.guests.guestIntro}</p>
            <div>
              <label className="label" htmlFor="g-name">
                {t.guests.guestName}
              </label>
              <input
                id="g-name"
                className="input"
                value={guestName}
                maxLength={60}
                onChange={(e) => setGuestName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div>
              <label className="label" htmlFor="g-group">
                {t.guests.guestGroup}
              </label>
              <input
                id="g-group"
                className="input"
                value={guestGroup}
                maxLength={60}
                onChange={(e) => setGuestGroup(e.target.value)}
              />
            </div>
            <p className="text-xs text-slate-500">{t.guests.guestNote}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-primary"
            disabled={kind === 'visitor' && guestName.trim().length < 2}
            onClick={accept}
          >
            {t.guests.accept}
          </button>
          {kind === 'visitor' && (
            <Link href={`/login?next=/live/${code}`} className="btn-secondary">
              {t.guests.loginInstead}
            </Link>
          )}
        </div>
      </div>
    )
  }

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

      {focusOn && <FocusOverlay onClose={() => setFocusOn(false)} />}
      {info && !ended && (
        <PresenceAgent
          info={info}
          onState={(r) => {
            noteFocus(r.focusSeq)
            setOnBreak(r.onBreak)
            if (r.ended) void refresh()
          }}
          onReplaced={() => setPhase('replaced')}
        />
      )}

      {ended ? (
        <FinalCard view={view} />
      ) : onBreak ? (
        <div className="card space-y-1 text-center">
          <p className="text-5xl">☕</p>
          <p className="text-xl font-semibold">{t.presence.breakTitle}</p>
          <p className="text-sm text-slate-600">{t.presence.breakNote}</p>
        </div>
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
      {!ended && !onBreak && info && view?.poll?.status === 'open' && !q && (
        <PollCard info={info} poll={view.poll} myVote={view.myVote ?? null} onVoted={refresh} />
      )}
      {!ended && !onBreak && info && view?.share_annotations && !q && (
        <SharedAnnotations info={info} slide={view.slide} tick={annotTick} />
      )}
      {!ended && info && view && <AskBox info={info} />}
      {!ended && info && view && (
        <ReactionBar
          info={info}
          slide={view.slide}
          confusedEnabled={view.confused_enabled !== false}
          onTap={(kind) =>
            // Doskaga darhol animatsiya uchun signal (ishonchsiz: hisob serverda, paket bilan yoziladi)
            void chRef.current?.send({ type: 'broadcast', event: 'reaction', payload: { kind } })
          }
          onReplaced={() => setPhase('replaced')}
        />
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
  const notTarget = Boolean(q.targeted) && view?.isTarget === false
  const canAnswer = open && !answered && !expired && !busy && !notTarget

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
      {q.targeted && (
        <p
          role="status"
          className={`rounded-lg p-2 text-sm ${notTarget ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-900'}`}
        >
          ⭐ {notTarget ? t.reactions.bonusTargetOther : t.reactions.bonusTargetYou}
        </p>
      )}
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

/**
 * "Tushundim" / "Tushunmadim": bosishlar telefonda yig'iladi va ~5 s da bir paket bo'lib serverga yuboriladi.
 * Doskaga animatsiya uchun har bosishda darhol signal ketadi. Yuborilmasa paket saqlanib, keyingi urinishda qayta yuboriladi.
 */
function ReactionBar({
  info,
  slide,
  confusedEnabled,
  onTap,
  onReplaced,
}: {
  info: Joined
  slide: number
  confusedEnabled: boolean
  onTap: (kind: ReactionKind) => void
  onReplaced: () => void
}) {
  const batch = useRef<ReactionBatch>(emptyBatch())
  const batchSlide = useRef(slide)
  const [flash, setFlash] = useState<ReactionKind | null>(null)
  const [failed, setFailed] = useState(false)

  const flush = useCallback(async () => {
    const b = batch.current
    if (isEmpty(b)) return
    const sendSlide = batchSlide.current
    batch.current = { ...emptyBatch(), lastTap: b.lastTap }
    try {
      await apiJson(`/api/live/${info.session_id}/reaction`, {
        method: 'POST',
        json: {
          token: info.join_token,
          slide: sendSlide,
          understood: b.understood,
          confused: b.confused,
        },
      })
      setFailed(false)
    } catch (err) {
      if (err instanceof ClientApiError && err.code === 'token_replaced') return onReplaced()
      // Vaqtinchalik xato: paketni qaytaramiz (chegara ichida), keyingi oynada qayta uriniladi
      if (!(
        err instanceof ClientApiError &&
        ['blocked', 'session_ended', 'not_joined'].includes(err.code ?? '')
      )) {
        const cur = batch.current
        batch.current = {
          ...cur,
          understood: Math.min(5, cur.understood + b.understood),
          confused: Math.min(5, cur.confused + b.confused),
        }
        setFailed(true)
      }
    }
  }, [info.session_id, info.join_token, onReplaced])

  useEffect(() => {
    const timer = setInterval(() => void flush(), REACTION_FLUSH_MS)
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onHide)
      void flush()
    }
  }, [flush])

  // Slayd almashsa, eski slayddagi reaksiyalar o'sha slaydga yoziladi (avval yuboramiz)
  useEffect(() => {
    if (batchSlide.current !== slide) {
      void flush().finally(() => {
        batchSlide.current = slide
      })
    }
  }, [slide, flush])

  function tap(kind: ReactionKind) {
    const r = addTap(batch.current, kind, Date.now())
    if (!r.accepted) return
    batch.current = r.batch
    onTap(kind)
    setFlash(kind)
    setTimeout(() => setFlash((f) => (f === kind ? null : f)), 600)
    if (navigator.vibrate) navigator.vibrate(15)
  }

  return (
    <div className="card space-y-2">
      <p className="text-center text-xs text-slate-500">{t.reactions.title}</p>
      <div className={`grid gap-2 ${confusedEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <button
          onClick={() => tap('understood')}
          className={`min-h-14 rounded-xl border-2 p-3 text-lg font-medium transition ${flash === 'understood' ? 'border-green-600 bg-green-100' : 'border-slate-300 bg-white'}`}
        >
          👍 {t.reactions.understood}
        </button>
        {confusedEnabled && (
          <button
            onClick={() => tap('confused')}
            className={`min-h-14 rounded-xl border-2 p-3 text-lg font-medium transition ${flash === 'confused' ? 'border-amber-600 bg-amber-100' : 'border-slate-300 bg-white'}`}
          >
            🤔 {t.reactions.confused}
          </button>
        )}
      </div>
      <p className="text-center text-xs text-slate-400">
        {failed ? t.reactions.retry : t.reactions.hint}
      </p>
    </div>
  )
}

/** "Doskaga qarang!": xira to'liq ekranli chaqiruv (bosib yopiladi, 8 s dan keyin o'zi yopiladi). */
function FocusOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const id = setTimeout(onClose, 8000)
    return () => clearTimeout(id)
  }, [onClose])
  return (
    <button
      type="button"
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 p-6 text-center text-white"
      aria-live="assertive"
    >
      <span className="text-7xl">👀</span>
      <span className="text-3xl font-bold">{t.presence.focusTitle}</span>
      <span className="text-sm text-slate-300">{t.presence.focusDismiss}</span>
    </button>
  )
}

/**
 * Heartbeat (~20 s) va ekran o'chib qolmasligi (Wake Lock). Brauzer imkoniyatlari bo'lmasa jim o'tadi:
 * Wake Lock yo'q bo'lsa ham dars ishlaydi (faqat ekran o'zi o'chishi mumkin); vibratsiya ham ixtiyoriy.
 */
function PresenceAgent({
  info,
  onState,
  onReplaced,
}: {
  info: Joined
  onState: (r: { focusSeq: number; onBreak: boolean; ended: boolean }) => void
  onReplaced: () => void
}) {
  const onStateRef = useRef(onState)
  onStateRef.current = onState
  const onReplacedRef = useRef(onReplaced)
  onReplacedRef.current = onReplaced

  useEffect(() => {
    let stop = false
    const ping = async () => {
      try {
        const r = await apiJson<{ focusSeq: number; onBreak: boolean; ended: boolean }>(
          `/api/live/${info.session_id}/presence`,
          {
            method: 'POST',
            json: { token: info.join_token, visible: document.visibilityState === 'visible' },
          },
        )
        if (!stop) onStateRef.current(r)
      } catch (err) {
        if (err instanceof ClientApiError && err.code === 'token_replaced') onReplacedRef.current()
        // boshqa xatolar: keyingi urinishda (heartbeat bo'lmasa vaqt shunchaki hisoblanmaydi)
      }
    }
    void ping()
    const timer = setInterval(() => void ping(), 20_000)
    const onVis = () => void ping() // ko'rinish o'zgarishi darhol qayd qilinadi
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [info.session_id, info.join_token])

  // Wake Lock: qo'llab-quvvatlanmasa yoki rad etilsa — e'tiborsiz
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    let stop = false
    const acquire = async () => {
      try {
        const wl = (
          navigator as unknown as {
            wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> }
          }
        ).wakeLock
        if (!wl || document.visibilityState !== 'visible') return
        const l = await wl.request('screen')
        if (stop) void l.release()
        else lock = l
      } catch {
        /* qo'llab-quvvatlanmaydi / batareya tejash rejimi */
      }
    }
    void acquire()
    const onVis = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop = true
      document.removeEventListener('visibilitychange', onVis)
      void lock?.release().catch(() => undefined)
    }
  }, [])

  return null
}

/** O'qituvchi ruxsat bergan bo'lsa: joriy slayd miniaturasi va izohlar (faqat ko'rish). Ma'lumot serverdan olinadi. */
function SharedAnnotations({ info, slide, tick }: { info: Joined; slide: number; tick: number }) {
  const [data, setData] = useState<{ thumbUrl: string | null; items: AnnotationItem[] } | null>(
    null,
  )
  useEffect(() => {
    let live = true
    apiJson<{ shared: boolean; thumbUrl?: string | null; items?: AnnotationItem[] }>(
      `/api/live/${info.session_id}/annotations?slide=${slide}`,
      { headers: { 'x-join-token': info.join_token } },
    )
      .then((r) => {
        if (live) setData(r.shared ? { thumbUrl: r.thumbUrl ?? null, items: r.items ?? [] } : null)
      })
      .catch(() => live && setData(null))
    return () => {
      live = false
    }
  }, [info.session_id, info.join_token, slide, tick])
  if (!data || (!data.thumbUrl && data.items.length === 0)) return null
  return (
    <div className="card space-y-2">
      <p className="text-xs text-slate-500">{t.annot.shared}</p>
      <div className="relative overflow-hidden rounded-lg bg-slate-900 leading-[0]">
        {data.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.thumbUrl} alt="" className="w-full" />
        ) : (
          <div className="aspect-video" />
        )}
        <AnnotationLayer items={data.items} />
      </div>
    </div>
  )
}

/** Tezkor so'rov: bitta ovoz; ovoz berilgach natija ko'rsatiladi (umumiy sonlar). */
function PollCard({
  info,
  poll,
  myVote,
  onVoted,
}: {
  info: Joined
  poll: PollState
  myVote: string | null
  onVoted: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  async function vote(optionId: string) {
    setBusy(true)
    setNote(null)
    try {
      await apiJson(`/api/live/${info.session_id}/poll`, {
        method: 'POST',
        json: { token: info.join_token, poll_id: poll.id, option_id: optionId },
      })
      await onVoted()
    } catch (err) {
      setNote(errorText(err instanceof ClientApiError ? err.code : undefined))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="card space-y-3">
      <p className="text-xs text-slate-500">📊 {t.extras.pollTitle}</p>
      <p className="text-lg font-medium">{poll.body}</p>
      <div className="space-y-2">
        {poll.options.map((o) => (
          <button
            key={o.id}
            disabled={busy || myVote !== null}
            onClick={() => void vote(o.id)}
            className={`flex min-h-12 w-full items-center justify-between rounded-xl border-2 p-3 text-left text-lg ${myVote === o.id ? 'border-brand-600 bg-brand-50' : 'border-slate-300 bg-white'} disabled:opacity-70`}
          >
            <span>{o.text}</span>
            {myVote !== null && <span className="text-sm tabular-nums">{o.pct}%</span>}
          </button>
        ))}
      </div>
      {myVote !== null && <p className="text-sm text-green-700">✓ {t.extras.pollVoted}</p>}
      {note && <p className="text-sm text-amber-800">{note}</p>}
    </div>
  )
}

/** Anonim savol qutisi: savol yozish (standart anonim) va boshqalarning savoliga "men ham" ovozi. */
function AskBox({ info }: { info: Joined }) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [anon, setAnon] = useState(true)
  const [asks, setAsks] = useState<
    { id: string; body: string; votes: number; mine?: boolean; iVoted?: boolean }[]
  >([])
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(
    () =>
      apiJson<{ asks: typeof asks }>(`/api/live/${info.session_id}/asks`, {
        headers: { 'x-join-token': info.join_token },
      })
        .then((r) => setAsks(r.asks))
        .catch(() => undefined),
    [info.session_id, info.join_token],
  )
  useEffect(() => {
    if (!open) return
    void load()
    const id = setInterval(load, 15_000)
    return () => clearInterval(id)
  }, [open, load])

  async function send() {
    if (body.trim().length < 3) return
    setBusy(true)
    setNote(null)
    try {
      await apiJson(`/api/live/${info.session_id}/asks`, {
        method: 'POST',
        json: { token: info.join_token, body, anonymous: anon },
      })
      setBody('')
      setNote(t.extras.askSent)
      await load()
    } catch (err) {
      setNote(errorText(err instanceof ClientApiError ? err.code : undefined))
    } finally {
      setBusy(false)
    }
  }
  async function vote(id: string) {
    try {
      await apiJson(`/api/live/${info.session_id}/asks`, {
        method: 'PUT',
        json: { token: info.join_token, ask_id: id },
      })
      await load()
    } catch {
      /* keyingi yangilanishda */
    }
  }

  return (
    <div className="card space-y-2">
      <button className="w-full text-left text-sm font-medium" onClick={() => setOpen((v) => !v)}>
        ❓ {t.extras.askBox} {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="space-y-2">
          <textarea
            className="input min-h-20"
            maxLength={300}
            placeholder={t.extras.askPlaceholder}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
            {t.extras.askAnon}
          </label>
          <button
            className="btn-primary w-full"
            disabled={busy || body.trim().length < 3}
            onClick={() => void send()}
          >
            {t.extras.askSend}
          </button>
          {note && <p className="text-sm text-amber-800">{note}</p>}
          <ul className="space-y-2">
            {asks.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-2 rounded-lg border p-2 text-sm"
              >
                <span>
                  {a.body} {a.mine && <span className="badge">{t.extras.askMine}</span>}
                </span>
                <button
                  className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs disabled:opacity-60"
                  disabled={a.iVoted}
                  onClick={() => void vote(a.id)}
                  title={t.extras.askMe2}
                >
                  👍 {a.votes}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
