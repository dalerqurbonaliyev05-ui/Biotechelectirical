import { z } from 'zod'

/**
 * Slayd izohlari (toza mantiq). Koordinatalar 0..1 oralig'ida (slayd kengligi/balandligiga nisbatan), shuning uchun
 * doska va talaba ekranida bir xil joyda chiqadi. Server va mijoz bir xil sxemani ishlatadi.
 *  - t:'s' — chizma (qalam): rang, qalinlik, nuqtalar
 *  - t:'x' — matn; `$...$` ichi KaTeX formula sifatida chiziladi
 */
export const MAX_ITEMS = 300
export const MAX_POINTS = 1500
export const MAX_TEXT = 300
export const COLORS = ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#ffffff', '#111827'] as const

const unit = z.number().min(0).max(1)
const strokeSchema = z.object({
  t: z.literal('s'),
  c: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  w: z.number().min(1).max(24),
  p: z
    .array(z.tuple([unit, unit]))
    .min(1)
    .max(MAX_POINTS),
})
const textSchema = z.object({
  t: z.literal('x'),
  x: unit,
  y: unit,
  s: z.string().min(1).max(MAX_TEXT),
  c: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
})
export const annotationItemSchema = z.discriminatedUnion('t', [strokeSchema, textSchema])
export const annotationItemsSchema = z.array(annotationItemSchema).max(MAX_ITEMS)
export type AnnotationItem = z.infer<typeof annotationItemSchema>
export type StrokeItem = z.infer<typeof strokeSchema>

/** Ekran nuqtasini (piksel) 0..1 ga keltiradi; chegaradan chiqsa qirqadi. */
export function normalizePoint(
  px: number,
  py: number,
  rect: { left: number; top: number; width: number; height: number },
): [number, number] {
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  if (rect.width <= 0 || rect.height <= 0) return [0, 0]
  return [
    Math.round(clamp((px - rect.left) / rect.width) * 10000) / 10000,
    Math.round(clamp((py - rect.top) / rect.height) * 10000) / 10000,
  ]
}

/** Juda zich nuqtalarni siyraklaydi (hajm kichik bo'lsin), oxirgi nuqta saqlanadi. */
export function thinStroke(points: [number, number][], minDist = 0.002): [number, number][] {
  if (points.length <= 2) return points
  const out: [number, number][] = [points[0]!]
  for (let i = 1; i < points.length - 1; i++) {
    const last = out[out.length - 1]!
    const p = points[i]!
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= minDist) out.push(p)
  }
  out.push(points[points.length - 1]!)
  return out.slice(0, MAX_POINTS)
}

/** `$...$` bo'laklarga ajratadi: formula (math) va oddiy matn. Yopilmagan `$` oddiy matn. */
export function splitMath(text: string): { math: boolean; value: string }[] {
  const parts: { math: boolean; value: string }[] = []
  const re = /\$([^$\n]{1,200})\$/g
  let last = 0
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push({ math: false, value: text.slice(last, m.index) })
    parts.push({ math: true, value: m[1]! })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ math: false, value: text.slice(last) })
  return parts
}

/** Ishonchsiz kirishni (server) tekshiradi: noto'g'ri bo'lsa null. */
export function parseItems(raw: unknown): AnnotationItem[] | null {
  const r = annotationItemsSchema.safeParse(raw)
  return r.success ? r.data : null
}
