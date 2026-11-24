import { describe, expect, it } from 'vitest'
import {
  askCreateSchema,
  buildPollOptions,
  pollCreateSchema,
  pollTally,
  rankAsks,
  YES_NO,
} from '@/lib/extras'

const ask = (
  id: string,
  votes: number,
  createdAt: string,
  over: Partial<{ hidden: boolean; answered: boolean }> = {},
) => ({
  id,
  body: id,
  votes,
  createdAt,
  hidden: false,
  answered: false,
  ...over,
})

describe('rankAsks', () => {
  it('ko‘p ovozli tepada; teng bo‘lsa eskisi; yashirilgan chiqmaydi; javob berilgan pastda', () => {
    const r = rankAsks([
      ask('a', 1, '2026-01-01T10:00:00Z'),
      ask('b', 5, '2026-01-01T10:05:00Z'),
      ask('c', 5, '2026-01-01T10:01:00Z'),
      ask('d', 9, '2026-01-01T10:02:00Z', { hidden: true }),
      ask('e', 7, '2026-01-01T10:03:00Z', { answered: true }),
    ])
    expect(r.map((x) => x.id)).toEqual(['c', 'b', 'a', 'e'])
  })
})

describe('pollTally', () => {
  it('ovozlarni sanaydi, foiz yaxlitlanadi, noma‘lum variant hisobga olinmaydi', () => {
    const t = pollTally(YES_NO, ['yes', 'yes', 'no', 'maybe'])
    expect(t.total).toBe(3)
    expect(t.results).toEqual([
      { id: 'yes', text: 'Ha', count: 2, pct: 67 },
      { id: 'no', text: 'Yo‘q', count: 1, pct: 33 },
    ])
  })
  it('ovoz yo‘q — 0%', () => {
    expect(pollTally(YES_NO, []).results.every((r) => r.pct === 0)).toBe(true)
  })
})

describe('so‘rov va savol sxemalari', () => {
  it('variantlar: berilmasa ha/yo‘q; berilsa o1..on', () => {
    expect(buildPollOptions()).toEqual(YES_NO)
    expect(buildPollOptions(['A', 'B', 'C']).map((o) => o.id)).toEqual(['o1', 'o2', 'o3'])
  })
  it('chegaralar', () => {
    expect(pollCreateSchema.safeParse({ body: 'Tushunarlimi?' }).success).toBe(true)
    expect(pollCreateSchema.safeParse({ body: 'ab' }).success).toBe(false)
    expect(
      pollCreateSchema.safeParse({ body: 'Savol bor', options: ['faqat bitta'] }).success,
    ).toBe(false)
    expect(
      pollCreateSchema.safeParse({ body: 'Savol bor', options: Array(7).fill('x') }).success,
    ).toBe(false)
    expect(askCreateSchema.parse({ token: 'x'.repeat(12), body: '  Savolim bor  ' })).toMatchObject(
      { anonymous: true, body: 'Savolim bor' },
    )
    expect(
      askCreateSchema.safeParse({ token: 'x'.repeat(12), body: 'a'.repeat(301) }).success,
    ).toBe(false)
  })
})
