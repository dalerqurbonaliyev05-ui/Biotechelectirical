import { expectedNumeric, renderText, type PoolQuestion, type Variant } from './variant'

type Q = Pick<PoolQuestion, 'type' | 'body' | 'params'>

/** Talaba javobini odam o'qiydigan ko'rinishga keltiradi. */
export function describeResponse(q: Q, response: unknown, variant: Variant): string {
  const r = (response ?? null) as Record<string, unknown> | null
  if (!r) return ''
  if (q.type === 'mcq') {
    const sel = Array.isArray(r.selected) ? (r.selected as string[]) : []
    const texts = new Map((q.body.options ?? []).map((o) => [o.id, o.text]))
    return sel.map((id) => texts.get(id) ?? '?').join('; ')
  }
  if (q.type === 'numeric') {
    const unit =
      typeof r.unit === 'string' ? r.unit : ((q.params.answer_unit as string | undefined) ?? '')
    return `${String(r.value ?? '')} ${unit}`.trim()
  }
  if (q.type === 'short_text') return String(r.text ?? '')
  void variant
  return ''
}

/** To'g'ri javobni ko'rsatadi (FAQAT reveal ruxsat berilganda chaqiriladi). */
export function describeCorrect(q: Q, key: { correct: unknown } | null, variant: Variant): string {
  if (!key) return ''
  if (q.type === 'mcq') {
    const ids = (key.correct as string[] | null) ?? []
    const texts = new Map((q.body.options ?? []).map((o) => [o.id, o.text]))
    return ids.map((id) => texts.get(id) ?? '?').join('; ')
  }
  if (q.type === 'numeric') {
    const formula = (key.correct as { formula?: string } | null)?.formula
    if (!formula) return ''
    try {
      const v = expectedNumeric(formula, variant.values ?? {})
      const unit = (q.params.answer_unit as string | undefined) ?? ''
      const tol = Number(q.params.tolerance_pct ?? 2)
      return `${Number(v.toPrecision(6))} ${unit} (±${tol}%)`.replace(/\s+\(/, ' (')
    } catch {
      return ''
    }
  }
  if (q.type === 'short_text')
    return String((key.correct as { sample?: string | null } | null)?.sample ?? '')
  return ''
}

export function renderQuestionText(q: Q, variant: Variant): string {
  return renderText(String(q.body.text ?? ''), variant.values)
}
