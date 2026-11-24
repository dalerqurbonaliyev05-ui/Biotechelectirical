import { describe, expect, it } from 'vitest'
import { bookUrl } from '@/lib/books'

describe('bookUrl (kutubxona chuqur havolasi)', () => {
  it('bet bilan va betsiz', () => {
    expect(bookUrl('https://energyvibe.uz/kutubxona', 'elektr-qurilmalari-qoidalari')).toBe(
      'https://energyvibe.uz/kutubxona/#/kitob/elektr-qurilmalari-qoidalari',
    )
    expect(bookUrl('https://x.uz/kutubxona/', 'a', 12)).toBe('https://x.uz/kutubxona/#/kitob/a/12')
  })
  it('noto‘g‘ri bet e‘tiborsiz, slug kodlanadi', () => {
    expect(bookUrl('https://x.uz', 'a b', 0)).toBe('https://x.uz/#/kitob/a%20b')
    expect(bookUrl('https://x.uz', 'a', null)).toBe('https://x.uz/#/kitob/a')
  })
})
