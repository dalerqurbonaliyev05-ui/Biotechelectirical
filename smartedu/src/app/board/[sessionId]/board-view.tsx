'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BoardPodium, BoardQuestion } from '@/components/board-question'
import { AnnotationLayer } from '@/components/annotation-layer'
import { BookOverlay } from '@/components/book-overlay'
import { BoardStrip } from '@/components/board-strip'
import { PdfViewer } from '@/components/pdf-viewer'
import { QrCode } from '@/components/qr-code'
import { apiJson } from '@/lib/api-client'
import { COLORS, type AnnotationItem } from '@/lib/annotations'
import { t } from '@/lib/i18n'
import { understoodPercent, type ReactionKind } from '@/lib/reactions'
import type { SessionState } from '@/lib/session-state'
import { useCountdown } from '@/lib/use-countdown'
import { useLiveSession } from '@/lib/use-live-session'
import { useQuestionStats, useRating, useReactions } from '@/lib/use-question-stats'

const L = t.live
/** Muddat tugagach shuncha ms kutib (kechikkan javoblar uchun imtiyoz) savol avtomatik yopiladi. */
const AUTO_CLOSE_AFTER_MS = 1800

/** Katta ekran uchun: slayd, savol (doska "to'xtaydi"), QR + kod, reyting, medallar. Klaviatura bilan boshqariladi. */
export function BoardView({
  initial,
  pdfUrl,
  siteUrl,
}: {
  initial: SessionState
  pdfUrl: string
  siteUrl: string
}) {
  const [floaters, setFloaters] = useState<{ id: number; kind: ReactionKind; x: number }[]>([])
  const floatId = useRef(0)
  const lastFloat = useRef(0)
  const onReaction = useCallback((kind: ReactionKind) => {
    // Ko'rsatish chegarasi: soniyada ko'pi bilan ~8 ta belgi (soxta xabarlar doskani to'ldirmasin)
    const now = Date.now()
    if (now - lastFloat.current < 120) return
    lastFloat.current = now
    const id = ++floatId.current
    setFloaters((f) => [...f.slice(-11), { id, kind, x: 10 + Math.random() * 80 }])
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 2500)
  }, [])
  const { state, connected, setSlide, closeQuestion, next, signalAnnot } = useLiveSession(
    initial,
    5000,
    onReaction,
  )
  // "Doskaga qarang" chaqiruvi va tanaffus doskada ham ko'rinadi (talabalar davomati bu yerda hech qachon ko‘rsatilmaydi)
  const [focusBanner, setFocusBanner] = useState(false)
  const seenFocus = useRef(state.focusSeq)
  useEffect(() => {
    if (state.focusSeq > seenFocus.current) {
      seenFocus.current = state.focusSeq
      setFocusBanner(true)
      const id = setTimeout(() => setFocusBanner(false), 5000)
      return () => clearTimeout(id)
    }
  }, [state.focusSeq])
  // Slayd izohlari (chizma/KaTeX): D — chizish rejimi. Slayd bo'yicha saqlanadi, talabalarga faqat o'qituvchi ruxsat bersa ko'rinadi.
  const [drawOn, setDrawOn] = useState(false)
  // Kitob qatlami: slayd o'zgarsa yopiladi; B tugmasi ochadi/yopadi
  const [bookOpen, setBookOpen] = useState<string | null>(null)
  const openBook = state.books.find((b) => b.id === bookOpen) ?? null
  useEffect(() => setBookOpen(null), [state.slide])
  const [tool, setTool] = useState<'pen' | 'text'>('pen')
  const [color, setColor] = useState<string>(COLORS[0])
  const [annots, setAnnots] = useState<{ slide: number; items: AnnotationItem[] }>({
    slide: state.slide,
    items: [],
  })
  const [annotErr, setAnnotErr] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<{ slide: number; items: AnnotationItem[] } | null>(null)
  const flushAnnots = useCallback(async () => {
    const p = pending.current
    if (!p) return
    pending.current = null
    if (saveTimer.current) clearTimeout(saveTimer.current)
    try {
      await apiJson(`/api/sessions/${state.id}/annotations`, {
        method: 'PUT',
        json: { slide: p.slide, items: p.items },
      })
      setAnnotErr(false)
      signalAnnot(p.slide)
    } catch {
      setAnnotErr(true)
    }
  }, [state.id, signalAnnot])
  const changeAnnots = (items: AnnotationItem[]) => {
    setAnnots({ slide: state.slide, items })
    pending.current = { slide: state.slide, items }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void flushAnnots(), 500)
  }
  useEffect(() => {
    // Slayd almashganda avval kutayotgan saqlash yuboriladi, so'ng yangi slayd izohlari olinadi
    void flushAnnots()
    let live = true
    setAnnots({ slide: state.slide, items: [] })
    apiJson<{ items: AnnotationItem[] }>(
      `/api/sessions/${state.id}/annotations?slide=${state.slide}`,
    )
      .then((r) => live && setAnnots({ slide: state.slide, items: r.items }))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [state.slide, state.id, flushAnnots])
  const slideItems = annots.slide === state.slide ? annots.items : []
  const reactions = useReactions(state.id, state.slide, state.status === 'active')
  const root = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrWarn, setQrWarn] = useState(false)
  const stateRef = useRef(state)
  stateRef.current = state

  const question = state.question
  const left = useCountdown(question)
  const stats = useQuestionStats(state.id, question, 2000)
  const showRating = question?.status === 'closed' || state.status === 'ended'
  const rating = useRating(
    state.id,
    showRating ? `${question?.id}:${question?.status}:${state.status}` : 'hidden',
  )

  // Vaqt tugadi → doska savolni o'zi yopadi (o'qituvchi qo'lda ham yopishi mumkin)
  const autoClosed = useRef<string | null>(null)
  useEffect(() => {
    if (!question || question.status !== 'open' || state.status !== 'active' || left === null)
      return
    if (left < -AUTO_CLOSE_AFTER_MS && autoClosed.current !== question.id) {
      autoClosed.current = question.id
      closeQuestion().catch(() => undefined) // boshqaruv sahifasi allaqachon yopgan bo'lishi mumkin
    }
  }, [left, question, state.status, closeQuestion])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const s = stateRef.current
      if (s.status !== 'active') return
      const fail = () => setError(true)
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault()
        setError(false)
        next(false).catch(fail) // nuqta bo'lsa doska to'xtab savol chiqaradi
      } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
        e.preventDefault()
        if (s.slide > 1) {
          setError(false)
          setSlide(s.slide - 1).catch(fail)
        }
      } else if (e.key === 'b' || e.key === 'B') {
        const first = s.books[0]
        if (first) setBookOpen((cur) => (cur ? null : first.id))
      } else if (e.key === 'd' || e.key === 'D') {
        setDrawOn((v) => !v)
      } else if (e.key === 'Escape') {
        setDrawOn(false)
      } else if (e.key === 's' || e.key === 'S') {
        setError(false)
        next(true).catch(fail) // nuqtani o'tkazib yuborish
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSlide, next])

  // Davomat QR'i vaqt chegarali token bilan har oynada yangilanadi (rasmga olib keyin ishlatib bo'lmasin)
  const sessionId = state.id
  const active = state.status === 'active'
  useEffect(() => {
    if (!active) return
    let stop = false
    let timer: ReturnType<typeof setTimeout>
    const load = async () => {
      try {
        const r = await apiJson<{ url: string; next_in_ms: number }>(
          `/api/sessions/${sessionId}/qr-token`,
        )
        if (stop) return
        setQrUrl(r.url)
        setQrWarn(false)
        timer = setTimeout(load, Math.max(3000, r.next_in_ms - 1500))
      } catch {
        if (stop) return
        setQrWarn(true)
        timer = setTimeout(load, 15_000)
      }
    }
    void load()
    return () => {
      stop = true
      clearTimeout(timer)
    }
  }, [sessionId, active])

  const joinUrl = qrUrl ?? `${siteUrl}/live/${state.code}`
  const host = siteUrl.replace(/^https?:\/\//, '')

  return (
    <div ref={root} className="flex h-screen flex-col bg-black text-white">
      <div className="relative min-h-0 flex-1">
        {openBook && !question && <BookOverlay book={openBook} onClose={() => setBookOpen(null)} />}
        {state.onBreak && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-slate-950/95">
            <span className="text-9xl">☕</span>
            <span className="text-6xl font-bold">{t.presence.breakTitle}</span>
          </div>
        )}
        {focusBanner && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
            <span className="text-8xl font-extrabold">👀 {t.presence.focusTitle}</span>
          </div>
        )}
        {question ? (
          <BoardQuestion
            question={question}
            stats={stats}
            left={left}
            top={rating?.top ?? null}
            bonusNames={reactions?.leaders.names}
          />
        ) : pdfUrl ? (
          <PdfViewer url={pdfUrl} page={state.slide} fit="contain" className="size-full">
            <AnnotationLayer
              items={slideItems}
              editable={drawOn}
              tool={tool}
              color={color}
              onChange={changeAnnots}
            />
          </PdfViewer>
        ) : (
          <p className="p-10 text-2xl">{t.lectures.pdfError}</p>
        )}
        <div className="absolute top-3 right-4 rounded-xl bg-black/60 px-4 py-2 text-3xl font-bold tabular-nums">
          {state.slide} / {state.pageCount}
        </div>
        <button
          className="absolute top-3 left-4 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
          onClick={() => root.current?.requestFullscreen?.().catch(() => undefined)}
        >
          {L.fullscreen}
        </button>
        {state.status === 'ended' && <BoardPodium top={rating?.top ?? []} />}
        {qrWarn && (
          <p className="absolute bottom-3 left-4 rounded bg-amber-600 px-3 py-1 text-sm">
            {t.attendance.qrWarn}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="absolute right-4 bottom-3 rounded bg-red-600 px-3 py-1 text-lg"
          >
            {t.app.error}
          </p>
        )}
      </div>

      <BoardStrip
        left={
          <div className="flex items-center gap-2 text-base">
            {state.books.map((b) => (
              <button
                key={b.id}
                className={`max-w-48 truncate rounded px-2 py-1 ${bookOpen === b.id ? 'bg-brand-600' : 'bg-white/10'}`}
                onClick={() => setBookOpen((cur) => (cur === b.id ? null : b.id))}
                title={b.title}
              >
                📖 {b.title}
              </button>
            ))}
            <button
              className={`rounded px-2 py-1 ${drawOn ? 'bg-brand-600' : 'bg-white/10'}`}
              onClick={() => setDrawOn((v) => !v)}
              title={t.annot.hint}
            >
              ✏️ {t.annot.toggle}
            </button>
            {drawOn && (
              <>
                <button
                  className={`rounded px-2 py-1 ${tool === 'pen' ? 'bg-white/30' : 'bg-white/10'}`}
                  onClick={() => setTool('pen')}
                >
                  {t.annot.pen}
                </button>
                <button
                  className={`rounded px-2 py-1 ${tool === 'text' ? 'bg-white/30' : 'bg-white/10'}`}
                  onClick={() => setTool('text')}
                >
                  {t.annot.text}
                </button>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    aria-label={c}
                    onClick={() => setColor(c)}
                    className={`size-6 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
                    style={{ background: c }}
                  />
                ))}
                <button
                  className="rounded bg-white/10 px-2 py-1"
                  onClick={() => changeAnnots(slideItems.slice(0, -1))}
                >
                  ↩
                </button>
                <button className="rounded bg-white/10 px-2 py-1" onClick={() => changeAnnots([])}>
                  🗑
                </button>
              </>
            )}
            {annotErr && <span className="text-red-400">{t.annot.saveFailed}</span>}
          </div>
        }
        center={
          reactions ? (
            <>
              <span className="whitespace-nowrap tabular-nums" data-testid="board-reactions">
                👍 {reactions.understood} {t.reactions.boardUnderstood}
                {reactions.confusedEnabled && (
                  <>
                    {' '}
                    · 🤔 {reactions.confused} {t.reactions.boardConfused}
                    {understoodPercent(reactions.understood, reactions.confused) !== null &&
                      ` (${understoodPercent(reactions.understood, reactions.confused)}%)`}
                  </>
                )}
              </span>
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                {floaters.map((f) => (
                  <span
                    key={f.id}
                    className="absolute bottom-0 animate-bounce text-3xl"
                    style={{ left: `${f.x}%` }}
                  >
                    {f.kind === 'understood' ? '👍' : '🤔'}
                  </span>
                ))}
              </div>
            </>
          ) : null
        }
        right={
          reactions && reactions.leaders.count > 0 ? (
            <span className="truncate" data-testid="board-leaders">
              ⭐ {t.reactions.mostActive}:{' '}
              {reactions.leaders.names.length > 0
                ? reactions.leaders.names.join(', ')
                : reactions.leaders.count}
            </span>
          ) : null
        }
      />

      <div className="flex items-center justify-between gap-8 border-t border-white/20 bg-slate-900 px-8 py-3">
        <div className="flex items-center gap-6">
          <QrCode text={joinUrl} size={110} className="rounded-lg p-1" />
          <div>
            <p className="text-2xl text-slate-300">
              {L.joinAt}: <b className="text-white">{host}/live</b>
            </p>
            <p className="text-lg text-slate-400">{L.joinCode}</p>
            <p className="font-mono text-6xl leading-none font-bold tracking-[0.2em]">
              {state.code}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-6xl font-bold tabular-nums">{state.participants}</p>
          <p className="text-xl text-slate-300">{L.participants}</p>
          <p className={`mt-1 text-sm ${connected ? 'text-green-400' : 'text-amber-400'}`}>
            {connected ? L.connected : L.disconnected}
          </p>
        </div>
      </div>
    </div>
  )
}
