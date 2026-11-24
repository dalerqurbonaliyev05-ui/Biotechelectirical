/**
 * Vaqt va ko'rinish qoidalari (toza funksiyalar). DB'dagi `student_can_see_results()` va
 * `app_start_attempt()` bilan AYNAN bir xil mantiq — testlarda ikkalasi tekshiriladi.
 */
export type AttemptStatus = 'in_progress' | 'submitted' | 'finalized'
export type ShowScorePolicy = 'immediate' | 'after_close' | 'after_finalize'
export type RevealPolicy = 'never' | 'after_close' | 'manual'

export type StartCheck = 'ok' | 'not_published' | 'not_open' | 'closed'

export function checkStart(
  a: { isPublished: boolean; opensAt: Date; closesAt: Date },
  now: Date,
): StartCheck {
  if (!a.isPublished) return 'not_published'
  if (now < a.opensAt) return 'not_open'
  if (now >= a.closesAt) return 'closed'
  return 'ok'
}

/** Muddat: davomiylik tugashi yoki nazorat yopilishi — qaysi biri oldin. */
export function attemptDeadline(startedAt: Date, durationMinutes: number, closesAt: Date): Date {
  return new Date(Math.min(startedAt.getTime() + durationMinutes * 60_000, closesAt.getTime()))
}

/** Javob qabul qilinadimi? Kichik tarmoq kechikishi (grace) hisobga olinadi. */
export function acceptsAnswers(deadline: Date, now: Date, graceMs = 5000): boolean {
  return now.getTime() <= deadline.getTime() + graceMs
}

export function canSeeScore(
  p: { policy: ShowScorePolicy; status: AttemptStatus; closesAt: Date },
  now: Date,
): boolean {
  const done = p.status === 'submitted' || p.status === 'finalized'
  switch (p.policy) {
    case 'immediate':
      return done
    case 'after_close':
      return done && now >= p.closesAt
    case 'after_finalize':
      return p.status === 'finalized'
  }
}

/** To'g'ri javob va izoh: nazorat tugamaguncha (urinish topshirilmaguncha) HECH QACHON. */
export function canRevealAnswers(
  p: { policy: RevealPolicy; status: AttemptStatus; closesAt: Date; revealedAt: Date | null },
  now: Date,
): boolean {
  if (p.status === 'in_progress') return false
  switch (p.policy) {
    case 'never':
      return false
    case 'after_close':
      return now >= p.closesAt
    case 'manual':
      return p.revealedAt !== null && now >= p.revealedAt
  }
}

/** Taymer uchun: serverdan kelgan "hozir" va muddat orasidagi farq — mijoz soatiga bog'liq emas. */
export function remainingMs(deadline: Date, serverNow: Date): number {
  return Math.max(0, deadline.getTime() - serverNow.getTime())
}
