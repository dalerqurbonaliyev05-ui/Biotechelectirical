import { describe, expect, it } from 'vitest'
import { scoreLiveAnswer, speedBonus, type LiveScoreInput } from '@/lib/live-score'

const T0 = 1_000_000
const base: LiveScoreInput = {
  isCorrect: true,
  openedAtMs: T0,
  answeredAtMs: T0,
  timeLimitMs: 30_000,
  closedAtMs: null,
  maxBonus: 10,
  correctPoints: 100,
  graceMs: 1500,
  alreadyAnswered: false,
}
const at = (ms: number, patch: Partial<LiveScoreInput> = {}) =>
  scoreLiveAnswer({ ...base, answeredAtMs: T0 + ms, ...patch })

describe('to‘g‘ri / noto‘g‘ri javob', () => {
  it('to‘g‘ri: 100 + bonus; noto‘g‘ri: 0 (tez bo‘lsa ham bonus yo‘q)', () => {
    expect(at(0)).toMatchObject({ status: 'accepted', points: 100, bonus: 10, total: 110 })
    expect(at(0, { isCorrect: false })).toMatchObject({
      status: 'accepted',
      points: 0,
      bonus: 0,
      total: 0,
    })
  })
  it('ball miqdori sozlanadi', () => {
    expect(at(0, { correctPoints: 50, maxBonus: 5 })).toMatchObject({
      points: 50,
      bonus: 5,
      total: 55,
    })
  })
})

describe('tezlik bonusi (MAX_SPEED_BONUS = 10)', () => {
  it('ochilgan zahoti — maksimum; vaqt tugaganda — 0', () => {
    expect(at(0).bonus).toBe(10)
    expect(at(30_000).bonus).toBe(0)
  })
  it('server vaqtiga chiziqli proporsional', () => {
    expect(at(15_000).bonus).toBe(5)
    expect(at(7_500).bonus).toBe(8) // 7.5 → 8 (yuqoriga)
    expect(at(22_500).bonus).toBe(3) // 2.5 → 3
    expect(at(27_000).bonus).toBe(1)
  })
  it('vaqt oshgan sari bonus kamayadi (kamaymas emas)', () => {
    let prev = Infinity
    for (let ms = 0; ms <= 30_000; ms += 500) {
      const b = at(ms).bonus
      expect(b).toBeLessThanOrEqual(prev)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(10)
      prev = b
    }
  })
  it('bonus 0 ga sozlansa — bonus yo‘q', () => {
    expect(at(0, { maxBonus: 0 })).toMatchObject({ bonus: 0, total: 100 })
  })
  it('speedBonus: chegaralar', () => {
    expect(speedBonus(-5, 1000, 10)).toBe(10)
    expect(speedBonus(5000, 1000, 10)).toBe(0)
    expect(speedBonus(0, 0, 10)).toBe(0)
  })
})

describe('chegara holatlari: vaqt tugagan', () => {
  it('aynan muddat tugaganda — qabul, kech emas', () => {
    expect(at(30_000)).toMatchObject({ status: 'accepted', late: false, bonus: 0, total: 100 })
  })
  it('muddatdan keyin, imtiyoz (1500 ms) ichida — qabul, kech, bonus 0', () => {
    expect(at(30_001)).toMatchObject({ status: 'accepted', late: true, points: 100, bonus: 0 })
    expect(at(31_500)).toMatchObject({ status: 'accepted', late: true, total: 100 })
  })
  it('imtiyozdan keyin — rad (time_over), ball yo‘q', () => {
    expect(at(31_501)).toMatchObject({ status: 'time_over', total: 0 })
    expect(at(120_000)).toMatchObject({ status: 'time_over', total: 0 })
  })
  it('imtiyoz 0 bo‘lsa — qat’iy chegara', () => {
    expect(at(30_001, { graceMs: 0 }).status).toBe('time_over')
    expect(at(30_000, { graceMs: 0 }).status).toBe('accepted')
  })
})

describe('chegara holatlari: ikki marta javob', () => {
  it('ikkinchi javob rad etiladi', () => {
    expect(at(1000, { alreadyAnswered: true })).toMatchObject({
      status: 'duplicate',
      total: 0,
      points: 0,
      bonus: 0,
    })
  })
  it('takroriy javob muddatdan qat’i nazar "duplicate" (birinchi ball saqlanadi)', () => {
    expect(at(99_999, { alreadyAnswered: true }).status).toBe('duplicate')
    expect(at(0, { alreadyAnswered: true, isCorrect: false }).status).toBe('duplicate')
  })
})

describe('chegara holatlari: kech kelgan javob / o‘qituvchi yopgan', () => {
  it('o‘qituvchi erta yopgan: yopilishdan oldin — qabul', () => {
    expect(at(8_000, { closedAtMs: T0 + 10_000 })).toMatchObject({
      status: 'accepted',
      late: false,
    })
  })
  it('yopilgandan keyin, imtiyoz ichida — qabul (kech), bonus 0', () => {
    expect(at(11_000, { closedAtMs: T0 + 10_000 })).toMatchObject({
      status: 'accepted',
      late: true,
      bonus: 0,
      total: 100,
    })
  })
  it('yopilgandan va imtiyozdan keyin — "closed" (time_over emas)', () => {
    expect(at(11_501, { closedAtMs: T0 + 10_000 })).toMatchObject({ status: 'closed', total: 0 })
  })
  it('yopilish vaqti tabiiy tugashdan keyin bo‘lsa — time_over', () => {
    expect(at(40_000, { closedAtMs: T0 + 35_000 })).toMatchObject({ status: 'time_over' })
  })
  it('bonus erta yopilgan savolda ham to‘liq muddatga nisbatan', () => {
    expect(at(10_000, { closedAtMs: T0 + 12_000 }).bonus).toBe(7) // 10*(1-1/3)=6.67 → 7
  })
})

describe('chegara holatlari: ochilishdan oldin', () => {
  it('soat og‘ishi (imtiyoz ichida) — elapsed 0, qabul', () => {
    expect(at(-1000)).toMatchObject({ status: 'accepted', elapsedMs: 0, bonus: 10 })
  })
  it('imtiyozdan ko‘p oldin — not_open', () => {
    expect(at(-1501)).toMatchObject({ status: 'not_open', total: 0 })
  })
})
