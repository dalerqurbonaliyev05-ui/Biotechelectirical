import { describe, expect, it } from 'vitest'
import { verifyCronAuth } from '@/lib/cron-auth'

const secret = 'cron-secret-long-enough-123'

describe('verifyCronAuth', () => {
  it('to‘g‘ri Bearer qabul qilinadi', () => {
    expect(verifyCronAuth(`Bearer ${secret}`, secret)).toBe(true)
  })
  it('sarlavhasiz / noto‘g‘ri / boshqa sxema — rad', () => {
    for (const h of [
      null,
      '',
      secret,
      `Bearer ${secret}x`,
      `bearer ${secret}`,
      `Basic ${secret}`,
      'Bearer ',
    ]) {
      expect(verifyCronAuth(h, secret)).toBe(false)
    }
  })
  it('sir yo‘q yoki qisqa bo‘lsa hech kim o‘ta olmaydi (fail-closed)', () => {
    expect(verifyCronAuth('Bearer ', '')).toBe(false)
    expect(verifyCronAuth('Bearer short', 'short')).toBe(false)
    expect(verifyCronAuth(`Bearer ${secret}`, '')).toBe(false)
  })
})
