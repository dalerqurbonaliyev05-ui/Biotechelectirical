import { medalFor, rankEntries, type Medal } from '@/lib/ranking'

export interface ScoreRow {
  student_id: string
  total_points: number
  correct_count: number
  correct_time_ms: number
}

export interface RatingRow {
  studentId: string
  rank: number
  name: string
  points: number
  correct: number
  medal: Medal | null
}

/** "Aliyev Anvar Karimovich" → "Aliyev A." (reytingda to'liq ism ko'rsatilmaydi — shaxsiy ma'lumot minimal). */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0] as string
  return `${parts[0]} ${(parts[1] as string).charAt(0).toUpperCase()}.`
}

/**
 * Reyting: ball kamayish tartibida, teng ballda to'g'ri javoblarga kam vaqt ketgan yuqori, hammasi teng bo'lsa — teng o'rin.
 * Medallar 1–3-o'rinlarga (teng o'rinda teng medal).
 */
export function buildRating(rows: ScoreRow[], names: Map<string, string>): RatingRow[] {
  const ranks = rankEntries(
    rows.map((r) => ({ id: r.student_id, score: r.total_points, tiebreak: r.correct_time_ms })),
  )
  return rows
    .map((r) => {
      const rank = ranks.get(r.student_id) as number
      return {
        studentId: r.student_id,
        rank,
        name: shortName(names.get(r.student_id) ?? ''),
        points: r.total_points,
        correct: r.correct_count,
        medal: medalFor(rank),
      }
    })
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
}
