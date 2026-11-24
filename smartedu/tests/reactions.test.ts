import { describe, expect, it } from 'vitest'
import {
  BATCH_MAX,
  TAP_MIN_GAP_MS,
  addTap,
  emptyBatch,
  isEmpty,
  parseReactionEvent,
  pickTopReactors,
  understoodPercent,
} from '@/lib/reactions'

describe('reaksiya paketi', () => {
  it('tez-tez bosish rad etiladi, oraliqdan keyin qabul qilinadi', () => {
    let b = emptyBatch()
    const a1 = addTap(b, 'understood', 1000)
    expect(a1.accepted).toBe(true)
    b = a1.batch
    expect(addTap(b, 'understood', 1000 + TAP_MIN_GAP_MS - 1).accepted).toBe(false)
    const a2 = addTap(b, 'understood', 1000 + TAP_MIN_GAP_MS)
    expect(a2.accepted).toBe(true)
    expect(a2.batch.understood).toBe(2)
  })
  it('turlar alohida hisoblanadi', () => {
    const a = addTap(emptyBatch(), 'understood', 0)
    const b = addTap(a.batch, 'confused', 1)
    expect(b.accepted).toBe(true)
    expect(b.batch).toMatchObject({ understood: 1, confused: 1 })
  })
  it('paket chegarasidan oshmaydi', () => {
    let b = emptyBatch()
    for (let i = 0; i < BATCH_MAX + 3; i++) b = addTap(b, 'confused', i * 1000).batch
    expect(b.confused).toBe(BATCH_MAX)
  })
  it('bo‘sh paket', () => {
    expect(isEmpty(emptyBatch())).toBe(true)
    expect(isEmpty(addTap(emptyBatch(), 'understood', 0).batch)).toBe(false)
  })
})

describe('foiz va hodisa', () => {
  it('tushunganlar ulushi', () => {
    expect(understoodPercent(0, 0)).toBeNull()
    expect(understoodPercent(3, 1)).toBe(75)
    expect(understoodPercent(0, 4)).toBe(0)
  })
  it('ishonchsiz hodisa faqat ma‘lum turni qabul qiladi', () => {
    expect(parseReactionEvent({ kind: 'understood' })).toBe('understood')
    expect(parseReactionEvent({ kind: 'x' })).toBeNull()
    expect(parseReactionEvent(null)).toBeNull()
    expect(parseReactionEvent('confused')).toBeNull()
  })
})

describe('eng faol talabalar', () => {
  const rows = [
    { studentId: 'b', total: 5 },
    { studentId: 'a', total: 5 },
    { studentId: 'c', total: 9 },
    { studentId: 'd', total: 0 },
  ]
  it('ball kamayishi, teng bo‘lsa id bo‘yicha, nol chiqariladi', () => {
    expect(pickTopReactors(rows, 3).map((r) => r.studentId)).toEqual(['c', 'a', 'b'])
  })
  it('n chegaralanadi (kamida 1, ko‘pi bilan 10)', () => {
    expect(pickTopReactors(rows, 0)).toHaveLength(1)
    expect(pickTopReactors(rows, 99)).toHaveLength(3)
  })
})
