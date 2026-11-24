import { describe, expect, it } from 'vitest'
import {
  attendedSeconds,
  computeAttendance,
  effectiveStatus,
  lessonSeconds,
  overlapSeconds,
} from '@/lib/presence'

const at = (min: number) => new Date(Date.UTC(2026, 0, 1, 9, 0, 0) + min * 60_000)
const start = at(0)
const end = at(80) // 80 daqiqalik dars

describe('dars davomiyligi', () => {
  it('tanaffus ayriladi', () => {
    expect(lessonSeconds(start, end, [{ start: at(40), end: at(50) }])).toBe(70 * 60)
  })
  it('davom etayotgan tanaffus oxirigacha hisoblanadi', () => {
    expect(overlapSeconds(start, end, [{ start: at(70), end: null }])).toBe(10 * 60)
  })
  it('tanaffus dars chegarasidan chiqsa kesiladi', () => {
    expect(overlapSeconds(at(10), at(20), [{ start: at(0), end: at(15) }])).toBe(5 * 60)
  })
})

describe('ishtirokchi vaqti', () => {
  const lesson = 70 * 60
  const breaks = [{ start: at(40), end: at(50) }]
  it('masofaviy: faqat ko‘ringan vaqt, darsdan oshmaydi', () => {
    expect(
      attendedSeconds(
        { mode: 'remote', joinedAt: at(0), visibleSeconds: 3000 },
        start,
        end,
        breaks,
      ),
    ).toBe(3000)
    expect(
      attendedSeconds(
        { mode: 'remote', joinedAt: at(0), visibleSeconds: 99999 },
        start,
        end,
        breaks,
      ),
    ).toBe(lesson)
  })
  it('auditoriya: qo‘shilgandan oxirigacha (tanaffussiz); kech kelgan kam oladi', () => {
    expect(
      attendedSeconds(
        { mode: 'auditorium', joinedAt: at(0), visibleSeconds: 0 },
        start,
        end,
        breaks,
      ),
    ).toBe(lesson)
    expect(
      attendedSeconds(
        { mode: 'auditorium', joinedAt: at(40), visibleSeconds: 0 },
        start,
        end,
        breaks,
      ),
    ).toBe(30 * 60)
  })
  it('qo‘shilmagan (mode null) — ko‘ringan vaqt 0', () => {
    expect(
      attendedSeconds({ mode: null, joinedAt: at(0), visibleSeconds: 0 }, start, end, []),
    ).toBe(0)
  })
})

describe('computeAttendance (MIN_ATTENDANCE_RATIO = 0.8)', () => {
  it('chegara: 80% — present, undan past — nb', () => {
    expect(computeAttendance(800, 1000, 0.8)).toEqual({ ratio: 0.8, status: 'present' })
    expect(computeAttendance(799, 1000, 0.8).status).toBe('nb')
  })
  it('nisbat 0..1 oralig‘ida', () => {
    expect(computeAttendance(5000, 1000).ratio).toBe(1)
    expect(computeAttendance(0, 1000)).toEqual({ ratio: 0, status: 'nb' })
  })
  it('sozlanadigan chegara', () => {
    expect(computeAttendance(500, 1000, 0.5).status).toBe('present')
    expect(computeAttendance(500, 1000, 0.6).status).toBe('nb')
  })
  it('juda qisqa dars: qo‘shilgan har kim present', () => {
    expect(computeAttendance(10, 30).status).toBe('present')
  })
  it('o‘qituvchi tuzatishi ustun', () => {
    expect(effectiveStatus('nb', 'present')).toBe('present')
    expect(effectiveStatus('present', null)).toBe('present')
    expect(effectiveStatus('nb', undefined)).toBe('nb')
  })
})
