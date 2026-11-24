'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { assessmentSchema } from '@/lib/assessment/assessment-schema'
import { t } from '@/lib/i18n'

const A = t.assessments
const F = A.fields

export interface QuestionOption {
  id: string
  subject_id: string
  type: string
  text: string
  topic: string | null
}

export interface AssessmentDraft {
  subject_id: string
  group_id: string
  title: string
  description: string
  opens_at: string // datetime-local
  closes_at: string
  duration_minutes: string
  question_count: string
  shuffle_questions: boolean
  shuffle_options: boolean
  show_score: 'immediate' | 'after_close' | 'after_finalize'
  reveal_answers: 'never' | 'after_close' | 'manual'
  weight: string
  is_published: boolean
  questions: { question_id: string; points: string }[]
}

/** ISO (UTC) → <input type="datetime-local"> qiymati (mahalliy vaqt) */
export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function AssessmentForm({
  assessmentId,
  initial,
  subjects,
  groups,
  pairs,
  questionBank,
  hasAttempts,
}: {
  assessmentId?: string
  initial: AssessmentDraft
  subjects: { id: string; name: string }[]
  groups: { id: string; name: string }[]
  /** O'qituvchi uchun ruxsat etilgan (fan, guruh) juftliklari; admin uchun null */
  pairs: { subject_id: string; group_id: string }[] | null
  questionBank: QuestionOption[]
  hasAttempts: boolean
}) {
  const router = useRouter()
  const [d, setD] = useState(initial)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof AssessmentDraft>(k: K, v: AssessmentDraft[K]) =>
    setD((p) => ({ ...p, [k]: v }))

  const groupOptions = useMemo(
    () =>
      pairs
        ? groups.filter((g) =>
            pairs.some((p) => p.subject_id === d.subject_id && p.group_id === g.id),
          )
        : groups,
    [pairs, groups, d.subject_id],
  )
  const bank = useMemo(() => {
    const term = search.trim().toLowerCase()
    return questionBank.filter(
      (q) =>
        q.subject_id === d.subject_id &&
        (!term ||
          q.text.toLowerCase().includes(term) ||
          (q.topic ?? '').toLowerCase().includes(term)),
    )
  }, [questionBank, d.subject_id, search])
  const picked = new Map(d.questions.map((q) => [q.question_id, q.points]))

  function toggle(id: string) {
    set(
      'questions',
      picked.has(id)
        ? d.questions.filter((q) => q.question_id !== id)
        : [...d.questions, { question_id: id, points: '1' }],
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))
    const candidate = {
      subject_id: d.subject_id,
      group_id: d.group_id,
      title: d.title,
      description: d.description || null,
      opens_at: d.opens_at ? new Date(d.opens_at).toISOString() : '',
      closes_at: d.closes_at ? new Date(d.closes_at).toISOString() : '',
      duration_minutes: num(d.duration_minutes) ?? NaN,
      question_count: num(d.question_count),
      shuffle_questions: d.shuffle_questions,
      shuffle_options: d.shuffle_options,
      show_score: d.show_score,
      reveal_answers: d.reveal_answers,
      weight: num(d.weight) ?? 0,
      is_published: d.is_published,
      questions: d.questions.map((q) => ({
        question_id: q.question_id,
        points: num(q.points) ?? NaN,
      })),
    }
    const parsed = assessmentSchema.safeParse(candidate)
    if (!parsed.success)
      return setError(
        A.errors[parsed.error.issues[0]?.message ?? ''] ?? t.questions.issues.invalid ?? '',
      )
    setBusy(true)
    try {
      await apiJson(assessmentId ? `/api/assessments/${assessmentId}` : '/api/assessments', {
        method: assessmentId ? 'PUT' : 'POST',
        json: parsed.data,
      })
      router.push('/teacher/assessments')
      router.refresh()
    } catch (err) {
      const code = err instanceof ClientApiError ? err.code : undefined
      setError((code && A.errors[code]) || errorText(code))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {hasAttempts && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{A.lockedNote}</p>
      )}

      <div className="card grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="a-title">
            {F.title}
          </label>
          <input
            id="a-title"
            className="input"
            value={d.title}
            onChange={(e) => set('title', e.target.value)}
            required
            minLength={3}
          />
        </div>
        <div>
          <label className="label" htmlFor="a-subject">
            {F.subject}
          </label>
          <select
            id="a-subject"
            className="input"
            value={d.subject_id}
            disabled={hasAttempts}
            onChange={(e) =>
              setD((p) => ({ ...p, subject_id: e.target.value, group_id: '', questions: [] }))
            }
          >
            <option value="">{t.admin.crud.choose}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="a-group">
            {F.group}
          </label>
          <select
            id="a-group"
            className="input"
            value={d.group_id}
            disabled={hasAttempts}
            onChange={(e) => set('group_id', e.target.value)}
            required
          >
            <option value="">{t.admin.crud.choose}</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="a-open">
            {F.opens}
          </label>
          <input
            id="a-open"
            type="datetime-local"
            className="input"
            value={d.opens_at}
            onChange={(e) => set('opens_at', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="a-close">
            {F.closes}
          </label>
          <input
            id="a-close"
            type="datetime-local"
            className="input"
            value={d.closes_at}
            onChange={(e) => set('closes_at', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="a-dur">
            {F.duration}
          </label>
          <input
            id="a-dur"
            type="number"
            min={1}
            max={600}
            className="input"
            value={d.duration_minutes}
            onChange={(e) => set('duration_minutes', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="a-count">
            {F.count}
          </label>
          <input
            id="a-count"
            type="number"
            min={1}
            className="input"
            value={d.question_count}
            disabled={hasAttempts}
            onChange={(e) => set('question_count', e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">{F.countHint}</p>
        </div>
        <div>
          <label className="label" htmlFor="a-show">
            {F.showScore}
          </label>
          <select
            id="a-show"
            className="input"
            value={d.show_score}
            onChange={(e) => set('show_score', e.target.value as AssessmentDraft['show_score'])}
          >
            {Object.entries(A.showScoreOptions).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="a-reveal">
            {F.reveal}
          </label>
          <select
            id="a-reveal"
            className="input"
            value={d.reveal_answers}
            onChange={(e) =>
              set('reveal_answers', e.target.value as AssessmentDraft['reveal_answers'])
            }
          >
            {Object.entries(A.revealOptions).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="a-weight">
            {F.weight}
          </label>
          <input
            id="a-weight"
            type="number"
            min={0}
            max={1000}
            className="input"
            value={d.weight}
            onChange={(e) => set('weight', e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={d.shuffle_questions}
              onChange={(e) => set('shuffle_questions', e.target.checked)}
            />{' '}
            {F.shuffleQuestions}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={d.shuffle_options}
              onChange={(e) => set('shuffle_options', e.target.checked)}
            />{' '}
            {F.shuffleOptions}
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={d.is_published}
              onChange={(e) => set('is_published', e.target.checked)}
            />{' '}
            {F.published}
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="a-desc">
            {F.description}
          </label>
          <textarea
            id="a-desc"
            className="input min-h-16"
            value={d.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">
            {F.pick}{' '}
            <span className="badge">
              {d.questions.length} {F.selected}
            </span>
          </h2>
          <input
            className="input max-w-xs"
            placeholder={t.questions.filters.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!d.subject_id ? null : bank.length === 0 ? (
          <p className="text-sm text-slate-500">{A.noQuestions}</p>
        ) : (
          <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {bank.map((q) => (
              <li key={q.id} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={picked.has(q.id)}
                  disabled={hasAttempts}
                  onChange={() => toggle(q.id)}
                  aria-label={q.text}
                />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="line-clamp-2">{q.text}</p>
                  <p className="text-xs text-slate-400">
                    {t.questions.types[q.type]}
                    {q.topic ? ` · ${q.topic}` : ''}
                  </p>
                </div>
                {picked.has(q.id) && (
                  <input
                    type="number"
                    min={0.5}
                    step="any"
                    className="input w-20"
                    aria-label={F.points}
                    value={picked.get(q.id)}
                    disabled={hasAttempts}
                    onChange={(e) =>
                      set(
                        'questions',
                        d.questions.map((x) =>
                          x.question_id === q.id ? { ...x, points: e.target.value } : x,
                        ),
                      )
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        )}
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
          onClick={() => router.push('/teacher/assessments')}
        >
          {t.app.cancel}
        </button>
      </div>
    </form>
  )
}
