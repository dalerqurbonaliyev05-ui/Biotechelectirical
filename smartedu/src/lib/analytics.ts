/** O'qituvchi tahlili: mavzu bo'yicha o'zlashtirish va jonli savol statistikasi (toza funksiyalar). */
export interface TopicFact {
  topic: string | null
  isCorrect: boolean
}

export interface TopicStat {
  /** Bo'sh satr = mavzusiz savollar */
  topic: string
  total: number
  correct: number
  /** To'g'ri javoblar ulushi, % (1 xona) */
  pct: number
  /** Namuna kichik: xulosa uchun yetarli emas */
  lowSample: boolean
}

const norm = (t: string | null) => (t ?? '').trim().replace(/\s+/g, ' ')

export function topicBreakdown(
  facts: TopicFact[],
  opts: { minSample?: number; weakBelowPct?: number } = {},
): { stats: TopicStat[]; weak: TopicStat[] } {
  const minSample = opts.minSample ?? 5
  const weakBelow = opts.weakBelowPct ?? 60
  const groups = new Map<string, { label: string; total: number; correct: number }>()
  for (const f of facts) {
    const label = norm(f.topic)
    const key = label.toLowerCase()
    const g = groups.get(key) ?? { label, total: 0, correct: 0 }
    g.total++
    if (f.isCorrect) g.correct++
    groups.set(key, g)
  }
  const stats: TopicStat[] = [...groups.values()]
    .map((g) => ({
      topic: g.label,
      total: g.total,
      correct: g.correct,
      pct: Math.round((g.correct / g.total) * 1000) / 10,
      lowSample: g.total < minSample,
    }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total || a.topic.localeCompare(b.topic))
  // "Yomon o'zlashtirilgan": yetarli namunali va ulushi pastlar (mavzusizlar ro'yxatga kirmaydi — qaysi mavzu ekani noma'lum)
  const weak = stats.filter((s) => !s.lowSample && s.topic !== '' && s.pct < weakBelow)
  return { stats, weak }
}

export interface LiveQuestionAgg {
  answered: number
  correct: number
  participants: number
}

export function liveQuestionShare(a: LiveQuestionAgg): { correctPct: number; answeredPct: number } {
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0)
  return { correctPct: pct(a.correct, a.answered), answeredPct: pct(a.answered, a.participants) }
}
