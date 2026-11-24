'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { evaluate } from '@/lib/assessment/expr'
import {
  questionInputSchema,
  type QuestionInput,
  type QuestionType,
} from '@/lib/assessment/schemas'
import { generateValues, renderText, type NumericVarDef } from '@/lib/assessment/variant'
import { t } from '@/lib/i18n'

const Q = t.questions
const F = Q.fields

export interface Draft {
  type: QuestionType
  subject_id: string
  text: string
  topic: string
  difficulty: string
  explanation: string
  bookSlug: string
  bookPage: string
  options: { text: string; correct: boolean }[]
  vars: { name: string; min: string; max: string; step: string }[]
  formula: string
  unit: string
  tolerance: string
  rubric: { criterion: string; points: string }[]
  sample: string
  labId: string
  maxPoints: string
}

export function emptyDraft(subjectId: string): Draft {
  return {
    type: 'mcq',
    subject_id: subjectId,
    text: '',
    topic: '',
    difficulty: '',
    explanation: '',
    bookSlug: '',
    bookPage: '',
    options: [
      { text: '', correct: true },
      { text: '', correct: false },
    ],
    vars: [{ name: 'U', min: '10', max: '24', step: '2' }],
    formula: '',
    unit: '',
    tolerance: '2',
    rubric: [{ criterion: '', points: '1' }],
    sample: '',
    labId: '',
    maxPoints: '10',
  }
}

export function inputToDraft(q: QuestionInput): Draft {
  const d = emptyDraft(q.subject_id)
  d.type = q.type
  d.text = q.text
  d.topic = q.topic ?? ''
  d.difficulty = q.difficulty ? String(q.difficulty) : ''
  d.explanation = q.explanation ?? ''
  d.bookSlug = q.book_ref?.slug ?? ''
  d.bookPage = q.book_ref?.page ? String(q.book_ref.page) : ''
  if (q.type === 'mcq')
    d.options = q.options.map((o, i) => ({ text: o.text, correct: q.correct_indexes.includes(i) }))
  if (q.type === 'numeric') {
    d.vars = Object.entries(q.vars).map(([name, v]) => ({
      name,
      min: String(v.min),
      max: String(v.max),
      step: v.step ? String(v.step) : '',
    }))
    d.formula = q.formula
    d.unit = q.answer_unit
    d.tolerance = String(q.tolerance_pct)
  }
  if (q.type === 'short_text') {
    d.rubric = q.rubric.map((r) => ({ criterion: r.criterion, points: String(r.points) }))
    d.sample = q.sample ?? ''
  }
  if (q.type === 'lab_task') {
    d.labId = q.lab_id
    d.maxPoints = String(q.max_points)
  }
  return d
}

const n = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')))

function draftToCandidate(d: Draft): unknown {
  const common = {
    subject_id: d.subject_id,
    text: d.text,
    topic: d.topic || null,
    difficulty: n(d.difficulty) ?? null,
    explanation: d.explanation || null,
    book_ref: d.bookSlug.trim() ? { slug: d.bookSlug.trim(), page: n(d.bookPage) ?? null } : null,
  }
  switch (d.type) {
    case 'mcq': {
      const options = d.options.filter((o) => o.text.trim())
      return {
        ...common,
        type: 'mcq',
        options: options.map((o) => ({ text: o.text })),
        correct_indexes: options.flatMap((o, i) => (o.correct ? [i] : [])),
      }
    }
    case 'numeric': {
      const vars: Record<string, NumericVarDef> = {}
      for (const v of d.vars) {
        if (!v.name.trim()) continue
        const step = n(v.step)
        vars[v.name.trim()] = {
          min: n(v.min) ?? NaN,
          max: n(v.max) ?? NaN,
          ...(step ? { step } : {}),
        }
      }
      return {
        ...common,
        type: 'numeric',
        vars,
        formula: d.formula,
        answer_unit: d.unit,
        tolerance_pct: n(d.tolerance) ?? 2,
      }
    }
    case 'short_text':
      return {
        ...common,
        type: 'short_text',
        rubric: d.rubric
          .filter((r) => r.criterion.trim())
          .map((r) => ({ criterion: r.criterion, points: n(r.points) ?? NaN })),
        sample: d.sample || null,
      }
    case 'lab_task':
      return { ...common, type: 'lab_task', lab_id: d.labId, max_points: n(d.maxPoints) ?? 10 }
  }
}

