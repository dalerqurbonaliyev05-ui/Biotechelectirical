import { expectedNumeric } from './variant'
import { parseUnit } from './units'

export interface GradeResult {
  score: number | null
  isCorrect: boolean | null
  /** O'qituvchi tekshirishi kerak (short_text, lab_task natijasiz) */
  needsReview: boolean
  note?: string
}

export const round2 = (n: number) => Math.round(n * 100) / 100

/** "3,5" → 3.5; bo'sh/yaroqsiz → null */
export function parseNumberInput(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (typeof raw !== 'string') return null
  const s = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Ko'p to'g'ri javobli savol: to'plam AYNAN mos bo'lsa to'liq ball, aks holda 0 (qisman ball yo'q). */
export function gradeMcq(points: number, selected: unknown, correct: string[]): GradeResult {
  const sel = Array.isArray(selected)
    ? [...new Set(selected.filter((x): x is string => typeof x === 'string'))]
    : []
  const ok = sel.length === correct.length && correct.every((c) => sel.includes(c))
  return { score: ok ? points : 0, isCorrect: ok, needsReview: false }
}

export interface NumericCheck {
  correct: boolean
  reason?: 'no_answer' | 'bad_number' | 'unit_mismatch' | 'out_of_tolerance'
}

/**
 * Raqamli javob: nisbiy tolerantlik (%) va birlik hisobga olinadi. Birlik qo'yilmasa — savol birligi deb olinadi.
 * Qo'shimcha (mA ↔ A) avtomatik o'giriladi.
 */
export function checkNumeric(opts: {
  expected: number
  expectedUnit: string
  tolerancePct: number
  response: { value?: unknown; unit?: unknown } | null | undefined
}): NumericCheck {
  const { response } = opts
  if (
    !response ||
    response.value === undefined ||
    response.value === null ||
    response.value === ''
  ) {
    return { correct: false, reason: 'no_answer' }
  }
  const value = parseNumberInput(response.value)
  if (value === null) return { correct: false, reason: 'bad_number' }

  let factorResp = 1
  let factorExp = 1
  if (opts.expectedUnit) {
    const exp = parseUnit(opts.expectedUnit)
    const unitRaw =
      typeof response.unit === 'string' && response.unit.trim() ? response.unit : opts.expectedUnit
    const got = parseUnit(unitRaw)
    if (!exp || !got || exp.base !== got.base) return { correct: false, reason: 'unit_mismatch' }
    factorExp = exp.factor
    factorResp = got.factor
  }
  const e = opts.expected * factorExp
  const r = value * factorResp
  const tol = (Math.abs(e) * opts.tolerancePct) / 100 + 1e-12 * Math.max(1, Math.abs(e))
  return Math.abs(r - e) <= tol ? { correct: true } : { correct: false, reason: 'out_of_tolerance' }
}

export interface GradeInput {
  type: 'mcq' | 'numeric' | 'short_text' | 'lab_task'
  points: number
  response: unknown
  variant: { values?: Record<string, number> }
  params: { answer_unit?: string; tolerance_pct?: number; max_points?: number }
  key: { correct: unknown } | null
  /** lab_task: tashqi laboratoriyadan kelgan natija (9-bosqich) */
  labResult?: { score: number; max_score: number } | null
}

/** Avtomatik tekshirish (topshirishda). */
export function gradeAnswer(inp: GradeInput): GradeResult {
  const resp = (inp.response ?? null) as Record<string, unknown> | null
  switch (inp.type) {
    case 'mcq':
      return gradeMcq(inp.points, resp?.selected, (inp.key?.correct as string[] | undefined) ?? [])
    case 'numeric': {
      const formula = (inp.key?.correct as { formula?: string } | null)?.formula
      if (!formula) return { score: null, isCorrect: null, needsReview: true, note: 'no_key' }
      let expected: number
      try {
        expected = expectedNumeric(formula, inp.variant.values ?? {})
      } catch {
        return { score: null, isCorrect: null, needsReview: true, note: 'formula_error' }
      }
      const res = checkNumeric({
        expected,
        expectedUnit: inp.params.answer_unit ?? '',
        tolerancePct: inp.params.tolerance_pct ?? 2,
        response: resp as { value?: unknown; unit?: unknown } | null,
      })
      return {
        score: res.correct ? inp.points : 0,
        isCorrect: res.correct,
        needsReview: false,
        ...(res.reason ? { note: res.reason } : {}),
      }
    }
    case 'short_text': {
      const text = typeof resp?.text === 'string' ? resp.text.trim() : ''
      // Bo'sh javob tekshirishni talab qilmaydi
      if (!text) return { score: 0, isCorrect: false, needsReview: false, note: 'no_answer' }
      return { score: null, isCorrect: null, needsReview: true }
    }
    case 'lab_task': {
      if (inp.labResult && inp.labResult.max_score > 0) {
        const ratio = Math.min(1, Math.max(0, inp.labResult.score / inp.labResult.max_score))
        const score = round2(inp.points * ratio)
        return { score, isCorrect: score >= inp.points, needsReview: false }
      }
      return { score: null, isCorrect: null, needsReview: true, note: 'no_lab_result' }
    }
  }
}
