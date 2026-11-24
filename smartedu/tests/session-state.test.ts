import { describe, expect, it } from 'vitest'
import { parseStateEvent } from '@/lib/session-state'

describe('parseStateEvent (ishonchsiz Realtime hodisasi)', () => {
  it('to‘g‘ri hodisa: savol belgisi (q) o‘tkaziladi', () => {
    expect(parseStateEvent({ rev: 5, slide: 3, status: 'active', q: 'open' })).toEqual({
      rev: 5,
      slide: 3,
      status: 'active',
      q: 'open',
    })
    expect(parseStateEvent({ rev: 6, slide: 3, status: 'active', q: 'closed' })?.q).toBe('closed')
    expect(parseStateEvent({ rev: 7, slide: 4, status: 'ended' })?.q).toBeNull()
  })
  it('noto‘g‘ri q qiymati null ga aylanadi (zarar yo‘q)', () => {
    expect(parseStateEvent({ rev: 1, slide: 1, status: 'active', q: '<script>' })?.q).toBeNull()
  })
  it('yaroqsiz hodisalar rad etiladi', () => {
    for (const bad of [
      null,
      undefined,
      'x',
      5,
      {},
      { rev: 1.5, slide: 1, status: 'active' },
      { rev: 1, slide: 0, status: 'active' },
      { rev: 1, slide: 9999, status: 'active' },
      { rev: 1, slide: 1, status: 'hack' },
    ]) {
      expect(parseStateEvent(bad)).toBeNull()
    }
  })
})
