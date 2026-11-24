import { describe, expect, it } from 'vitest'
import { attendanceSummary, liveQuestionShare, reactionMap, topicBreakdown } from '@/lib/analytics'
import { assessmentContribution, computeSemester, semesterRanks } from '@/lib/semester'

const f = (topic: string | null, ok: boolean, n = 1) =>
  Array.from({ length: n }, () => ({ topic, isCorrect: ok }))

describe('topicBreakdown', () => {
  it('mavzu bo‘yicha jamlama, eng yomoni birinchi', () => {
    const { stats } = topicBreakdown([
      ...f('Ohm qonuni', true, 8),
      ...f('Ohm qonuni', false, 2),
      ...f('Rele himoyasi', true, 2),
      ...f('Rele himoyasi', false, 8),
    ])
    expect(stats.map((s) => [s.topic, s.total, s.correct, s.pct])).toEqual([
      ['Rele himoyasi', 10, 2, 20],
      ['Ohm qonuni', 10, 8, 80],
    ])
  })
  it('yomon o‘zlashtirilgan: yetarli namuna va ulush < 60%', () => {
    const { weak } = topicBreakdown([
      ...f('A', false, 6),
      ...f('B', true, 6),
      ...f('C', false, 2),
      ...f('D', true, 3),
      ...f('D', false, 3),
    ])
    expect(weak.map((s) => s.topic)).toEqual(['A', 'D']) // C — namuna kichik (2 < 5); D — 50%
  })
  it('katta-kichik harf va ortiqcha probel bitta mavzu', () => {
    const { stats } = topicBreakdown([
      ...f('Ohm  qonuni', true),
      ...f(' ohm qonuni ', false),
      ...f('OHM QONUNI', true),
    ])
    expect(stats).toHaveLength(1)
    expect(stats[0]).toMatchObject({ total: 3, correct: 2, pct: 66.7 })
  })
  it('mavzusiz savollar alohida va "yomon" ro‘yxatga kirmaydi', () => {
    const { stats, weak } = topicBreakdown([...f(null, false, 10), ...f('', false, 3)])
    expect(stats).toHaveLength(1)
    expect(stats[0]?.topic).toBe('')
    expect(weak).toEqual([])
  })
  it('bo‘sh kirish', () => {
    expect(topicBreakdown([])).toEqual({ stats: [], weak: [] })
  })
})

describe('liveQuestionShare', () => {
  it('to‘g‘ri javob berganlar ulushi va qatnashish', () => {
    expect(liveQuestionShare({ answered: 20, correct: 15, participants: 25 })).toEqual({
      correctPct: 75,
      answeredPct: 80,
    })
  })
  it('nolga bo‘lishdan himoya', () => {
    expect(liveQuestionShare({ answered: 0, correct: 0, participants: 0 })).toEqual({
      correctPct: 0,
      answeredPct: 0,
    })
  })
})

describe('semestr reytingi', () => {
  it('nazorat hissasi: foiz × og‘irlik; maksimaldan oshmaydi', () => {
    expect(assessmentContribution(15, 20, 100)).toBe(75)
    expect(assessmentContribution(15, 20, 300)).toBe(225)
    expect(assessmentContribution(25, 20, 100)).toBe(100)
    expect(assessmentContribution(5, 0, 100)).toBe(0)
  })
  const ids = ['a', 'b', 'c', 'd']
  const live = [
    { student_id: 'a', total_points: 300 },
    { student_id: 'a', total_points: 108 },
    { student_id: 'b', total_points: 500 },
    { student_id: 'zzz', total_points: 999 }, // guruhda emas
  ]
  const attempts = [
    { student_id: 'a', total_score: 18, max_score: 20, weight: 100 },
    { student_id: 'c', total_score: 10, max_score: 10, weight: 500 },
  ]
  it('jonli + nazorat jami; guruhdan tashqari qatorlar e’tiborga olinmaydi', () => {
    const t = computeSemester(ids, live, attempts)
    expect(t.get('a')).toEqual({ live: 408, assessments: 90, total: 498, sessions: 2, attempts: 1 })
    expect(t.get('b')).toMatchObject({ live: 500, assessments: 0, total: 500 })
    expect(t.get('c')).toMatchObject({ total: 500, attempts: 1 })
    expect(t.get('d')).toEqual({ live: 0, assessments: 0, total: 0, sessions: 0, attempts: 0 })
    expect(t.has('zzz')).toBe(false)
  })
  it('o‘rinlar (teng ball — teng o‘rin)', () => {
    const r = semesterRanks(computeSemester(ids, live, attempts))
    expect([r.get('b'), r.get('c'), r.get('a'), r.get('d')]).toEqual([1, 1, 3, 4])
  })
})

describe('reactionMap', () => {
  it('slaydlar bo‘yicha jamlaydi va "qiyin" slaydni belgilaydi', () => {
    const m = reactionMap([
      { slide: 3, kind: 'understood', cnt: 2 },
      { slide: 3, kind: 'confused', cnt: 6 },
      { slide: 1, kind: 'understood', cnt: 5 },
      { slide: 3, kind: 'confused', cnt: 1 },
    ])
    expect(m.map((x) => x.slide)).toEqual([1, 3])
    expect(m[0]).toMatchObject({ understood: 5, confused: 0, pctUnderstood: 100, hard: false })
    expect(m[1]).toMatchObject({ understood: 2, confused: 7, pctUnderstood: 22, hard: true })
  })
  it('kam tushunmadim "qiyin" emas; bo‘sh kirish — bo‘sh natija', () => {
    expect(reactionMap([{ slide: 2, kind: 'confused', cnt: 2 }])[0]!.hard).toBe(false)
    expect(reactionMap([])).toEqual([])
  })
})

describe('attendanceSummary', () => {
  it('tuzatish ustun; foiz 1 xona', () => {
    const s = attendanceSummary([
      { status: 'present' },
      { status: 'nb' },
      { status: 'nb', override: 'present' },
      { status: 'present', override: 'nb' },
    ])
    expect(s).toEqual({ present: 2, nb: 2, total: 4, pct: 50 })
  })
  it('bo‘sh — foiz yo‘q', () => {
    expect(attendanceSummary([]).pct).toBeNull()
  })
})
