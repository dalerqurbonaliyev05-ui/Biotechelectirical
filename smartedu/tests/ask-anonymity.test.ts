import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Savol qutisi anonimligi: muallif identifikatori API javoblariga (o'qituvchi ham, talaba ham) chiqmaydi. */
describe('savol qutisi anonimligi', () => {
  const src = readFileSync('src/lib/server/extras.ts', 'utf8')
  it('AskView (API javobi) muallif maydonini o‘z ichiga olmaydi', () => {
    const block = src.slice(
      src.indexOf('export interface AskView'),
      src.indexOf('/**', src.indexOf('export interface AskView')),
    )
    expect(block).not.toMatch(/author/i)
  })
  it('javobga yig‘ilgan obyektda authorId uzatilmaydi', () => {
    const mapStart = src.indexOf('return ranked.map(')
    expect(src.slice(mapStart)).not.toMatch(/authorId\s*:/)
  })
  it('API route’lari author_id ni to‘g‘ridan-to‘g‘ri tanlamaydi', () => {
    for (const f of [
      'src/app/api/sessions/[id]/asks/route.ts',
      'src/app/api/live/[sessionId]/asks/route.ts',
    ]) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/author_id/)
    }
  })
})
