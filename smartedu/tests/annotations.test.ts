import { describe, expect, it } from 'vitest'
import {
  MAX_ITEMS,
  MAX_POINTS,
  normalizePoint,
  parseItems,
  splitMath,
  thinStroke,
} from '@/lib/annotations'

describe('izoh sxemasi', () => {
  it('to‘g‘ri chizma va matnni qabul qiladi', () => {
    const r = parseItems([
      {
        t: 's',
        c: '#ff0000',
        w: 3,
        p: [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
      },
      { t: 'x', x: 0.5, y: 0.5, s: 'F = ma, $x^2$' },
    ])
    expect(r).toHaveLength(2)
  })
  it('chegaradan tashqari koordinata, noto‘g‘ri rang, ortiqcha hajm — rad', () => {
    expect(parseItems([{ t: 's', c: '#ff0000', w: 3, p: [[1.2, 0]] }])).toBeNull()
    expect(parseItems([{ t: 's', c: 'red', w: 3, p: [[0, 0]] }])).toBeNull()
    expect(parseItems([{ t: 'x', x: 0, y: 0, s: 'a'.repeat(301) }])).toBeNull()
    expect(
      parseItems(Array.from({ length: MAX_ITEMS + 1 }, () => ({ t: 'x', x: 0, y: 0, s: 'a' }))),
    ).toBeNull()
    expect(
      parseItems([
        { t: 's', c: '#000000', w: 3, p: Array.from({ length: MAX_POINTS + 1 }, () => [0, 0]) },
      ]),
    ).toBeNull()
  })
  it('noma‘lum tur va massiv bo‘lmagan kirish — rad', () => {
    expect(parseItems([{ t: 'script', src: 'x' }])).toBeNull()
    expect(parseItems({ t: 's' })).toBeNull()
    expect(parseItems(null)).toBeNull()
  })
})

describe('koordinata', () => {
  it('normalizePoint: nisbiy, qirqiladi', () => {
    const rect = { left: 100, top: 50, width: 200, height: 100 }
    expect(normalizePoint(200, 100, rect)).toEqual([0.5, 0.5])
    expect(normalizePoint(0, 999, rect)).toEqual([0, 1])
    expect(normalizePoint(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual([0, 0])
  })
  it('thinStroke: zich nuqtalarni siyraklaydi, oxirgisini saqlaydi', () => {
    const pts: [number, number][] = Array.from({ length: 100 }, (_, i) => [i / 100000, 0])
    const out = thinStroke(pts)
    expect(out.length).toBeLessThan(pts.length)
    expect(out[out.length - 1]).toEqual(pts[99])
    expect(thinStroke([[0, 0]])).toEqual([[0, 0]])
  })
})

describe('splitMath', () => {
  it('formula va matnni ajratadi', () => {
    expect(splitMath('v = $\\frac{s}{t}$ m/s')).toEqual([
      { math: false, value: 'v = ' },
      { math: true, value: '\\frac{s}{t}' },
      { math: false, value: ' m/s' },
    ])
  })
  it('yopilmagan $ — oddiy matn', () => {
    expect(splitMath('narxi $5')).toEqual([{ math: false, value: 'narxi $5' }])
  })
})
