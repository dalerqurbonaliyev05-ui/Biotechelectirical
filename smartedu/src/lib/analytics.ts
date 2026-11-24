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

/* ───────── Reaksiyalar va davomat (10–13-bosqichlar) ───────── */

export interface ReactionFact {
  slide: number
  kind: 'understood' | 'confused'
  cnt: number
}
export interface SlideReaction {
  slide: number
  understood: number
  confused: number
  /** Tushunganlar ulushi, % (reaksiya bo'lmasa null) */
  pctUnderstood: number | null
  /** "Qiyin slayd": tushunmadim ko'p va tushundimdan ortiq — qayta tushuntirish kerak bo'lishi mumkin */
  hard: boolean
}

/** Slaydlar bo'yicha reaksiya xaritasi (faqat reaksiya bo'lgan slaydlar, tartib bo'yicha). */
export function reactionMap(rows: ReactionFact[], hardMin = 3): SlideReaction[] {
  const by = new Map<number, { u: number; c: number }>()
  for (const r of rows) {
    const g = by.get(r.slide) ?? { u: 0, c: 0 }
    if (r.kind === 'understood') g.u += r.cnt
    else g.c += r.cnt
    by.set(r.slide, g)
  }
  return [...by.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([slide, g]) => {
      const n = g.u + g.c
      return {
        slide,
        understood: g.u,
        confused: g.c,
        pctUnderstood: n > 0 ? Math.round((g.u / n) * 100) : null,
        hard: g.c >= hardMin && g.c > g.u,
      }
    })
}

export interface AttendanceFact {
  status: 'present' | 'nb'
  override?: 'present' | 'nb' | null
}
export interface AttendanceSummary {
  present: number
  nb: number
  total: number
  /** Qatnashganlar ulushi, % (jami 0 bo'lsa null) */
  pct: number | null
}

/** Davomat jamlamasi: o'qituvchi tuzatishi (bo'lsa) avtomatik holatdan ustun. */
export function attendanceSummary(rows: AttendanceFact[]): AttendanceSummary {
  let present = 0
  let nb = 0
  for (const r of rows) {
    if ((r.override ?? r.status) === 'present') present++
    else nb++
  }
  const total = present + nb
  return { present, nb, total, pct: total > 0 ? Math.round((present / total) * 1000) / 10 : null }
}