/** Raqamli savol uchun: o'qituvchi namuna variantni va to'g'ri javobni ko'rib turadi. */
function NumericPreview({ d }: { d: Draft }) {
  const [seed, setSeed] = useState(1)
  const preview = useMemo(() => {
    const c = draftToCandidate(d)
    const parsed = questionInputSchema.safeParse(c)
    if (!parsed.success || parsed.data.type !== 'numeric') return null
    let k = seed * 2654435761
    const rng = () => (k = (k * 1664525 + 1013904223) >>> 0) / 4294967296
    const values = generateValues(parsed.data.vars, rng)
    return {
      text: renderText(parsed.data.text, values),
      expected: evaluate(parsed.data.formula, values),
      unit: parsed.data.answer_unit,
      tol: parsed.data.tolerance_pct,
    }
  }, [d, seed])
  if (!preview) return null
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-sm">
      <p className="font-medium">{Q.preview}</p>
      <p className="mt-1">{preview.text}</p>
      <p className="mt-1 text-slate-600">
        {Q.previewExpected}: <b>{Number(preview.expected.toPrecision(6))}</b> {preview.unit} (±
        {preview.tol}%)
      </p>
      <button
        type="button"
        className="mt-2 text-brand-600 underline"
        onClick={() => setSeed(seed + 1)}
      >
        {Q.previewAnother}
      </button>
    </div>
  )
}

