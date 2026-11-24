/**
 * Jonli ma'ruza ball hisoblash — TOZA funksiya (ichida vaqt/DB/tarmoq yo'q).
 *
 * Qoida:
 *  - to'g'ri javob: `correctPoints` (standart 100), noto'g'ri: 0;
 *  - tezlik bonusi: FAQAT to'g'ri javobga, 0..`maxBonus` (standart 10), savol ochilganidan beri o'tgan SERVER vaqtiga
 *    chiziqli proporsional kamayadi: ochilgan zahoti — maksimum, vaqt tugaganda — 0;
 *  - tarmoq kechikishi (`graceMs`, standart 1500 ms): muddatdan keyin kelgan, lekin imtiyoz ichidagi javob QABUL
 *    qilinadi (bonus 0, `late: true`) — sekin internet/arzon telefon talabani jazolamasin;
 *  - imtiyozdan ham keyin kelgan javob rad etiladi ('time_over'; o'qituvchi erta yopgan bo'lsa 'closed');
 *  - ikkinchi javob rad etiladi ('duplicate'), muddatdan qat'i nazar.
 */
export type LiveAnswerStatus = 'accepted' | 'duplicate' | 'not_open' | 'closed' | 'time_over'

export interface LiveScoreInput {
  isCorrect: boolean
  /** Savol ochilgan server vaqti (ms) */
  openedAtMs: number
  /** Javob serverga yetib kelgan vaqt (ms) — mijoz vaqtiga ISHONILMAYDI */
  answeredAtMs: number
  timeLimitMs: number
  /** O'qituvchi savolni yopgan vaqt (ms); hali ochiq bo'lsa null */
  closedAtMs: number | null
  maxBonus: number
  correctPoints: number
  graceMs: number
  alreadyAnswered: boolean
}

export interface LiveScoreResult {
  status: LiveAnswerStatus
  points: number
  bonus: number
  total: number
  elapsedMs: number
  /** Muddatdan keyin, lekin imtiyoz ichida kelgan (bonus 0) */
  late: boolean
}

const REJECT = (status: LiveAnswerStatus, elapsedMs = 0): LiveScoreResult => ({
  status,
  points: 0,
  bonus: 0,
  total: 0,
  elapsedMs,
  late: false,
})

/** Tezlik bonusi: 0..maxBonus, butun songa yaxlitlanadi (.5 — yuqoriga). */
export function speedBonus(elapsedMs: number, timeLimitMs: number, maxBonus: number): number {
  if (maxBonus <= 0 || timeLimitMs <= 0) return 0
  const remaining = Math.min(1, Math.max(0, 1 - elapsedMs / timeLimitMs))
  return Math.round(maxBonus * remaining)
}

export function scoreLiveAnswer(i: LiveScoreInput): LiveScoreResult {
  if (i.alreadyAnswered) return REJECT('duplicate')

  const rawElapsed = i.answeredAtMs - i.openedAtMs
  // Instansiyalar soati orasidagi kichik og'ish: imtiyoz ichida ochilishdan oldin kelsa — 0 deb olamiz
  if (rawElapsed < -i.graceMs) return REJECT('not_open')
  const elapsedMs = Math.max(0, rawElapsed)

  const naturalEnd = i.openedAtMs + i.timeLimitMs
  const closedEarly = i.closedAtMs !== null && i.closedAtMs < naturalEnd
  const effectiveEnd = closedEarly ? (i.closedAtMs as number) : naturalEnd

  if (i.answeredAtMs > effectiveEnd + i.graceMs)
    return REJECT(closedEarly ? 'closed' : 'time_over', elapsedMs)

  const late = i.answeredAtMs > effectiveEnd
  const points = i.isCorrect ? i.correctPoints : 0
  const bonus = i.isCorrect && !late ? speedBonus(elapsedMs, i.timeLimitMs, i.maxBonus) : 0
  return { status: 'accepted', points, bonus, total: points + bonus, elapsedMs, late }
}
