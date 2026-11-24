import { describe, expect, it } from 'vitest'
import { buildRating, shortName } from '@/lib/live-rating'

describe('shortName', () => {
  it('familiya + ism bosh harfi', () => {
    expect(shortName('Aliyev Anvar Karimovich')).toBe('Aliyev A.')
    expect(shortName("  G'ulomov   bahrom ")).toBe("G'ulomov B.")
    expect(shortName('Sodiq')).toBe('Sodiq')
    expect(shortName('')).toBe('—')
  })
})

describe('buildRating', () => {
  const names = new Map([
    ['a', 'Aliyev Anvar'],
    ['b', 'Boboyev Sardor'],
    ['c', 'Davronov Jasur'],
    ['d', 'Ergashev Dilshod'],
    ['e', 'Fayzullayev Otabek'],
  ])
  it('oltin/kumush/bronza 1–3-o‘rinlarga', () => {
    const r = buildRating(
      [
        { student_id: 'a', total_points: 320, correct_count: 3, correct_time_ms: 9000 },
        { student_id: 'b', total_points: 215, correct_count: 2, correct_time_ms: 7000 },
        { student_id: 'c', total_points: 110, correct_count: 1, correct_time_ms: 3000 },
        { student_id: 'd', total_points: 100, correct_count: 1, correct_time_ms: 20000 },
      ],
      names,
    )
    expect(r.map((x) => [x.name, x.rank, x.medal])).toEqual([
      ['Aliyev A.', 1, 'gold'],
      ['Boboyev S.', 2, 'silver'],
      ['Davronov J.', 3, 'bronze'],
      ['Ergashev D.', 4, null],
    ])
  })
  it('teng ball: to‘g‘ri javoblarga kam vaqt ketgan yuqori', () => {
    const r = buildRating(
      [
        { student_id: 'a', total_points: 200, correct_count: 2, correct_time_ms: 9000 },
        { student_id: 'b', total_points: 200, correct_count: 2, correct_time_ms: 4000 },
      ],
      names,
    )
    expect(r[0]?.name).toBe('Boboyev S.')
    expect(r.map((x) => x.rank)).toEqual([1, 2])
  })
  it('hammasi teng: teng o‘rin va teng medal', () => {
    const r = buildRating(
      [
        { student_id: 'a', total_points: 100, correct_count: 1, correct_time_ms: 5000 },
        { student_id: 'b', total_points: 100, correct_count: 1, correct_time_ms: 5000 },
        { student_id: 'c', total_points: 50, correct_count: 0, correct_time_ms: 0 },
      ],
      names,
    )
    expect(r.map((x) => [x.rank, x.medal])).toEqual([
      [1, 'gold'],
      [1, 'gold'],
      [3, 'bronze'],
    ])
  })
  it('ismi noma’lum bo‘lsa — chiziqcha; bo‘sh ro‘yxat', () => {
    expect(
      buildRating(
        [{ student_id: 'zzz', total_points: 1, correct_count: 0, correct_time_ms: 0 }],
        names,
      )[0]?.name,
    ).toBe('—')
    expect(buildRating([], names)).toEqual([])
  })
})
