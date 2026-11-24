'use client'

import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { t } from '@/lib/i18n'

type PdfModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs')
let pdfModule: Promise<PdfModule> | null = null

/** pdf.js faqat brauzerda yuklanadi. "Legacy" build — eski telefon/brauzerlarga ham mos. */
function loadPdfjs(): Promise<PdfModule> {
  pdfModule ??= import('pdfjs-dist/legacy/build/pdf.mjs').then((m) => {
    m.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()
    return m
  })
  return pdfModule
}

/** Fayl (yuklashdan oldin) haqiqiy PDF ekanini tekshiradi va betlar sonini qaytaradi. */
export async function readPdfPageCount(data: ArrayBuffer): Promise<number> {
  const pdfjs = await loadPdfjs()
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise
  const n = doc.numPages
  await doc.destroy()
  return n
}

/**
 * Barcha betlarning kichik JPEG miniatyuralari (yuklashda, brauzerda bir marta). Ketma-ket chiziladi (xotira tejamkor).
 * Muvaffaqiyatsiz bet uchun null.
 */
export async function renderThumbnails(
  data: ArrayBuffer,
  opts: {
    width?: number
    maxPages?: number
    onProgress?: (done: number, total: number) => void
  } = {},
): Promise<(Blob | null)[]> {
  const pdfjs = await loadPdfjs()
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise
  const total = Math.min(doc.numPages, opts.maxPages ?? 2000)
  const out: (Blob | null)[] = []
  const cv = document.createElement('canvas')
  for (let n = 1; n <= total; n++) {
    try {
      const pg = await doc.getPage(n)
      const base = pg.getViewport({ scale: 1 })
      const vp = pg.getViewport({ scale: (opts.width ?? 240) / base.width })
      cv.width = Math.floor(vp.width)
      cv.height = Math.floor(vp.height)
      await pg.render({ canvas: cv, viewport: vp }).promise
      out.push(await new Promise<Blob | null>((res) => cv.toBlob(res, 'image/jpeg', 0.6)))
      pg.cleanup()
    } catch {
      out.push(null)
    }
    opts.onProgress?.(n, total)
  }
  await doc.destroy()
  return out
}

/**
 * Bitta PDF betini canvas'ga chizadi (konteyner kengligiga moslab, HiDPI uchun aniq).
 * `url` o'zgarmaguncha hujjat qayta yuklanmaydi; `page` o'zgarsa faqat bet qayta chiziladi.
 */
export function PdfViewer({
  url,
  page,
  onLoaded,
  className = '',
  fit = 'width',
  children,
}: {
  url: string
  page: number
  onLoaded?: (pageCount: number) => void
  className?: string
  /** 'width' — kenglikka; 'contain' — konteynerga to'liq sig'dirish (elektron doska) */
  fit?: 'width' | 'contain'
  /** Slayd ustiga qo'yiladigan qatlam (izohlar): canvas bilan bir xil o'lchamli qutida */
  children?: React.ReactNode
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const docRef = useRef<PDFDocumentProxy | null>(null)
  const task = useRef<RenderTask | null>(null)
  const [ready, setReady] = useState(0) // hujjat yuklanganda ortadi → qayta chizish
  const [size, setSize] = useState(0) // konteyner o'lchami o'zgarganda qayta chizish
  const [error, setError] = useState(false)
  const onLoadedRef = useRef(onLoaded)
  onLoadedRef.current = onLoaded

  useEffect(() => {
    let cancelled = false
    setError(false)
    loadPdfjs()
      .then((pdfjs) => pdfjs.getDocument({ url }).promise)
      .then((doc) => {
        if (cancelled) return void doc.destroy()
        void docRef.current?.destroy()
        docRef.current = doc
        onLoadedRef.current?.(doc.numPages)
        setReady((n) => n + 1)
      })
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [url])

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout>
    const ro = new ResizeObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(() => setSize(el.clientWidth * 10000 + el.clientHeight), 150)
    })
    ro.observe(el)
    return () => {
      clearTimeout(timer)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    const doc = docRef.current
    const cv = canvas.current
    const box = wrap.current
    if (!doc || !cv || !box || page < 1 || page > doc.numPages) return
    let cancelled = false
    void doc.getPage(page).then((pg) => {
      if (cancelled) return
      const base = pg.getViewport({ scale: 1 })
      const w = box.clientWidth || 800
      const h = box.clientHeight || 600
      const scale = fit === 'contain' ? Math.min(w / base.width, h / base.height) : w / base.width
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const viewport = pg.getViewport({ scale: scale * dpr })
      cv.width = Math.floor(viewport.width)
      cv.height = Math.floor(viewport.height)
      cv.style.width = `${Math.floor(viewport.width / dpr)}px`
      cv.style.height = `${Math.floor(viewport.height / dpr)}px`
      task.current?.cancel()
      const rt = pg.render({ canvas: cv, viewport })
      task.current = rt
      rt.promise.catch(() => undefined) // bekor qilingan chizish xato emas
    })
    return () => {
      cancelled = true
      task.current?.cancel()
    }
  }, [page, ready, size, fit])

  useEffect(() => () => void docRef.current?.destroy(), [])

  return (
    <div ref={wrap} className={`flex items-center justify-center overflow-hidden ${className}`}>
      {error ? (
        <p className="p-6 text-sm text-red-600">{t.lectures.pdfError}</p>
      ) : (
        <div className="relative leading-[0]">
          <canvas ref={canvas} aria-label={`${t.lectures.slide} ${page}`} />
          {children}
        </div>
      )}
    </div>
  )
}
