'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PdfViewer } from '@/components/pdf-viewer'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'

const L = t.lectures

interface Attached {
  id: string
  slide_no: number
  time_limit_sec: number | null
  type: string
  text: string
}
interface Bank {
  id: string
  type: string
  topic: string | null
  text: string
}

export function LectureEditor({
  lecture,
  attached,
  bank,
}: {
  lecture: { id: string; title: string; subject: string; pageCount: number }
  attached: Attached[]
  bank: Bank[]
}) {
  const router = useRouter()
  const [url, setUrl] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [slide, setSlide] = useState('1')
  const [question, setQuestion] = useState('')
  const [seconds, setSeconds] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    apiJson<{ url: string }>(`/api/lectures/${lecture.id}/pdf-url`)
      .then((r) => live && setUrl(r.url))
      .catch(() => live && setError(L.pdfError))
    return () => {
      live = false
    }
  }, [lecture.id])

  const go = (n: number) => {
    const p = Math.min(Math.max(1, n), lecture.pageCount)
    setPage(p)
    setSlide(String(p))
  }

  async function attach(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await apiJson(`/api/lectures/${lecture.id}/questions`, {
        method: 'POST',
        json: {
          slide_no: Number(slide),
          question_id: question,
          time_limit_sec: seconds ? Number(seconds) : null,
        },
      })
      setQuestion('')
      router.refresh()
    } catch (err) {
      const detail = (err as { detail?: string }).detail
      setError(
        (detail && L.errors[detail]) ||
          errorText(err instanceof ClientApiError ? err.code : undefined),
      )
    } finally {
      setBusy(false)
    }
  }

  async function detach(id: string) {
    await apiJson(`/api/lectures/${lecture.id}/questions/${id}`, { method: 'DELETE' }).catch(
      () => undefined,
    )
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{lecture.title}</h1>
        <p className="text-sm text-slate-500">
          {lecture.subject} · {lecture.pageCount} {L.pages}
        </p>
      </div>

      <div className="card space-y-3">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100 sm:aspect-video">
          {url ? (
            <PdfViewer url={url} page={page} fit="contain" className="size-full" />
          ) : (
            <p className="p-6 text-sm text-slate-500">{t.app.loading}</p>
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            className="btn-secondary"
            onClick={() => go(page - 1)}
            disabled={page <= 1}
            aria-label={t.attempt.prev}
          >
            ‹
          </button>
          <input
            className="input w-20 text-center"
            type="number"
            min={1}
            max={lecture.pageCount}
            value={page}
            onChange={(e) => go(Number(e.target.value) || 1)}
            aria-label={L.slide}
          />
          <span className="text-sm text-slate-500">/ {lecture.pageCount}</span>
          <button
            className="btn-secondary"
            onClick={() => go(page + 1)}
            disabled={page >= lecture.pageCount}
            aria-label={t.attempt.next}
          >
            ›
          </button>
        </div>
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">{L.questionsTitle}</h2>
        <p className="text-sm text-slate-600">{L.questionsLead}</p>
        <form onSubmit={attach} className="grid gap-2 sm:grid-cols-[6rem_1fr_7rem_auto]">
          <div>
            <label className="label" htmlFor="at-slide">
              {L.attachSlide}
            </label>
            <input
              id="at-slide"
              className="input"
              type="number"
              min={1}
              max={lecture.pageCount}
              value={slide}
              onChange={(e) => setSlide(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="at-q">
              {L.attachQuestion}
            </label>
            <select
              id="at-q"
              className="input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            >
              <option value="">{t.admin.crud.choose}</option>
              {bank.map((q) => (
                <option
                  key={q.id}
                  value={q.id}
                >{`[${t.questions.types[q.type]}] ${q.text.slice(0, 70)}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="at-sec">
              {L.attachTime}
            </label>
            <input
              id="at-sec"
              className="input"
              type="number"
              min={5}
              max={600}
              placeholder={L.attachTimeHint}
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button className="btn-primary" disabled={busy}>
              {L.attach}
            </button>
          </div>
        </form>
        <p className="text-xs text-slate-500">{L.liveTypesOnly}</p>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        {attached.length === 0 ? (
          <p className="text-sm text-slate-500">{L.noAttached}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {attached.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                <button className="badge hover:bg-brand-100" onClick={() => go(a.slide_no)}>
                  {a.slide_no}-{L.slideShort}
                </button>
                <span className="min-w-0 flex-1 truncate">
                  [{t.questions.types[a.type]}] {a.text}
                </span>
                {a.time_limit_sec && (
                  <span className="text-xs text-slate-400">{a.time_limit_sec}s</span>
                )}
                <button className="text-red-600 hover:underline" onClick={() => detach(a.id)}>
                  {t.app.delete}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
