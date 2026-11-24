'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { PdfViewer } from '@/components/pdf-viewer'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'
import { StartSession } from './start-session'

const L = t.lectures
const E = L.editor

export interface CheckpointItem {
  id: string
  slide: number
  position: number
  questionId: string
  timeLimit: number
  isBonus: boolean
  type: string
  text: string
}
export interface Book {
  id: string
  slide: number
  title: string
  slug: string
  page: number | null
}
interface Bank {
  id: string
  type: string
  topic: string | null
  text: string
}

function detail(err: unknown): string {
  const d = (err as { detail?: string }).detail
  return (
    (d && (L.errors[d] ?? t.questions.issues[d])) ||
    errorText(err instanceof ClientApiError ? err.code : undefined)
  )
}

export function LectureEditor({
  lecture,
  items,
  books,
  bank,
  groups,
  rooms,
}: {
  lecture: { id: string; title: string; subject: string; pageCount: number }
  items: CheckpointItem[]
  books: Book[]
  bank: Bank[]
  groups: { id: string; name: string }[]
  rooms: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [url, setUrl] = useState<string | null>(null)
  const [thumbs, setThumbs] = useState<Record<number, string | null>>({})
  const [slide, setSlide] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    apiJson<{ url: string }>(`/api/lectures/${lecture.id}/pdf-url`)
      .then((r) => live && setUrl(r.url))
      .catch(() => live && setError(L.pdfError))
    apiJson<{ thumbs: { slide_no: number; url: string | null }[] }>(
      `/api/lectures/${lecture.id}/thumbs`,
    )
      .then((r) => live && setThumbs(Object.fromEntries(r.thumbs.map((x) => [x.slide_no, x.url]))))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [lecture.id])

  const act = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
      router.refresh()
    } catch (err) {
      setError(detail(err))
    }
  }

  const here = items.filter((i) => i.slide === slide)
  const hereBooks = books.filter((b) => b.slide === slide)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{lecture.title}</h1>
        <p className="text-sm text-slate-500">
          {lecture.subject} · {lecture.pageCount} {L.pages}
        </p>
      </div>
      <StartSession lectureId={lecture.id} groups={groups} rooms={rooms} />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="card space-y-3">
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-100">
            {url ? (
              <PdfViewer url={url} page={slide} fit="contain" className="size-full" />
            ) : (
              <p className="p-6 text-sm text-slate-500">{t.app.loading}</p>
            )}
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              className="btn-secondary"
              disabled={slide <= 1}
              onClick={() => setSlide(slide - 1)}
              aria-label={t.attempt.prev}
            >
              ‹
            </button>
            <span className="font-semibold tabular-nums">
              {slide} / {lecture.pageCount}
            </span>
            <button
              className="btn-secondary"
              disabled={slide >= lecture.pageCount}
              onClick={() => setSlide(slide + 1)}
              aria-label={t.attempt.next}
            >
              ›
            </button>
          </div>
        </div>

        <aside className="card max-h-[32rem] space-y-2 overflow-y-auto">
          <h2 className="font-semibold">{E.slides}</h2>
          <p className="text-xs text-slate-500">{E.slidesLead}</p>
          <ul className="grid grid-cols-3 gap-2">
            {Array.from({ length: lecture.pageCount }, (_, i) => i + 1).map((n) => {
              const hasQ = items.some((x) => x.slide === n)
              const hasB = books.some((x) => x.slide === n)
              return (
                <li key={n}>
                  <button
                    onClick={() => setSlide(n)}
                    className={`relative block w-full overflow-hidden rounded-lg border-2 ${n === slide ? 'border-brand-600' : 'border-slate-200'}`}
                    aria-label={`${L.slide} ${n}`}
                  >
                    {thumbs[n] ? (
                      <Image
                        src={thumbs[n] as string}
                        alt=""
                        width={120}
                        height={90}
                        unoptimized
                        className="h-auto w-full"
                      />
                    ) : (
                      <span className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-lg font-bold text-slate-400">
                        {n}
                      </span>
                    )}
                    <span className="absolute bottom-0 left-0 rounded-tr bg-black/60 px-1 text-xs text-white">
                      {n}
                    </span>
                    <span className="absolute top-0.5 right-0.5 text-sm">
                      {hasQ ? '💡' : ''}
                      {hasB ? '📖' : ''}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">
          {E.selected}: {slide}
          {slide === lecture.pageCount ? ` — ${E.finalNote}` : ''}
        </h2>
        <h3 className="text-sm font-medium">{E.checkpointTitle}</h3>
        {here.length === 0 ? (
          <p className="text-sm text-slate-500">{E.noCheckpoint}</p>
        ) : (
          <ol className="space-y-2">
            {here.map((it, idx) => (
              <li
                key={it.id}
                className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm"
              >
                <span className="font-bold">{idx + 1}.</span>
                <span className="min-w-0 flex-1 truncate">
                  [{t.questions.types[it.type]}] {it.text}
                </span>
                {it.isBonus && (
                  <span className="badge bg-amber-100 text-amber-800">{E.bonusBadge}</span>
                )}
                <label className="flex items-center gap-1 text-xs">
                  {E.timeSec}
                  <input
                    type="number"
                    min={5}
                    max={600}
                    defaultValue={it.timeLimit}
                    className="input w-20 min-h-8 py-0"
                    onBlur={(e) =>
                      Number(e.target.value) !== it.timeLimit &&
                      act(() =>
                        apiJson(`/api/lectures/${lecture.id}/questions/${it.id}`, {
                          method: 'PATCH',
                          json: { time_limit_sec: Number(e.target.value) || 30 },
                        }),
                      )
                    }
                  />
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={it.isBonus}
                    onChange={(e) =>
                      act(() =>
                        apiJson(`/api/lectures/${lecture.id}/questions/${it.id}`, {
                          method: 'PATCH',
                          json: { is_bonus: e.target.checked },
                        }),
                      )
                    }
                  />{' '}
                  {E.bonusBadge}
                </label>
                <button
                  className="btn-secondary min-h-8 px-2 py-0"
                  disabled={idx === 0}
                  aria-label={E.up}
                  onClick={() =>
                    act(() =>
                      apiJson(`/api/lectures/${lecture.id}/questions/${it.id}`, {
                        method: 'PATCH',
                        json: { move: 'up' },
                      }),
                    )
                  }
                >
                  ↑
                </button>
                <button
                  className="btn-secondary min-h-8 px-2 py-0"
                  disabled={idx === here.length - 1}
                  aria-label={E.down}
                  onClick={() =>
                    act(() =>
                      apiJson(`/api/lectures/${lecture.id}/questions/${it.id}`, {
                        method: 'PATCH',
                        json: { move: 'down' },
                      }),
                    )
                  }
                >
                  ↓
                </button>
                <a
                  className="text-brand-600 underline"
                  href={`/teacher/questions/${it.questionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.app.edit}
                </a>
                <button
                  className="text-red-600 hover:underline"
                  onClick={() =>
                    confirm(t.app.confirmDelete) &&
                    act(() =>
                      apiJson(`/api/lectures/${lecture.id}/questions/${it.id}`, {
                        method: 'DELETE',
                      }),
                    )
                  }
                >
                  {t.app.delete}
                </button>
              </li>
            ))}
          </ol>
        )}
        <AddQuestion
          key={`q${slide}`}
          lectureId={lecture.id}
          slide={slide}
          bank={bank}
          onDone={act}
        />
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">📖 {E.booksTitle}</h2>
        {hereBooks.length === 0 ? (
          <p className="text-sm text-slate-500">{E.noBooks}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {hereBooks.map((b) => (
              <li key={b.id} className="flex items-center gap-3">
                <span className="flex-1">
                  {b.title}{' '}
                  <span className="text-slate-400">
                    ({b.slug}
                    {b.page ? `, ${b.page}-${t.questions.pageShort}` : ''})
                  </span>
                </span>
                <button
                  className="text-red-600 hover:underline"
                  onClick={() =>
                    act(() =>
                      apiJson(`/api/lectures/${lecture.id}/books/${b.id}`, { method: 'DELETE' }),
                    )
                  }
                >
                  {t.app.delete}
                </button>
              </li>
            ))}
          </ul>
        )}
        <AddBook key={`b${slide}`} lectureId={lecture.id} slide={slide} onDone={act} />
      </section>
    </div>
  )
}

function AddBook({
  lectureId,
  slide,
  onDone,
}: {
  lectureId: string
  slide: number
  onDone: (f: () => Promise<unknown>) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [page, setPage] = useState('')
  return (
    <form
      className="grid gap-2 sm:grid-cols-[1fr_1fr_6rem_auto]"
      onSubmit={(e) => {
        e.preventDefault()
        void onDone(() =>
          apiJson(`/api/lectures/${lectureId}/books`, {
            method: 'POST',
            json: { slide_no: slide, title, slug, page: page ? Number(page) : null },
          }),
        ).then(() => {
          setTitle('')
          setSlug('')
          setPage('')
        })
      }}
    >
      <input
        className="input"
        placeholder={E.bookTitle}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        className="input"
        placeholder={E.bookSlug}
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        required
      />
      <input
        className="input"
        type="number"
        min={1}
        placeholder={E.bookPage}
        value={page}
        onChange={(e) => setPage(e.target.value)}
      />
      <button className="btn-secondary">{E.addBook}</button>
    </form>
  )
}

function AddQuestion({
  lectureId,
  slide,
  bank,
  onDone,
}: {
  lectureId: string
  slide: number
  bank: Bank[]
  onDone: (f: () => Promise<unknown>) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'new' | 'bank'>('new')
  const [text, setText] = useState('')
  const [opts, setOpts] = useState([
    { text: '', ok: true },
    { text: '', ok: false },
    { text: '', ok: false },
    { text: '', ok: false },
  ])
  const [secs, setSecs] = useState('30')
  const [expl, setExpl] = useState('')
  const [bonus, setBonus] = useState(false)
  const [pick, setPick] = useState('')

  if (!open)
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        {E.addAfter}
      </button>
    )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const common = { after_slide: slide, time_limit_sec: Number(secs) || 30, is_bonus: bonus }
    const filled = opts.filter((o) => o.text.trim())
    const body =
      tab === 'bank'
        ? { ...common, question_id: pick }
        : {
            ...common,
            new_question: {
              text,
              options: filled.map((o) => ({ text: o.text })),
              correct_indexes: filled.flatMap((o, i) => (o.ok ? [i] : [])),
              explanation: expl || null,
            },
          }
    void onDone(() =>
      apiJson(`/api/lectures/${lectureId}/questions`, { method: 'POST', json: body }),
    ).then(() => {
      setOpen(false)
      setText('')
      setExpl('')
      setBonus(false)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 p-3">
      <div className="flex gap-2">
        {(['new', 'bank'] as const).map((k) => (
          <button
            type="button"
            key={k}
            onClick={() => setTab(k)}
            className={tab === k ? 'btn-primary' : 'btn-secondary'}
          >
            {k === 'new' ? E.tabNew : E.tabBank}
          </button>
        ))}
      </div>
      {tab === 'new' ? (
        <>
          <div>
            <label className="label" htmlFor="cq-text">
              {E.qText}
            </label>
            <textarea
              id="cq-text"
              className="input min-h-20"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <p className="label">{E.correctHint}</p>
            {opts.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={o.ok}
                  onChange={(e) =>
                    setOpts(opts.map((x, j) => (j === i ? { ...x, ok: e.target.checked } : x)))
                  }
                  aria-label={`${E.optionN} ${i + 1}`}
                />
                <input
                  className="input"
                  placeholder={`${E.optionN} ${i + 1}`}
                  value={o.text}
                  onChange={(e) =>
                    setOpts(opts.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
                  }
                />
                {opts.length > 2 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    aria-label={t.app.delete}
                    onClick={() => setOpts(opts.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {opts.length < 6 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setOpts([...opts, { text: '', ok: false }])}
              >
                {E.addOption}
              </button>
            )}
          </div>
          <input
            className="input"
            placeholder={E.explanation}
            value={expl}
            onChange={(e) => setExpl(e.target.value)}
          />
        </>
      ) : (
        <select className="input" value={pick} onChange={(e) => setPick(e.target.value)} required>
          <option value="">{t.admin.crud.choose}</option>
          {bank.map((q) => (
            <option
              key={q.id}
              value={q.id}
            >{`[${t.questions.types[q.type]}] ${q.text.slice(0, 80)}`}</option>
          ))}
        </select>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          {E.timeSec}
          <input
            className="input w-24"
            type="number"
            min={5}
            max={600}
            value={secs}
            onChange={(e) => setSecs(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={bonus} onChange={(e) => setBonus(e.target.checked)} />{' '}
          {E.bonus}
        </label>
      </div>
      <div className="flex gap-2">
        <button className="btn-primary">{E.add}</button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          {t.app.cancel}
        </button>
      </div>
    </form>
  )
}
