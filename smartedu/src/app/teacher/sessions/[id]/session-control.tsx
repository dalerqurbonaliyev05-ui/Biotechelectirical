'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { PdfViewer } from '@/components/pdf-viewer'
import { ClientApiError, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'
import type { SessionState } from '@/lib/session-state'
import { secondsLeft, useCountdown } from '@/lib/use-countdown'
import { LiveExtras } from './live-extras'
import { SessionExtras } from './session-extras'
import { useLiveSession } from '@/lib/use-live-session'
import { useQuestionStats, useRating, useReactions } from '@/lib/use-question-stats'

const L = t.live
const AUTO_CLOSE_AFTER_MS = 1800

/** O'qituvchi boshqaruvi (telefonda ham qulay): slayd, jonli savollar, doska havolasi, darsni tugatish. */
export function SessionControl({
  initial,
  pdfUrl,
  siteUrl,
}: {
  initial: SessionState
  pdfUrl: string
  siteUrl: string
}) {
  const {
    state,
    connected,
    setSlide,
    end,
    openQuestion,
    closeQuestion,
    applyState,
    next,
    focusCall,
    setBreak,
    setPoll,
    signalRefresh,
  } = useLiveSession(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const active = state.status === 'active'
  const question = state.question
  const left = useCountdown(question)
  const stats = useQuestionStats(state.id, question, 3000)
  const reactions = useReactions(state.id, state.slide, active)
  const rating = useRating(state.id, `${question?.id}:${question?.status}:${state.status}`)

  // Doska ochiq bo'lmasa ham vaqt tugagach savol yopiladi
  const autoClosed = useRef<string | null>(null)
  useEffect(() => {
    if (!question || question.status !== 'open' || !active || left === null) return
    if (left < -AUTO_CLOSE_AFTER_MS && autoClosed.current !== question.id) {
      autoClosed.current = question.id
      closeQuestion().catch(() => undefined)
    }
  }, [left, question, active, closeQuestion])

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
  // Joriy slayddan keyin hali so'ralmagan savol bor → "Keyingi" doskani to'xtatadi
  const hasCheckpoint = state.plan.some((p) => p.slide === state.slide && !p.asked)

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
          <Link href={`/teacher/sessions/${state.id}/nb`} className="btn-secondary">
            {t.presence.nbOpen}
          </Link>
          {active && (
            <button className="btn-secondary" disabled={busy} onClick={() => run(focusCall)}>
              👀 {t.presence.focusBtn}
            </button>
          )}
          {active && (
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() => run(() => setBreak(state.onBreak ? 'end' : 'start'))}
            >
              ☕ {state.onBreak ? t.presence.breakEnd : t.presence.breakStart}
            </button>
          )}
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

      {question && (
        <section className="card space-y-3 border-brand-500">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">
                {L.question} · {L.slide} {question.slide}
              </p>
              <p className="font-medium whitespace-pre-wrap">{question.text}</p>
            </div>
            {question.status === 'open' ? (
              <p
                className={`rounded-lg px-3 py-1 font-mono text-2xl font-bold ${secondsLeft(left) <= 5 ? 'bg-red-100 text-red-700' : 'bg-slate-100'}`}
              >
                {left !== null && left <= 0 ? L.timeUp : secondsLeft(left)}
              </p>
            ) : (
              <span className="badge">{t.assessments.status.closed}</span>
            )}
          </div>
          <p className="text-sm">
            <b>{stats?.answered ?? 0}</b> {L.ofTotal}{' '}
            <b>{stats?.participants ?? state.participants}</b> {L.answered}
            {stats?.correct && (
              <>
                {' · '}
                {L.correctAnswer}: <b>{stats.correct.text}</b> · <b>{stats.correct.count}</b>{' '}
                {L.correctShare}
              </>
            )}
          </p>
          {question.status === 'open' && (
            <button className="btn-secondary" disabled={busy} onClick={() => run(closeQuestion)}>
              {L.ctlClose}
            </button>
          )}
        </section>
      )}

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
          {reactions && (
            <span className="text-sm text-slate-600 tabular-nums" data-testid="teacher-reactions">
              👍 {reactions.understood}
              {reactions.confusedEnabled && <> · 🤔 {reactions.confused}</>}
            </span>
          )}
          <button
            className="btn-primary min-w-24 text-lg"
            disabled={
              !active || busy || (state.slide >= state.pageCount && !hasCheckpoint && !question)
            }
            onClick={() => run(() => next(false))}
          >
            {hasCheckpoint || question ? L.nextWithQuestion : L.next} ›
          </button>
          {(hasCheckpoint || question) && (
            <button
              className="btn-secondary text-sm"
              disabled={!active || busy}
              onClick={() => run(() => next(true))}
              title={L.checkpointHint}
            >
              {L.skipCheckpoint}
            </button>
          )}
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

      <section className="card space-y-2">
        <h2 className="font-semibold">{L.ctlQuestions}</h2>
        <p className="text-xs text-slate-500">{L.ctlAutoNote}</p>
        {state.plan.length === 0 ? (
          <p className="text-sm text-slate-500">{L.ctlNoPlan}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {state.plan.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                <button
                  className="badge hover:bg-brand-100"
                  disabled={!active || busy}
                  onClick={() => go(p.slide)}
                >
                  {p.slide}
                </button>
                <span className="min-w-0 flex-1 truncate">{p.text}</span>
                {p.slide === state.slide && (
                  <span className="badge bg-brand-100 text-brand-700">{L.ctlNow}</span>
                )}
                {p.asked ? (
                  <span className="text-xs text-slate-400">{L.ctlAsked} ✓</span>
                ) : (
                  <button
                    className="btn-secondary min-h-9 px-3 py-1"
                    disabled={!active || busy}
                    onClick={() => run(() => openQuestion(p.id))}
                  >
                    {L.ctlOpen}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <LiveExtras state={state} onPoll={setPoll} onSignal={signalRefresh} />
      <SessionExtras state={state} onState={applyState} />

      {rating && rating.top.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-semibold">
            {L.rating} · {L.ctlTop}
          </h2>
          <ol className="space-y-1 text-sm">
            {rating.top.slice(0, 5).map((r) => (
              <li key={r.studentId} className="flex gap-3">
                <span className="w-8 text-center">{r.medal ? L.medals[r.medal] : r.rank}</span>
                <span className="flex-1">{r.name}</span>
                <b className="tabular-nums">{r.points}</b>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
