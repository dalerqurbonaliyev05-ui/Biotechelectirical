'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'
import type { StudentQuestion } from '@/lib/assessment/dto'
import type { AttemptState } from '@/lib/server/assessments'

const A = t.attempt

type Resp = Record<string, unknown>
type SaveState = 'saved' | 'saving' | 'offline' | 'error'

interface Props {
  assessment: {
    id: string
    title: string
    description: string | null
    duration_minutes: number
    opens_at: string
    closes_at: string
  }
  initialState: AttemptState | null
  labBaseUrl: string
}

const storageKey = (attemptId: string) => `smartedu:attempt:${attemptId}`

function isAnswered(q: StudentQuestion, r: unknown): boolean {
  const x = r as Resp | undefined
  if (!x) return false
  if (q.type === 'mcq') return Array.isArray(x.selected) && x.selected.length > 0
  if (q.type === 'numeric') return String(x.value ?? '').trim() !== ''
  if (q.type === 'short_text') return String(x.text ?? '').trim() !== ''
  return false
}

export function AttemptRunner({ assessment, initialState, labBaseUrl }: Props) {
  const [state, setState] = useState<AttemptState | null>(initialState)
  const [phase, setPhase] = useState<'intro' | 'running' | 'done'>(
    initialState ? (initialState.attempt.status === 'in_progress' ? 'running' : 'done') : 'intro',
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [timeUp, setTimeUp] = useState(false)

  async function start() {
    setBusy(true)
    setError(null)
    try {
      const { attempt_id } = await apiJson<{ attempt_id: string }>(
        `/api/assessments/${assessment.id}/start`,
        { method: 'POST' },
      )
      const st = await apiJson<AttemptState>(`/api/attempts/${attempt_id}`)
      setState(st)
      setPhase(st.attempt.status === 'in_progress' ? 'running' : 'done')
    } catch (err) {
      const code = err instanceof ClientApiError ? err.code : undefined
      setError((code && A.errors[code]) || errorText(code))
    } finally {
      setBusy(false)
    }
  }

  if (phase === 'intro' || !state) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-bold">{assessment.title}</h1>
        {assessment.description && <p className="text-slate-600">{assessment.description}</p>}
        <p className="text-sm">
          {A.duration}:{' '}
          <b>
            {assessment.duration_minutes} {A.minutes}
          </b>
        </p>
        <div className="card">
          <p className="mb-2 font-medium">{A.introRules}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {A.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button className="btn-primary w-full sm:w-auto" onClick={start} disabled={busy}>
          {busy ? t.app.loading : A.start}
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="text-2xl font-bold">{A.doneTitle}</h1>
        <p className="text-slate-600">{timeUp ? A.timeUp : A.doneAwaiting}</p>
        <Link href="/student" className="btn-primary">
          {A.toHome}
        </Link>
      </div>
    )
  }

  return (
    <Running
      state={state}
      labBaseUrl={labBaseUrl}
      onFinished={(byTimer) => {
        setTimeUp(byTimer)
        setPhase('done')
      }}
    />
  )
}

