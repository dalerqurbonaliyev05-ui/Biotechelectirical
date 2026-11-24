import type { LiveQuestionView } from '@/lib/live-question'

export interface PlanItem {
  id: string // lecture_question id
  slide: number
  text: string
  asked: boolean
  timeLimitSec: number | null
  /** Bonus savol: faqat eng faol talabaga (9-bosqich) */
  isBonus: boolean
}

/** Doska/boshqaruv uchun holat (maxfiy ma'lumot YO'Q: to'g'ri javob bu yerda emas). */
export interface SessionState {
  id: string
  rev: number
  slide: number
  pageCount: number
  status: 'active' | 'ended'
  code: string
  participants: number
  title: string
  /** Joriy slayddagi savol (ochiq yoki yopilgan), bo'lmasa null */
  question: LiveQuestionView | null
  /** Ma'ruzaga rejalashtirilgan savollar va ularning so'ralgan/so'ralmaganligi */
  plan: PlanItem[]
  /** "Doskaga qarang" chaqiruvlari soni (oshsa — yangi chaqiruv) */
  focusSeq: number
  /** Tanaffus davom etyapti */
  onBreak: boolean
  /** O'qituvchi sozlamalari (maxfiy emas) */
  settings: {
    allowGuests: boolean
    minAttendanceRatio: number
    topReactors: number
    showReactorNames: boolean
    bonusEnabled: boolean
    confusedEnabled: boolean
    shareAnnotations: boolean
  }
}

export type QuestionPhase = 'open' | 'closed' | null

/** Realtime orqali kelgan (ishonchsiz) hodisa: faqat tur va oraliqni tekshiramiz. */
export function parseStateEvent(
  payload: unknown,
): { rev: number; slide: number; status: 'active' | 'ended'; q: QuestionPhase } | null {
  const p = payload as { rev?: unknown; slide?: unknown; status?: unknown; q?: unknown } | null
  if (!p || typeof p !== 'object') return null
  if (
    !Number.isInteger(p.rev) ||
    !Number.isInteger(p.slide) ||
    (p.slide as number) < 1 ||
    (p.slide as number) > 5000
  )
    return null
  if (p.status !== 'active' && p.status !== 'ended') return null
  const q: QuestionPhase = p.q === 'open' || p.q === 'closed' ? p.q : null
  return { rev: p.rev as number, slide: p.slide as number, status: p.status, q }
}

export const sessionChannel = (sessionId: string) => `session:${sessionId}`
