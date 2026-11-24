import { evaluate } from './expr'
import { rngFor, seededShuffle } from './prng'

export interface NumericVarDef {
  min: number
  max: number
  step?: number
}
export interface Variant {
  /** numeric: har bir o'zgaruvchi uchun shu talabaga berilgan qiymat */
  values?: Record<string, number>
  /** mcq: variant id'larining shu talabadagi tartibi */
  option_order?: string[]
}

export interface PoolQuestion {
  id: string
  type: 'mcq' | 'numeric' | 'short_text' | 'lab_task'
  body: { text?: string; options?: { id: string; text: string }[]; multiple?: boolean }
  params: { vars?: Record<string, NumericVarDef> } & Record<string, unknown>
  points: number
  position: number
}

function decimalsOf(n: number): number {
  const s = String(n)
  if (s.includes('e-')) return Number(s.split('e-')[1])
  return s.split('.')[1]?.length ?? 0
}

export function roundTo(v: number, d: number): number {
  return Number(v.toFixed(Math.min(Math.max(d, 0), 8)))
}

/** O'zgaruvchi qiymatlari. Tartib qat'iy (nomlar bo'yicha) — shunda natija doim bir xil. */
export function generateValues(
  vars: Record<string, NumericVarDef>,
  rng: () => number,
): Record<string, number> {
  const values: Record<string, number> = {}
  for (const name of Object.keys(vars).sort()) {
    const { min, max, step } = vars[name] as NumericVarDef
    if (step) {
      const steps = Math.floor((max - min) / step + 1e-9)
      const k = Math.floor(rng() * (steps + 1))
      values[name] = roundTo(min + k * step, Math.max(decimalsOf(step), decimalsOf(min)))
    } else {
      values[name] = roundTo(min + rng() * (max - min), 2)
    }
  }
  return values
}

/** Bitta savol uchun talabaga xos variant. Urug' = `${talaba_id}:${nazorat_id}` + savol id. */
export function makeVariant(
  q: PoolQuestion,
  attemptSeed: string,
  shuffleOptions: boolean,
): Variant {
  const rng = rngFor(`${attemptSeed}:${q.id}`)
  if (q.type === 'mcq') {
    const ids = (q.body.options ?? []).map((o) => o.id)
    return { option_order: shuffleOptions ? seededShuffle(ids, rng) : ids }
  }
  if (q.type === 'numeric') return { values: generateValues(q.params.vars ?? {}, rng) }
  return {}
}

/** "{U} V kuchlanish" → "12 V kuchlanish" */
export function renderText(text: string, values: Record<string, number> | undefined): string {
  if (!values) return text
  return text.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : m,
  )
}

export function expectedNumeric(formula: string, values: Record<string, number>): number {
  return evaluate(formula, values)
}

export interface PlanAnswer {
  question_id: string
  position: number
  points_max: number
  variant: Variant
}

/**
 * Talaba uchun urinish rejasi: savollar tanlovi (tasodifiy N ta), tartibi va har birining varianti.
 * Deterministik: bir xil (talaba, nazorat) → bir xil reja.
 */
export function planAttempt(opts: {
  studentId: string
  assessmentId: string
  pool: PoolQuestion[]
  questionCount: number | null
  shuffleQuestions: boolean
  shuffleOptions: boolean
}): { seed: string; answers: PlanAnswer[] } {
  const seed = `${opts.studentId}:${opts.assessmentId}`
  const byPosition = [...opts.pool].sort((a, b) => a.position - b.position)
  let chosen = byPosition
  if (opts.questionCount && opts.questionCount < byPosition.length) {
    chosen = seededShuffle(byPosition, rngFor(`${seed}:pick`)).slice(0, opts.questionCount)
  }
  const ordered = opts.shuffleQuestions
    ? seededShuffle(chosen, rngFor(`${seed}:order`))
    : [...chosen].sort((a, b) => a.position - b.position)

  return {
    seed,
    answers: ordered.map((q, i) => ({
      question_id: q.id,
      position: i + 1,
      points_max: q.points,
      variant: makeVariant(q, seed, opts.shuffleOptions),
    })),
  }
}
