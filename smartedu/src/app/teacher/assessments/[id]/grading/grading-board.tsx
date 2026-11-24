'use client'

import { useMemo, useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { round2 } from '@/lib/assessment/grade'
import { t } from '@/lib/i18n'

const G = t.grading

export interface GradingItem {
  answerId: string
  questionId: string
  questionText: string
  type: string
  rubric: { criterion: string; points: number }[] | null
  pointsMax: number
  answerText: string
  label: string
  name: string
  /** lab_task: laboratoriyadan kelgan natija (bo'lsa) */
  lab?: { score: number; max: number } | null
}

function ItemCard({
  item,
  showName,
  onDone,
}: {
  item: GradingItem
  showName: boolean
  onDone: () => void
}) {
  const rubric = item.type === 'short_text' ? item.rubric : null
  const rubricMax = rubric ? rubric.reduce((s, r) => s + r.points, 0) : 0
  const [vals, setVals] = useState<string[]>(() => (rubric ?? []).map(() => ''))
  // Laboratoriya natijasi bo'lsa — mutanosib ball oldindan qo'yiladi (o'qituvchi tasdiqlaydi/o'zgartiradi)
  const suggested =
    item.lab && item.lab.max > 0
      ? Math.round(Math.min(1, item.lab.score / item.lab.max) * item.pointsMax * 100) / 100
      : null
  const [manual, setManual] = useState(suggested === null ? '' : String(suggested))
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const score = rubric
    ? round2(
        (vals.reduce((s, v) => s + (Number(v.replace(',', '.')) || 0), 0) / (rubricMax || 1)) *
          item.pointsMax,
      )
    : Number(manual.replace(',', '.')) || 0

  async function save() {
    setError(null)
    if (rubric && vals.some((v, i) => Number(v.replace(',', '.')) > (rubric[i]?.points ?? 0)))
      return setError(G.total)
    if (!rubric && (manual.trim() === '' || score > item.pointsMax))
      return setError(`0…${item.pointsMax}`)
    setBusy(true)
    try {
      await apiJson(`/api/answers/${item.answerId}/grade`, {
        method: 'POST',
        json: {
          score: Math.min(score, item.pointsMax),
          rubric_scores: rubric?.map((r, i) => ({
            criterion: r.criterion,
            points: Number(vals[i]?.replace(',', '.')) || 0,
          })),
          feedback: feedback || undefined,
        },
      })
      onDone()
    } catch (err) {
      setError(errorText(err instanceof ClientApiError ? err.code : undefined))
      setBusy(false)
    }
  }

  return (
    <div className="card space-y-3">
      <p className="text-xs text-slate-500">
        {G.student}: <b>{showName ? item.name : item.label}</b>
      </p>
      <div>
        <p className="label">{G.answer}</p>
        <p className="rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap">
          {item.answerText || G.noAnswer}
        </p>
      </div>
      {rubric ? (
        <div className="space-y-2">
          {rubric.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_6rem] items-center gap-2 text-sm">
              <span>
                {r.criterion} <span className="text-slate-400">(0–{r.points})</span>
              </span>
              <input
                type="number"
                min={0}
                max={r.points}
                step="any"
                className="input"
                value={vals[i]}
                onChange={(e) => setVals(vals.map((x, j) => (j === i ? e.target.value : x)))}
                aria-label={r.criterion}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_6rem] items-center gap-2 text-sm">
          <span>
            {t.assessments.fields.points}{' '}
            <span className="text-slate-400">(0–{item.pointsMax})</span>
            {item.type === 'lab_task' &&
              (item.lab ? (
                <span className="block text-xs text-green-700">
                  {G.labSuggest}: {item.lab.score} / {item.lab.max}. {G.labSuggestHint}
                </span>
              ) : (
                <span className="block text-xs text-amber-700">{G.labNoResult}</span>
              ))}
          </span>
          <input
            type="number"
            min={0}
            max={item.pointsMax}
            step="any"
            className="input"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
        </div>
      )}
      <p className="text-sm font-medium">
        {G.total}: {score} / {item.pointsMax}
      </p>
      <input
        className="input"
        placeholder={G.feedback}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button className="btn-primary" disabled={busy} onClick={save}>
        {G.saveNext}
      </button>
    </div>
  )
}

export function GradingBoard({
  assessmentId,
  items,
  awaitingFinalize,
}: {
  assessmentId: string
  items: GradingItem[]
  awaitingFinalize: number
}) {
  const [done, setDone] = useState<Set<string>>(new Set())
  const [showNames, setShowNames] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pending = useMemo(() => items.filter((i) => !done.has(i.answerId)), [items, done])
  const byQuestion = useMemo(() => {
    const m = new Map<string, GradingItem[]>()
    for (const it of pending) m.set(it.questionId, [...(m.get(it.questionId) ?? []), it])
    return [...m.values()]
  }, [pending])

  async function finalizeAll() {
    setBusy(true)
    setMsg(null)
    try {
      const r = await apiJson<{ finalized: number; pending: number }>(
        `/api/assessments/${assessmentId}/finalize-all`,
        { method: 'POST' },
      )
      setMsg(`${r.finalized} ${G.finalizedResult}, ${r.pending} ${G.stillPending}`)
    } catch (err) {
      setMsg(errorText(err instanceof ClientApiError ? err.code : undefined))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <p>
          <b>{pending.length}</b> {G.pending}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showNames}
            onChange={(e) => setShowNames(e.target.checked)}
          />{' '}
          {G.showNames}
        </label>
        <button
          className="btn-secondary"
          disabled={busy || (pending.length > 0 && awaitingFinalize === 0)}
          onClick={finalizeAll}
        >
          {G.finalizeAll}
        </button>
      </div>
      {msg && (
        <p role="status" className="text-sm text-green-700">
          {msg}
        </p>
      )}
      {pending.length === 0 && <p className="card text-slate-500">{G.allDone}</p>}
      {byQuestion.map((group) => (
        <section key={group[0]?.questionId} className="space-y-3">
          <h2 className="rounded-lg bg-slate-100 p-3 font-medium">{group[0]?.questionText}</h2>
          {group.map((item) => (
            <ItemCard
              key={item.answerId}
              item={item}
              showName={showNames}
              onDone={() => setDone((d) => new Set(d).add(item.answerId))}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
