import { describe, expect, it } from 'vitest'
import { buildLiveQuestion, gradeLiveResponse, sharedVariant } from '@/lib/live-question'
import { generateValues } from '@/lib/assessment/variant'
import { rngFor } from '@/lib/assessment/prng'

const mcq = {
  type: 'mcq' as const,
  body: {
    text: 'Qaysi biri?',
    options: [
      { id: 'a', text: 'Bir' },
      { id: 'b', text: 'Ikki' },
      { id: 'c', text: 'Uch' },
    ],
    multiple: false,
  },
  params: {},
}
const num = {
  type: 'numeric' as const,
  body: { text: 'U={U} V, R={R} Ω. I=?' },
  params: {
    vars: { U: { min: 10, max: 24, step: 2 }, R: { min: 2, max: 10, step: 1 } },
    answer_unit: 'A',
    tolerance_pct: 2,
  },
}
const sq = (variant = {}) => ({
  id: 'sq1',
  slide_no: 4,
  time_limit_sec: 30,
  variant,
  opened_at: '2026-03-01T10:00:00.000Z',
  closed_at: null,
})
const now = new Date('2026-03-01T10:00:05.000Z')

describe('buildLiveQuestion (kalitsiz)', () => {
  it('mcq: variantlar asl tartibda, ochiq holat', () => {
    const v = buildLiveQuestion(sq(), mcq, now)!
    expect(v).toMatchObject({
      id: 'sq1',
      slide: 4,
      type: 'mcq',
      status: 'open',
      timeLimitSec: 30,
      serverNow: now.toISOString(),
    })
    expect(v.options?.map((o) => o.id)).toEqual(['a', 'b', 'c'])
  })
  it('numeric: qiymatlar matnga qo‘yiladi, birliklar beriladi', () => {
    const v = buildLiveQuestion(sq({ values: { U: 12, R: 4 } }), num, now)!
    expect(v.text).toBe('U=12 V, R=4 Ω. I=?')
    expect(v.unitChoices).toContain('mA')
    expect(v.defaultUnit).toBe('A')
  })
  it('yopilgan savol — "closed"', () => {
    expect(
      buildLiveQuestion({ ...sq(), closed_at: '2026-03-01T10:00:20.000Z' }, mcq, now)!.status,
    ).toBe('closed')
  })
  it('KALIT, formula, tolerantlik, izoh sizib chiqmaydi', () => {
    const json = JSON.stringify([
      buildLiveQuestion(sq(), { ...mcq, params: { secret: 'x' } }, now),
      buildLiveQuestion(sq({ values: { U: 12, R: 4 } }), num, now),
    ])
    for (const bad of ['correct', 'formula', 'tolerance', 'explanation', 'U / R', 'secret', 'vars'])
      expect(json).not.toContain(bad)
  })
  it('jonli rejimda qo‘llanmaydigan tur — null', () => {
    expect(
      buildLiveQuestion(
        sq(),
        { type: 'short_text' as never, body: { text: 'x' }, params: {} },
        now,
      ),
    ).toBeNull()
  })
})

describe('gradeLiveResponse', () => {
  it('mcq: aniq to‘plam', () => {
    const key = { correct: ['b'] }
    expect(gradeLiveResponse(mcq, key, {}, { selected: ['b'] })).toBe(true)
    expect(gradeLiveResponse(mcq, key, {}, { selected: ['a'] })).toBe(false)
    expect(gradeLiveResponse(mcq, key, {}, { selected: ['a', 'b'] })).toBe(false)
    expect(gradeLiveResponse(mcq, key, {}, null)).toBe(false)
  })
  it('numeric: tolerantlik va birlik (U/R = 3 A)', () => {
    const key = { correct: { formula: 'U/R' } }
    const variant = { values: { U: 12, R: 4 } }
    expect(gradeLiveResponse(num, key, variant, { value: '3', unit: 'A' })).toBe(true)
    expect(gradeLiveResponse(num, key, variant, { value: '3000', unit: 'mA' })).toBe(true)
    expect(gradeLiveResponse(num, key, variant, { value: '3,05', unit: 'A' })).toBe(true)
    expect(gradeLiveResponse(num, key, variant, { value: '3.2', unit: 'A' })).toBe(false)
    expect(gradeLiveResponse(num, key, variant, { value: '3', unit: 'V' })).toBe(false)
  })
  it('kalit yo‘q yoki formula buzuq — false (xatolik tashlamaydi)', () => {
    expect(gradeLiveResponse(num, null, {}, { value: '3' })).toBe(false)
    expect(
      gradeLiveResponse(num, { correct: { formula: 'X/Y' } }, { values: {} }, { value: '3' }),
    ).toBe(false)
  })
})

describe('sharedVariant', () => {
  it('butun auditoriyaga bir xil, urug‘ bilan deterministik', () => {
    const gen = (vars: Parameters<typeof generateValues>[0]) =>
      generateValues(vars, rngFor('S1:Q1'))
    expect(sharedVariant(num, gen)).toEqual(sharedVariant(num, gen))
    expect(sharedVariant(mcq, gen)).toEqual({})
  })
})
