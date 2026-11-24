/**
 * Reaksiyalar (toza mantiq). Mijoz bosishlarni yig'adi va ~5 soniyada bir paket qilib yuboradi (DB yuklamasi kam);
 * ko'rsatish uchun esa har bosish darhol Realtime orqali e'lon qilinadi (ishonchsiz — faqat animatsiya).
 * Authoritative hisob serverda (DB), chegaralar SQL funksiyasida (`app_add_reactions`) ham takrorlangan.
 */
export type ReactionKind = 'understood' | 'confused'

export const REACTION_FLUSH_MS = 5000
/** Bir tur uchun ketma-ket bosishlar orasidagi eng kichik vaqt (tugmani bosib qo'yishga qarshi) */
export const TAP_MIN_GAP_MS = 400
/** Bitta paketdagi har tur bo'yicha eng ko'p son (SQL bilan bir xil) */
export const BATCH_MAX = 5

export interface ReactionBatch {
  understood: number
  confused: number
  lastTap: Record<ReactionKind, number>
}

export const emptyBatch = (): ReactionBatch => ({
  understood: 0,
  confused: 0,
  lastTap: { understood: -Infinity, confused: -Infinity },
})

/** Bosishni qabul qiladi/rad etadi. Qabul qilinsa `accepted: true` (doskaga animatsiya yuboriladi). */
export function addTap(
  b: ReactionBatch,
  kind: ReactionKind,
  now: number,
): { batch: ReactionBatch; accepted: boolean } {
  if (now - b.lastTap[kind] < TAP_MIN_GAP_MS || b[kind] >= BATCH_MAX)
    return { batch: b, accepted: false }
  return {
    batch: { ...b, [kind]: b[kind] + 1, lastTap: { ...b.lastTap, [kind]: now } },
    accepted: true,
  }
}

export const isEmpty = (b: ReactionBatch) => b.understood === 0 && b.confused === 0

/** Tushunganlar ulushi (0..100). Reaksiya yo'q bo'lsa null. */
export function understoodPercent(understood: number, confused: number): number | null {
  const n = understood + confused
  return n > 0 ? Math.round((understood / n) * 100) : null
}

/** Realtime orqali kelgan (ishonchsiz) reaksiya hodisasi: faqat tur tekshiriladi. */
export function parseReactionEvent(payload: unknown): ReactionKind | null {
  const k = (payload as { kind?: unknown } | null)?.kind
  return k === 'understood' || k === 'confused' ? k : null
}

/** "Eng faol" talabalar: ball bo'yicha kamayish, teng bo'lsa id bo'yicha (deterministik). Faqat ball > 0. */
export function pickTopReactors(
  rows: { studentId: string; total: number }[],
  n: number,
): { studentId: string; total: number }[] {
  return rows
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total || a.studentId.localeCompare(b.studentId))
    .slice(0, Math.max(1, Math.min(n, 10)))
}
