import { checkNumeric, gradeMcq } from '@/lib/assessment/grade'
import { unitChoices } from '@/lib/assessment/units'
import {
  expectedNumeric,
  renderText,
  type NumericVarDef,
  type PoolQuestion,
  type Variant,
} from '@/lib/assessment/variant'

/**
 * Jonli savol ko'rinishi (doska va talaba telefoni uchun). To'g'ri javob, formula, izoh — HECH QACHON.
 * Variantlar tartibi BARCHA uchun bir xil (doskadagi A/B/C/D telefondagi bilan mos bo'lsin).
 */
export interface LiveQuestionView {
  id: string // session_question id
  slide: number
  type: 'mcq' | 'numeric'
  text: string
  options?: { id: string; text: string }[]
  multiple?: boolean
  unitChoices?: string[]
  defaultUnit?: string
  openedAt: string
  timeLimitSec: number
  /** Serverning "hozir"i: mijoz taymerni shunga nisbatan yuritadi */
  serverNow: string
  status: 'open' | 'closed'
}

type LiveQ = Pick<PoolQuestion, 'type' | 'body' | 'params'>
interface SqRow {
  id: string
  slide_no: number
  time_limit_sec: number
  variant: Variant
  opened_at: string
  closed_at: string | null
}

export function buildLiveQuestion(sq: SqRow, q: LiveQ, now: Date): LiveQuestionView | null {
  if (q.type !== 'mcq' && q.type !== 'numeric') return null
  const view: LiveQuestionView = {
    id: sq.id,
    slide: sq.slide_no,
    type: q.type,
    text: renderText(String(q.body.text ?? ''), sq.variant?.values),
    openedAt: sq.opened_at,
    timeLimitSec: sq.time_limit_sec,
    serverNow: now.toISOString(),
    status: sq.closed_at ? 'closed' : 'open',
  }
  if (q.type === 'mcq') {
    view.options = (q.body.options ?? []).map((o) => ({ id: o.id, text: o.text }))
    view.multiple = Boolean(q.body.multiple)
  } else {
    const unit = String(q.params.answer_unit ?? '')
    if (unit) {
      view.unitChoices = unitChoices(unit)
      view.defaultUnit = unit
    }
  }
  return view
}

/** Raqamli savol uchun butun auditoriyaga bir xil qiymatlar (urug' bilan, qayta ochilsa ham o'zgarmaydi). */
export function sharedVariant(
  q: LiveQ,
  generate: (vars: Record<string, NumericVarDef>) => Record<string, number>,
): Variant {
  return q.type === 'numeric'
    ? { values: generate((q.params.vars ?? {}) as Record<string, NumericVarDef>) }
    : {}
}

/** Javob to'g'rimi? (mcq: aniq to'plam mosligi; numeric: tolerantlik va birlik bilan). */
export function gradeLiveResponse(
  q: LiveQ,
  key: { correct: unknown } | null,
  variant: Variant,
  response: unknown,
): boolean {
  const r = (response ?? null) as Record<string, unknown> | null
  if (!key || !r) return false
  if (q.type === 'mcq')
    return gradeMcq(1, r.selected, (key.correct as string[] | null) ?? []).isCorrect === true
  if (q.type === 'numeric') {
    const formula = (key.correct as { formula?: string } | null)?.formula
    if (!formula) return false
    try {
      return checkNumeric({
        expected: expectedNumeric(formula, variant.values ?? {}),
        expectedUnit: String(q.params.answer_unit ?? ''),
        tolerancePct: Number(q.params.tolerance_pct ?? 2),
        response: r as { value?: unknown; unit?: unknown },
      }).correct
    } catch {
      return false
    }
  }
  return false
}
