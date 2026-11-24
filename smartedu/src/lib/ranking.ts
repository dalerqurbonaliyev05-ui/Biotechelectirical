export interface RankEntry {
  id: string
  score: number
  /** Ball teng bo'lganda: kichikroq yaxshiroq (masalan, jami javob vaqti). Berilmasa — teng. */
  tiebreak?: number
}

/**
 * "Musobaqa" reytingi: 1, 2, 2, 4. Ball kattaroq — yuqori o'rin; teng ball va teng tiebreak — bir xil o'rin.
 */
export function rankEntries(entries: RankEntry[]): Map<string, number> {
  const sorted = [...entries].sort(
    (a, b) => b.score - a.score || (a.tiebreak ?? 0) - (b.tiebreak ?? 0),
  )
  const ranks = new Map<string, number>()
  sorted.forEach((e, i) => {
    const prev = sorted[i - 1]
    const same = prev && prev.score === e.score && (prev.tiebreak ?? 0) === (e.tiebreak ?? 0)
    ranks.set(e.id, same ? (ranks.get(prev.id) as number) : i + 1)
  })
  return ranks
}

export type Medal = 'gold' | 'silver' | 'bronze'

/** 1–3-o'rinlarga oltin/kumush/bronza (teng o'rin — teng medal). */
export function medalFor(rank: number): Medal | null {
  return rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : null
}
