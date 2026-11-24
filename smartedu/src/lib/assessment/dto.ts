import { renderText, type PoolQuestion, type Variant } from './variant'
import { unitChoices } from './units'

/**
 * Talabaga yuboriladigan savol. HECH QACHON kalit, izoh, formula, rubrika yoki namuna javob bo'lmaydi.
 * (tests/assessment-dto.test.ts bu kafolatni tekshiradi.)
 */
export interface StudentQuestion {
  id: string
  position: number
  type: PoolQuestion['type']
  points: number
  text: string
  options?: { id: string; text: string }[]
  multiple?: boolean
  unitChoices?: string[]
  defaultUnit?: string
  labId?: string
}

export function toStudentQuestion(
  q: Pick<PoolQuestion, 'id' | 'type' | 'body' | 'params'> & {
    lab_ref?: { lab_id: string } | null
  },
  a: { position: number; points_max: number; variant: Variant },
): StudentQuestion {
  const out: StudentQuestion = {
    id: q.id,
    position: a.position,
    type: q.type,
    points: Number(a.points_max),
    text: renderText(String(q.body.text ?? ''), a.variant.values),
  }
  if (q.type === 'mcq') {
    const byId = new Map((q.body.options ?? []).map((o) => [o.id, o]))
    const order = a.variant.option_order ?? [...byId.keys()]
    out.options = order.flatMap((id) => {
      const o = byId.get(id)
      return o ? [{ id: o.id, text: o.text }] : []
    })
    out.multiple = Boolean(q.body.multiple)
  }
  if (q.type === 'numeric') {
    const unit = String(q.params.answer_unit ?? '')
    if (unit) {
      out.unitChoices = unitChoices(unit)
      out.defaultUnit = unit
    }
  }
  if (q.type === 'lab_task' && q.lab_ref) out.labId = q.lab_ref.lab_id
  return out
}
