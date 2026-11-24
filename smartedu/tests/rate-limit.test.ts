import { beforeEach, describe, expect, it } from 'vitest'
import { rateLimit, resetRateLimits } from '@/lib/rate-limit'

describe('rateLimit', () => {
  beforeEach(resetRateLimits)
  it('chegaradan keyin rad etadi va retryAfter beradi', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 3; i++) expect(rateLimit('k', 3, 10_000, t0 + i).ok).toBe(true)
    const r = rateLimit('k', 3, 10_000, t0 + 5)
    expect(r.ok).toBe(false)
    expect(r.retryAfterSec).toBeGreaterThan(0)
  })
  it('oyna o‘tgach yana ruxsat beradi', () => {
    const t0 = 5_000_000
    for (let i = 0; i < 3; i++) rateLimit('k', 3, 10_000, t0)
    expect(rateLimit('k', 3, 10_000, t0 + 10_001).ok).toBe(true)
  })
  it('kalitlar bir-biriga ta’sir qilmaydi', () => {
    for (let i = 0; i < 3; i++) rateLimit('a', 3, 10_000, 1)
    expect(rateLimit('b', 3, 10_000, 2).ok).toBe(true)
  })
})
