import { describe, expect, it } from 'vitest'
import { clampSettings } from '@/lib/settings-bounds'

describe('clampSettings', () => {
  it('boshlang‘ich qiymatlar (MAX_SPEED_BONUS = 10)', () => {
    const s = clampSettings({})
    expect(s.max_speed_bonus).toBe(10)
    expect(s.correct_points).toBe(100)
  })
  it('noto‘g‘ri qiymatlarni xavfsiz oraliqqa keltiradi', () => {
    const s = clampSettings({
      max_speed_bonus: -5,
      correct_points: 'abc',
      live_question_seconds: 99999,
      live_grace_ms: 2000,
    })
    expect(s.max_speed_bonus).toBe(0)
    expect(s.correct_points).toBe(100)
    expect(s.live_question_seconds).toBe(600)
    expect(s.live_grace_ms).toBe(2000)
  })
})