export function QuestionForm({
  questionId,
  initial,
  subjects,
  locked,
}: {
  questionId?: string
  initial: Draft
  subjects: { id: string; name: string }[]
  /** Savol ishlatilgan: mazmuni qulflangan */
  locked: boolean
}) {
  const router = useRouter()
  const [d, setD] = useState<Draft>(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const parsed = questionInputSchema.safeParse(draftToCandidate(d))
    if (!parsed.success)
      return setError(Q.issues[parsed.error.issues[0]?.message ?? ''] ?? Q.issues.invalid ?? '')
    setBusy(true)
    try {
      await apiJson(questionId ? `/api/questions/${questionId}` : '/api/questions', {
        method: questionId ? 'PUT' : 'POST',
        json: parsed.data,
      })
      router.push('/teacher/questions')
      router.refresh()
    } catch (err) {
      const detail = (err as { detail?: string }).detail
      setError(
        (detail && Q.issues[detail]) ||
          errorText(err instanceof ClientApiError ? err.code : undefined),
      )
      setBusy(false)
    }
  }

  const lock = locked
  return (
    <form onSubmit={submit} className="space-y-4">
      {lock && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{Q.locked}</p>}
      <div className="card grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="q-subject">
            {F.subject}
          </label>
          <select
            id="q-subject"
            className="input"
            value={d.subject_id}
            disabled={lock || Boolean(questionId)}
            onChange={(e) => set('subject_id', e.target.value)}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="q-type">
            {F.type}
          </label>
          <select
            id="q-type"
            className="input"
            value={d.type}
            disabled={lock || Boolean(questionId)}
            onChange={(e) => set('type', e.target.value as QuestionType)}
          >
            {(Object.keys(Q.types) as QuestionType[]).map((k) => (
              <option key={k} value={k}>
                {Q.types[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="q-text">
            {F.text}
          </label>
          <textarea
            id="q-text"
            className="input min-h-24"
            value={d.text}
            disabled={lock}
            onChange={(e) => set('text', e.target.value)}
            required
          />
          {d.type === 'numeric' && (
            <p className="mt-1 text-xs text-slate-500">{F.textNumericHint}</p>
          )}
        </div>
      </div>

      {d.type === 'mcq' && (
        <div className="card space-y-2">
          <p className="label">{F.options}</p>
          {d.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label={`${i + 1}`}
                checked={o.correct}
                disabled={lock}
                onChange={(e) =>
                  set(
                    'options',
                    d.options.map((x, j) => (j === i ? { ...x, correct: e.target.checked } : x)),
                  )
                }
                className="size-5"
              />
              <input
                className="input"
                value={o.text}
                disabled={lock}
                onChange={(e) =>
                  set(
                    'options',
                    d.options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                  )
                }
                placeholder={`${String.fromCharCode(65 + i)}`}
              />
              {d.options.length > 2 && !lock && (
                <button
                  type="button"
                  className="btn-secondary"
                  aria-label={t.app.delete}
                  onClick={() =>
                    set(
                      'options',
                      d.options.filter((_, j) => j !== i),
                    )
                  }
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {d.options.length < 8 && !lock && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => set('options', [...d.options, { text: '', correct: false }])}
            >
              {F.addOption}
            </button>
          )}
        </div>
      )}

      {d.type === 'numeric' && (
        <div className="card space-y-3">
          <p className="label">{F.vars}</p>
          {d.vars.map((v, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2">
              {(['name', 'min', 'max', 'step'] as const).map((k) => (
                <input
                  key={k}
                  className="input"
                  aria-label={F[`var${k[0]!.toUpperCase()}${k.slice(1)}` as 'varName']}
                  placeholder={F[`var${k[0]!.toUpperCase()}${k.slice(1)}` as 'varName']}
                  value={v[k]}
                  disabled={lock}
                  onChange={(e) =>
                    set(
                      'vars',
                      d.vars.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)),
                    )
                  }
                />
              ))}
              {d.vars.length > 1 && !lock && (
                <button
                  type="button"
                  className="btn-secondary"
                  aria-label={t.app.delete}
                  onClick={() =>
                    set(
                      'vars',
                      d.vars.filter((_, j) => j !== i),
                    )
                  }
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {d.vars.length < 8 && !lock && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => set('vars', [...d.vars, { name: '', min: '', max: '', step: '' }])}
            >
              {F.addVar}
            </button>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="label" htmlFor="q-formula">
                {F.formula}
              </label>
              <input
                id="q-formula"
                className="input font-mono"
                value={d.formula}
                disabled={lock}
                onChange={(e) => set('formula', e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">{F.formulaHint}</p>
            </div>
            <div>
              <label className="label" htmlFor="q-unit">
                {F.unit}
              </label>
              <input
                id="q-unit"
                className="input"
                value={d.unit}
                disabled={lock}
                onChange={(e) => set('unit', e.target.value)}
                placeholder="A, V, W, kVA..."
              />
            </div>
            <div>
              <label className="label" htmlFor="q-tol">
                {F.tolerance}
              </label>
              <input
                id="q-tol"
                className="input"
                type="number"
                min={0}
                max={100}
                step="any"
                value={d.tolerance}
                disabled={lock}
                onChange={(e) => set('tolerance', e.target.value)}
              />
            </div>
          </div>
          <NumericPreview d={d} />
        </div>
      )}

      {d.type === 'short_text' && (
        <div className="card space-y-2">
          <p className="label">{F.rubric}</p>
          {d.rubric.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_6rem_auto] gap-2">
              <input
                className="input"
                placeholder={F.criterion}
                value={r.criterion}
                disabled={lock}
                onChange={(e) =>
                  set(
                    'rubric',
                    d.rubric.map((x, j) => (j === i ? { ...x, criterion: e.target.value } : x)),
                  )
                }
              />
              <input
                className="input"
                type="number"
                min={0.5}
                step="any"
                placeholder={F.points}
                value={r.points}
                disabled={lock}
                onChange={(e) =>
                  set(
                    'rubric',
                    d.rubric.map((x, j) => (j === i ? { ...x, points: e.target.value } : x)),
                  )
                }
              />
              {d.rubric.length > 1 && !lock && (
                <button
                  type="button"
                  className="btn-secondary"
                  aria-label={t.app.delete}
                  onClick={() =>
                    set(
                      'rubric',
                      d.rubric.filter((_, j) => j !== i),
                    )
                  }
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {!lock && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => set('rubric', [...d.rubric, { criterion: '', points: '1' }])}
            >
              {F.addCriterion}
            </button>
          )}
          <div>
            <label className="label" htmlFor="q-sample">
              {F.sample}
            </label>
            <textarea
              id="q-sample"
              className="input min-h-20"
              value={d.sample}
              disabled={lock}
              onChange={(e) => set('sample', e.target.value)}
            />
          </div>
        </div>
      )}

      {d.type === 'lab_task' && (
        <div className="card grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="q-lab">
              {F.labId}
            </label>
            <input
              id="q-lab"
              className="input"
              value={d.labId}
              disabled={lock}
              onChange={(e) => set('labId', e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">{F.labHint}</p>
          </div>
          <div>
            <label className="label" htmlFor="q-max">
              {F.maxPoints}
            </label>
            <input
              id="q-max"
              className="input"
              type="number"
              min={1}
              value={d.maxPoints}
              disabled={lock}
              onChange={(e) => set('maxPoints', e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="card grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="q-topic">
            {F.topic}
          </label>
          <input
            id="q-topic"
            className="input"
            value={d.topic}
            onChange={(e) => set('topic', e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="q-diff">
            {F.difficulty}
          </label>
          <input
            id="q-diff"
            className="input"
            type="number"
            min={1}
            max={5}
            value={d.difficulty}
            onChange={(e) => set('difficulty', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <div>
            <label className="label" htmlFor="q-book">
              {F.bookSlug}
            </label>
            <input
              id="q-book"
              className="input"
              value={d.bookSlug}
              onChange={(e) => set('bookSlug', e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="q-page">
              {F.bookPage}
            </label>
            <input
              id="q-page"
              className="input"
              type="number"
              min={1}
              value={d.bookPage}
              onChange={(e) => set('bookPage', e.target.value)}
            />
          </div>
        </div>
        <div className="sm:col-span-4">
          <label className="label" htmlFor="q-expl">
            {F.explanation}
          </label>
          <textarea
            id="q-expl"
            className="input min-h-20"
            value={d.explanation}
            onChange={(e) => set('explanation', e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>
          {t.app.save}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.push('/teacher/questions')}
        >
          {t.app.cancel}
        </button>
      </div>
    </form>
  )
}
