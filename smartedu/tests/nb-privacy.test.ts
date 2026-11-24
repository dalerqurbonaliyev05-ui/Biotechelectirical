import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

/** NB ro'yxati doskada HECH QACHON chiqmasin: doska fayllari davomat/NB ma'lumotiga umuman murojaat qilmaydi. */
describe('NB maxfiyligi', () => {
  const boardFiles = [
    ...walk('src/app/board'),
    'src/components/board-strip.tsx',
    'src/components/board-question.tsx',
  ]
  it.each(boardFiles.filter((f) => /\.tsx?$/.test(f)))(
    '%s: NB/davomat jadvaliga murojaat yo‘q',
    (f) => {
      const src = readFileSync(f, 'utf8')
      expect(src).not.toMatch(
        /from\('attendance'\)|attendance_ratio|override_status|presence\.nb|\bNB\b/,
      )
    },
  )
  it('doska holati (SessionState) davomat/NB maydonlarini o‘z ichiga olmaydi', () => {
    const src = readFileSync('src/lib/session-state.ts', 'utf8')
    expect(src).not.toMatch(/attendance_|attendanceStatus|\bnb\b|override/i)
    const builder = readFileSync('src/lib/server/sessions.ts', 'utf8')
    expect(builder).not.toMatch(/from\('attendance'\)/)
  })
  it('doska API’si (state/rating/reactions/question-stats) NB’ni qaytarmaydi', () => {
    for (const r of ['state', 'rating', 'reactions', 'question-stats', 'qr-token']) {
      const src = readFileSync(`src/app/api/sessions/[id]/${r}/route.ts`, 'utf8')
      expect(src, r).not.toMatch(/from\('attendance'\)|attendance_ratio|override_status/)
    }
  })
})
