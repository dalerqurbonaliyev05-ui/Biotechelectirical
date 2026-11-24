'use client'

import 'katex/dist/katex.min.css'
import katex from 'katex'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MAX_ITEMS,
  normalizePoint,
  splitMath,
  thinStroke,
  type AnnotationItem,
} from '@/lib/annotations'

/** KaTeX formulasini xavfsiz HTML'ga aylantiradi (trust:false — havola/buyruqlar o'chiq; xato bo'lsa matn qoladi). */
function mathHtml(src: string): string {
  return katex.renderToString(src, { throwOnError: false, trust: false, output: 'html' })
}

function TextItem({ item }: { item: Extract<AnnotationItem, { t: 'x' }> }) {
  const parts = useMemo(() => splitMath(item.s), [item.s])
  return (
    <div
      className="pointer-events-none absolute text-2xl font-semibold whitespace-pre-wrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
      style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, color: item.c ?? '#facc15' }}
    >
      {parts.map((p, i) =>
        p.math ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: mathHtml(p.value) }} />
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </div>
  )
}

/**
 * Slayd ustidagi izohlar qatlami. Kattalikka bog'liq emas: koordinatalar 0..1. `editable` bo'lsa qalam bilan chizish
 * (pointer events: sichqoncha, barmoq, stilus) va matn qo'yish; aks holda faqat ko'rsatadi (pointer-events o'chiq).
 */
export function AnnotationLayer({
  items,
  editable = false,
  tool = 'pen',
  color = '#ef4444',
  width = 4,
  onChange,
}: {
  items: AnnotationItem[]
  editable?: boolean
  tool?: 'pen' | 'text'
  color?: string
  width?: number
  onChange?: (items: AnnotationItem[]) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const live = useRef<[number, number][] | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [draft, setDraft] = useState<{ x: number; y: number; s: string } | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Chizmalarni qayta chizish (o'lcham yoki ro'yxat o'zgarganda)
  useEffect(() => {
    const cv = canvas.current
    if (!cv || size.w === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = Math.floor(size.w * dpr)
    cv.height = Math.floor(size.h * dpr)
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const it of items) {
      if (it.t !== 's') continue
      ctx.strokeStyle = it.c
      ctx.lineWidth = it.w
      ctx.beginPath()
      it.p.forEach(([x, y], i) =>
        i === 0 ? ctx.moveTo(x * size.w, y * size.h) : ctx.lineTo(x * size.w, y * size.h),
      )
      if (it.p.length === 1) ctx.lineTo(it.p[0]![0] * size.w + 0.01, it.p[0]![1] * size.h)
      ctx.stroke()
    }
  }, [items, size])

  const rect = () => box.current!.getBoundingClientRect()

  function down(e: React.PointerEvent) {
    if (!editable) return
    const [x, y] = normalizePoint(e.clientX, e.clientY, rect())
    if (tool === 'text') {
      setDraft({ x, y, s: '' })
      return
    }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    live.current = [[x, y]]
  }
  function move(e: React.PointerEvent) {
    const pts = live.current
    if (!editable || !pts) return
    pts.push(normalizePoint(e.clientX, e.clientY, rect()))
    const ctx = canvas.current?.getContext('2d')
    if (!ctx || pts.length < 2) return
    const a = pts[pts.length - 2]!
    const b = pts[pts.length - 1]!
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(a[0] * size.w, a[1] * size.h)
    ctx.lineTo(b[0] * size.w, b[1] * size.h)
    ctx.stroke()
  }
  function up() {
    const pts = live.current
    live.current = null
    if (!editable || !pts || items.length >= MAX_ITEMS) return
    onChange?.([...items, { t: 's', c: color, w: width, p: thinStroke(pts) }])
  }
  function commitText() {
    if (draft && draft.s.trim() && items.length < MAX_ITEMS)
      onChange?.([
        ...items,
        { t: 'x', x: draft.x, y: draft.y, s: draft.s.trim().slice(0, 300), c: color },
      ])
    setDraft(null)
  }

  return (
    <div
      ref={box}
      className={`absolute inset-0 ${editable ? 'cursor-crosshair' : 'pointer-events-none'}`}
      style={{ touchAction: editable ? 'none' : undefined }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      data-testid="annotation-layer"
    >
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 size-full" />
      {items.map((it, i) => (it.t === 'x' ? <TextItem key={i} item={it} /> : null))}
      {draft && (
        <input
          autoFocus
          className="absolute z-10 w-72 rounded bg-white/95 px-2 py-1 text-lg text-black shadow"
          style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }}
          value={draft.s}
          placeholder="matn yoki $x^2$"
          maxLength={300}
          onChange={(e) => setDraft({ ...draft, s: e.target.value })}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitText()
            if (e.key === 'Escape') setDraft(null)
            e.stopPropagation()
          }}
          onBlur={commitText}
        />
      )}
    </div>
  )
}
