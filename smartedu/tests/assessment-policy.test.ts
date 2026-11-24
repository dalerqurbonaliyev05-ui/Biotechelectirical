import { describe, expect, it } from 'vitest'
import {
  acceptsAnswers,
  attemptDeadline,
  canRevealAnswers,
  canSeeScore,
  checkStart,
  remainingMs,
} from '@/lib/assessment/policy'

const d = (s: string) => new Date(s)
const opens = d('2026-01-10T10:00:00Z')
const closes = d('2026-01-10T12:00:00Z')

describe('checkStart', () => {
  const a = { isPublished: true, opensAt: opens, closesAt: closes }
  it('oyna ichida ok; oldin/keyin rad', () => {
    expect(checkStart(a, d('2026-01-10T10:00:00Z'))).toBe('ok')
    expect(checkStart(a, d('2026-01-10T09:59:59Z'))).toBe('not_open')
    expect(checkStart(a, d('2026-01-10T12:00:00Z'))).toBe('closed')
    expect(checkStart({ ...a, isPublished: false }, d('2026-01-10T11:00:00Z'))).toBe(
      'not_published',
    )
  })
})

describe('muddat va taymer (server vaqti)', () => {
  it('davomiylik yoki yopilish — qaysi biri oldin', () => {
    expect(attemptDeadline(d('2026-01-10T10:00:00Z'), 30, closes)).toEqual(
      d('2026-01-10T10:30:00Z'),
    )
    expect(attemptDeadline(d('2026-01-10T11:50:00Z'), 30, closes)).toEqual(closes)
  })
  it('javob qabul qilish: muddat + tarmoq kechikishi', () => {
    const dl = d('2026-01-10T10:30:00Z')
    expect(acceptsAnswers(dl, d('2026-01-10T10:30:00Z'))).toBe(true)
    expect(acceptsAnswers(dl, d('2026-01-10T10:30:04.999Z'))).toBe(true)
    expect(acceptsAnswers(dl, d('2026-01-10T10:30:05.001Z'))).toBe(false)
    expect(acceptsAnswers(dl, d('2026-01-10T10:30:01Z'), 0)).toBe(false)
  })
  it('qolgan vaqt manfiy bo‘lmaydi', () => {
    expect(remainingMs(d('2026-01-10T10:30:00Z'), d('2026-01-10T10:29:00Z'))).toBe(60_000)
    expect(remainingMs(d('2026-01-10T10:30:00Z'), d('2026-01-10T11:00:00Z'))).toBe(0)
  })
})

describe('canSeeScore (SQL student_can_see_results bilan bir xil)', () => {
  const before = d('2026-01-10T11:00:00Z')
  const after = d('2026-01-10T12:30:00Z')
  const cases: [string, string, boolean, boolean][] = [
    // policy, status, ko'rinadimi (yopilishdan oldin), ko'rinadimi (keyin)
    ['immediate|in_progress', '', false, false],
    ['immediate|submitted', '', true, true],
    ['immediate|finalized', '', true, true],
    ['after_close|submitted', '', false, true],
    ['after_close|finalized', '', false, true],
    ['after_close|in_progress', '', false, false],
    ['after_finalize|submitted', '', false, false],
    ['after_finalize|finalized', '', true, true],
    ['after_finalize|in_progress', '', false, false],
  ]
  it.each(cases)('%s', (key, _x, b, a) => {
    const [policy, status] = key.split('|') as [
      'immediate' | 'after_close' | 'after_finalize',
      'in_progress' | 'submitted' | 'finalized',
    ]
    expect(canSeeScore({ policy, status, closesAt: closes }, before)).toBe(b)
    expect(canSeeScore({ policy, status, closesAt: closes }, after)).toBe(a)
  })
})

describe('canRevealAnswers: to‘g‘ri javob nazorat tugamaguncha ko‘rinmaydi', () => {
  const base = { closesAt: closes, revealedAt: null as Date | null }
  it('jarayondagi urinishga HECH QACHON', () => {
    for (const policy of ['never', 'after_close', 'manual'] as const) {
      expect(
        canRevealAnswers(
          { ...base, policy, status: 'in_progress', revealedAt: d('2026-01-01T00:00:00Z') },
          d('2027-01-01T00:00:00Z'),
        ),
      ).toBe(false)
    }
  })
  it('never — hech qachon', () => {
    expect(
      canRevealAnswers(
        { ...base, policy: 'never', status: 'finalized' },
        d('2030-01-01T00:00:00Z'),
      ),
    ).toBe(false)
  })
  it('after_close — yopilgach', () => {
    expect(
      canRevealAnswers(
        { ...base, policy: 'after_close', status: 'submitted' },
        d('2026-01-10T11:59:59Z'),
      ),
    ).toBe(false)
    expect(
      canRevealAnswers(
        { ...base, policy: 'after_close', status: 'submitted' },
        d('2026-01-10T12:00:00Z'),
      ),
    ).toBe(true)
  })
  it('manual — o‘qituvchi ruxsat berganda', () => {
    expect(
      canRevealAnswers(
        { ...base, policy: 'manual', status: 'finalized' },
        d('2026-01-10T13:00:00Z'),
      ),
    ).toBe(false)
    expect(
      canRevealAnswers(
        { ...base, policy: 'manual', status: 'finalized', revealedAt: d('2026-01-10T13:00:00Z') },
        d('2026-01-10T13:00:01Z'),
      ),
    ).toBe(true)
  })
})
