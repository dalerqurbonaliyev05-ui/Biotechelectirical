import { z } from 'zod'

/**
 * Savol qutisi va tezkor so'rov (toza mantiq).
 */
export interface AskFact {
  id: string
  body: string
  votes: number
  createdAt: string
  hidden: boolean
  answered: boolean
}

/** O'qituvchi ro'yxati: yashirilmaganlar; javob berilmaganlar tepada, ovoz bo'yicha kamayish, teng bo'lsa eskisi birinchi. */
export function rankAsks<T extends AskFact>(asks: T[]): T[] {
  return asks
    .filter((a) => !a.hidden)
    .sort(
      (a, b) =>
        Number(a.answered) - Number(b.answered) ||
        b.votes - a.votes ||
        a.createdAt.localeCompare(b.createdAt),
    )
}

export interface PollOption {
  id: string
  text: string
}
export interface PollOptionResult extends PollOption {
  count: number
  pct: number
}

/** So'rov natijasi (ovozlar `option_id` ro'yxati). Noma'lum variantlar e'tiborsiz. */
export function pollTally(
  options: PollOption[],
  votes: string[],
): { total: number; results: PollOptionResult[] } {
  const counts = new Map(options.map((o) => [o.id, 0]))
  let total = 0
  for (const v of votes)
    if (counts.has(v)) {
      counts.set(v, counts.get(v)! + 1)
      total++
    }
  return {
    total,
    results: options.map((o) => ({
      ...o,
      count: counts.get(o.id)!,
      pct: total > 0 ? Math.round((counts.get(o.id)! / total) * 100) : 0,
    })),
  }
}

export const YES_NO: PollOption[] = [
  { id: 'yes', text: 'Ha' },
  { id: 'no', text: 'Yo‘q' },
]

export const pollCreateSchema = z.object({
  body: z.string().trim().min(3).max(200),
  /** Bo'sh yoki berilmasa — ha/yo'q */
  options: z.array(z.string().trim().min(1).max(80)).min(2).max(6).optional(),
})

/** Matn variantlaridan barqaror id'li variantlar (o1, o2, ...); bo'sh bo'lsa ha/yo'q. */
export function buildPollOptions(texts?: string[]): PollOption[] {
  if (!texts || texts.length === 0) return YES_NO
  return texts.map((text, i) => ({ id: `o${i + 1}`, text }))
}

export const askCreateSchema = z.object({
  token: z.string().min(10).max(100),
  body: z.string().trim().min(3).max(300),
  anonymous: z.boolean().default(true),
})
