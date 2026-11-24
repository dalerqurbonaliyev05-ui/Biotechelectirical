/**
 * Nazorat nuqtasi oqimi (toza funksiya). O'qituvchi "Keyingi" bosganda nima bo'lishini hal qiladi:
 *   ochiq savol bor        → yopiladi (natija ko'rinadi); "o'tkazib yuborish" bo'lsa yopilib, slayd ham almashadi
 *   savol yo'q, nuqtada hali so'ralmagan savol bor → keyingisi ochiladi (doska to'xtaydi)
 *   savollar tugagan, bonus tayyor → bonus savol (eng faol talabaga, 9-bosqich)
 *   aks holda              → keyingi slayd (oxirgisida 'stay')
 * Faqat ORQAGA/sakrash bu oqimni ishlatmaydi: nuqta faqat oldinga o'tishda to'xtatadi.
 */
export type AdvanceAction =
  'close' | 'close_and_advance' | 'open_next' | 'open_bonus' | 'advance' | 'stay'

export interface AdvanceInput {
  hasOpenQuestion: boolean
  skip: boolean
  /** Joriy slayddan keyingi nuqtada hali so'ralmagan oddiy savollar soni */
  pendingRegular: number
  /** Bonus savol tayyor (yoqilgan, hali so'ralmagan, oldingi savollar tugagan, eng faol talaba bor) */
  bonusReady: boolean
  slide: number
  pageCount: number
}

export function decideAdvance(i: AdvanceInput): AdvanceAction {
  if (i.hasOpenQuestion) return i.skip ? 'close_and_advance' : 'close'
  if (!i.skip) {
    if (i.pendingRegular > 0) return 'open_next'
    if (i.bonusReady) return 'open_bonus'
  }
  return i.slide < i.pageCount ? 'advance' : 'stay'
}
