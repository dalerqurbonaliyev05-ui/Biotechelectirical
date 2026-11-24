/**
 * Elektr birliklari va SI qo'shimchalari (mA, kV, MW, kVA, mΩ ...).
 * Javob birligi kutilgan birlik bilan bir xil KATTALIKda bo'lishi shart; qo'shimcha farqi hisobga olinadi.
 */
const PREFIX: Record<string, number> = {
  p: 1e-12,
  n: 1e-9,
  µ: 1e-6,
  μ: 1e-6,
  u: 1e-6,
  m: 1e-3,
  k: 1e3,
  M: 1e6,
  G: 1e9,
}

// Uzunroq asoslar oldin (VA — A dan, Wh — W dan)
const BASES = ['VA', 'var', 'Wh', 'Hz', 'Ω', 'A', 'V', 'W', 'F', 'H', 'J', 'S'] as const

function canonical(raw: string): string {
  const s = raw.trim()
  return s.replace(/^([pnµμumkMG]?)(ohm|Ohm|OHM|om|Om|OM|ом|Ом)$/, '$1Ω')
}

export interface ParsedUnit {
  base: string
  factor: number
}

export function parseUnit(raw: string): ParsedUnit | null {
  const s = canonical(raw)
  for (const base of BASES) {
    if (!s.endsWith(base)) continue
    const prefix = s.slice(0, s.length - base.length)
    if (prefix === '') return { base, factor: 1 }
    const f = PREFIX[prefix]
    if (f !== undefined) return { base, factor: f }
  }
  return null
}

/** Talaba tanlay oladigan birliklar: asos birlik + mashhur qo'shimchalar. */
export function unitChoices(answerUnit: string): string[] {
  const p = parseUnit(answerUnit)
  if (!p) return [answerUnit]
  const set = new Set<string>([answerUnit])
  const prefixes = ['µ', 'm', '', 'k', 'M']
  for (const x of prefixes) set.add(`${x}${p.base}`)
  // asos birlik oldin, so'ng kichikdan kattagacha
  return [...set].sort((a, b) => (parseUnit(a)?.factor ?? 1) - (parseUnit(b)?.factor ?? 1))
}
