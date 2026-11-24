import { rankEntries } from '@/lib/ranking'

/**
 * Semestr jami = jonli ma'ruzalar ballari yig'indisi + nazoratlar hissasi yig'indisi.
 * Nazorat hissasi = (olingan / maksimal) × nazorat og'irligi (`assessments.weight`, standart 100).
 * Faqat TASDIQLANGAN (finalized) urinishlar hisobga olinadi.
 */
export interface LiveRow {
  student_id: string
  total_points: number
}
export interface AttemptFact {
  student_id: string
  total_score: number
  max_score: number
  weight: number
}

export interface SemesterTotals {
  live: number
  assessments: number
  total: number
  sessions: number
  attempts: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function assessmentContribution(total: number, max: number, weight: number): number {
  return max > 0 ? round2((Math.min(total, max) / max) * weight) : 0
}

export function computeSemester(
  studentIds: string[],
  live: LiveRow[],
  attempts: AttemptFact[],
): Map<string, SemesterTotals> {
  const out = new Map<string, SemesterTotals>(
    studentIds.map((id) => [id, { live: 0, assessments: 0, total: 0, sessions: 0, attempts: 0 }]),
  )
  for (const r of live) {
    const t = out.get(r.student_id)
    if (!t) continue
    t.live += r.total_points
    t.sessions++
  }
  for (const a of attempts) {
    const t = out.get(a.student_id)
    if (!t) continue
    t.assessments = round2(
      t.assessments + assessmentContribution(a.total_score, a.max_score, a.weight),
    )
    t.attempts++
  }
  for (const t of out.values()) t.total = round2(t.live + t.assessments)
  return out
}

/** Guruh ichidagi semestr reytingi (musobaqa reytingi: 1, 2, 2, 4). */
export function semesterRanks(totals: Map<string, SemesterTotals>): Map<string, number> {
  return rankEntries([...totals].map(([id, t]) => ({ id, score: t.total })))
}