function Running({
  state,
  labBaseUrl,
  onFinished,
}: {
  state: AttemptState
  labBaseUrl: string
  onFinished: (byTimer: boolean) => void
}) {
  const attemptId = state.attempt.id
  const { questions } = state
  const [responses, setResponses] = useState<Record<string, unknown>>(state.responses)
  const [idx, setIdx] = useState(0)
  const [save, setSave] = useState<SaveState>('saved')
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Date.parse(state.attempt.deadline_at) - Date.parse(state.attempt.server_now)),
  )
  const [submitting, setSubmitting] = useState(false)

  // --- Taymer: mijoz soatiga emas, serverdan kelgan "hozir"ga tayanadi (monoton performance.now bilan) ---
  const deadlineRef = useRef(Date.parse(state.attempt.deadline_at))
  const serverNowRef = useRef({
    server: Date.parse(state.attempt.server_now),
    perf: performance.now(),
  })

  // --- Avtosaqlash holati ---
  const responsesRef = useRef(responses)
  const dirty = useRef(new Set<string>())
  const version = useRef<Record<string, number>>({})
  const inflight = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelay = useRef(3000)
  const finished = useRef(false)

  const persistLocal = useCallback(() => {
    try {
      localStorage.setItem(
        storageKey(attemptId),
        JSON.stringify({ responses: responsesRef.current, dirty: [...dirty.current] }),
      )
    } catch {
      /* private rejim: faqat server saqlaydi */
    }
  }, [attemptId])

  const finish = useCallback(
    async (byTimer: boolean) => {
      if (finished.current) return
      finished.current = true
      setSubmitting(true)
      try {
        // Oxirgi javoblarni yuborishga urinish (muddat tugagan bo'lsa server rad etishi mumkin — muhim emas)
        if (dirty.current.size > 0) {
          const items = [...dirty.current].map((qid) => ({
            question_id: qid,
            response: responsesRef.current[qid],
          }))
          await apiJson(`/api/attempts/${attemptId}/answers`, {
            method: 'POST',
            json: { items },
          }).catch(() => undefined)
        }
        await apiJson(`/api/attempts/${attemptId}/submit`, { method: 'POST' })
        try {
          localStorage.removeItem(storageKey(attemptId))
        } catch {
          /* ignore */
        }
        onFinished(byTimer)
      } catch {
        finished.current = false
        setSubmitting(false)
        setSave('error')
      }
    },
    [attemptId, onFinished],
  )

  const flush = useCallback(async () => {
    if (inflight.current || dirty.current.size === 0 || finished.current) return
    inflight.current = true
    setSave('saving')
    const ids = [...dirty.current]
    const sent = Object.fromEntries(ids.map((q) => [q, version.current[q] ?? 0]))
    try {
      await apiJson(`/api/attempts/${attemptId}/answers`, {
        method: 'POST',
        json: { items: ids.map((q) => ({ question_id: q, response: responsesRef.current[q] })) },
      })
      for (const q of ids) if ((version.current[q] ?? 0) === sent[q]) dirty.current.delete(q)
      retryDelay.current = 3000
      persistLocal()
      setSave(dirty.current.size === 0 ? 'saved' : 'saving')
    } catch (err) {
      if (
        err instanceof ClientApiError &&
        (err.code === 'time_over' || err.code === 'already_submitted')
      ) {
        inflight.current = false
        void finish(true)
        return
      }
      setSave(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error')
      retryDelay.current = Math.min(retryDelay.current * 2, 30000)
      timer.current = setTimeout(() => {
        timer.current = null
        void flush()
      }, retryDelay.current)
    } finally {
      inflight.current = false
    }
    if (dirty.current.size > 0 && !timer.current)
      timer.current = setTimeout(() => {
        timer.current = null
        void flush()
      }, 300)
  }, [attemptId, finish, persistLocal])

  function schedule() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      void flush()
    }, 700)
  }

  function setResponse(qid: string, value: unknown) {
    const next = { ...responsesRef.current, [qid]: value }
    responsesRef.current = next
    setResponses(next)
    version.current[qid] = (version.current[qid] ?? 0) + 1
    dirty.current.add(qid)
    persistLocal()
    setSave('saving')
    schedule()
  }

  // Brauzerda saqlanib qolgan (yuborilmagan) javoblarni tiklash
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(attemptId))
      if (!raw) return
      const saved = JSON.parse(raw) as { responses?: Record<string, unknown>; dirty?: string[] }
      const pending = (saved.dirty ?? []).filter((q) => questions.some((x) => x.id === q))
      if (pending.length === 0) return
      const merged = { ...responsesRef.current }
      for (const q of pending) {
        merged[q] = saved.responses?.[q]
        dirty.current.add(q)
        version.current[q] = (version.current[q] ?? 0) + 1
      }
      responsesRef.current = merged
      setResponses(merged)
      void flush()
    } catch {
      /* ignore */
    }
  }, [attemptId, questions, flush])

  // Internet qaytganda darhol yuborish
  useEffect(() => {
    const online = () => void flush()
    const offline = () => setSave('offline')
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [flush])

  // Yuborilmagan javob bor holda sahifani yopishdan ogohlantirish
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty.current.size > 0) e.preventDefault()
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [])

  // Sahifadan chiqish SIGNALI (faqat qayd qilinadi; jazo emas)
  useEffect(() => {
    let last = 0
    const leave = () => {
      const now = Date.now()
      if (now - last < 2000) return
      last = now
      void fetch(`/api/attempts/${attemptId}/leave`, { method: 'POST', keepalive: true }).catch(
        () => undefined,
      )
    }
    const vis = () => {
      if (document.hidden) leave()
    }
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [attemptId])

  // Taymer
  useEffect(() => {
    const tick = () => {
      const nowServer =
        serverNowRef.current.server + (performance.now() - serverNowRef.current.perf)
      const left = Math.max(0, deadlineRef.current - nowServer)
      setRemaining(left)
      if (left <= 0) void finish(true)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [finish])

  const q = questions[idx]
  if (!q) return null
  const answeredCount = questions.filter((x) => isAnswered(x, responses[x.id])).length
  const mm = String(Math.floor(remaining / 60000)).padStart(2, '0')
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')
  const low = remaining < 60_000

  async function submit() {
    const unanswered = questions.length - answeredCount
    if (!confirm(`${A.confirmSubmit} ${unanswered}`)) return
    await finish(false)
  }

  const saveText =
    save === 'saved'
      ? A.saved
      : save === 'saving'
        ? A.saving
        : save === 'offline'
          ? A.offline
          : A.saveError

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-24">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
        <p className="text-sm text-slate-600">
          {A.questions} {idx + 1} {A.of} {questions.length}
        </p>
        <p
          className={`font-mono text-lg font-bold ${low ? 'text-red-600' : ''}`}
          aria-label={A.timeLeft}
        >
          {mm}:{ss}
        </p>
        <p
          className={`text-xs ${save === 'saved' ? 'text-green-700' : save === 'saving' ? 'text-slate-500' : 'text-amber-700'}`}
          role="status"
        >
          {saveText}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label="Savollar">
        {questions.map((x, i) => (
          <button
            key={x.id}
            onClick={() => setIdx(i)}
            aria-label={`${i + 1}`}
            className={`size-9 rounded-lg border text-sm font-medium ${i === idx ? 'border-brand-600 bg-brand-600 text-white' : isAnswered(x, responses[x.id]) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white'}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <section className="card space-y-4">
        <p className="text-lg whitespace-pre-wrap">{q.text}</p>
        <QuestionInput
          q={q}
          value={responses[q.id]}
          onChange={(v) => setResponse(q.id, v)}
          labBaseUrl={labBaseUrl}
        />
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
          <button className="btn-secondary" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
            {A.prev}
          </button>
          {idx < questions.length - 1 ? (
            <button className="btn-primary" onClick={() => setIdx(idx + 1)}>
              {A.next}
            </button>
          ) : (
            <button className="btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? t.app.loading : A.submit}
            </button>
          )}
        </div>
        {idx < questions.length - 1 && (
          <div className="mx-auto mt-2 max-w-2xl text-right">
            <button
              className="text-sm text-slate-500 underline"
              onClick={submit}
              disabled={submitting}
            >
              {A.submit}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionInput({
  q,
  value,
  onChange,
  labBaseUrl,
}: {
  q: StudentQuestion
  value: unknown
  onChange: (v: unknown) => void
  labBaseUrl: string
}) {
  const v = (value ?? {}) as Resp
  if (q.type === 'mcq') {
    const selected = new Set(Array.isArray(v.selected) ? (v.selected as string[]) : [])
    const toggle = (id: string) => {
      if (q.multiple) {
        const next = new Set(selected)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        onChange({ selected: [...next] })
      } else onChange({ selected: [id] })
    }
    return (
      <div className="space-y-2">
        {q.multiple && <p className="text-xs text-slate-500">{A.multipleHint}</p>}
        {q.options?.map((o) => (
          <label
            key={o.id}
            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 ${selected.has(o.id) ? 'border-brand-600 bg-brand-50' : 'border-slate-300'}`}
          >
            <input
              type={q.multiple ? 'checkbox' : 'radio'}
              name={q.id}
              checked={selected.has(o.id)}
              onChange={() => toggle(o.id)}
              className="size-5"
            />
            <span>{o.text}</span>
          </label>
        ))}
      </div>
    )
  }
  if (q.type === 'numeric') {
    return (
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          className="input"
          inputMode="decimal"
          autoComplete="off"
          placeholder={A.numberPlaceholder}
          aria-label={A.yourAnswer}
          value={String(v.value ?? '')}
          onChange={(e) =>
            onChange({
              value: e.target.value,
              unit: String(v.unit ?? q.defaultUnit ?? '') || undefined,
            })
          }
        />
        {q.unitChoices && (
          <select
            className="input w-28"
            aria-label={A.unit}
            value={String(v.unit ?? q.defaultUnit ?? '')}
            onChange={(e) => onChange({ value: String(v.value ?? ''), unit: e.target.value })}
          >
            {q.unitChoices.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        )}
      </div>
    )
  }
  if (q.type === 'short_text') {
    const text = String(v.text ?? '')
    return (
      <div>
        <textarea
          className="input min-h-40"
          aria-label={A.yourAnswer}
          value={text}
          maxLength={5000}
          onChange={(e) => onChange({ text: e.target.value })}
        />
        <p className="mt-1 text-right text-xs text-slate-400">{text.length}/5000</p>
      </div>
    )
  }
  return (
    <div className="space-y-2 text-sm">
      <p className="text-slate-600">{A.labHint}</p>
      {q.labId && (
        <a
          className="btn-secondary"
          href={`${labBaseUrl}/${encodeURIComponent(q.labId)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {A.labOpen}
        </a>
      )}
    </div>
  )
}
