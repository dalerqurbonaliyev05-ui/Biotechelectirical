import { describe, expect, it } from 'vitest'
import { toStudentQuestion } from '@/lib/assessment/dto'
import { planAttempt, renderText, type PoolQuestion } from '@/lib/assessment/variant'

const mcq: PoolQuestion = {
  id: 'q-mcq',
  type: 'mcq',
  body: {
    text: 'Tanlang',
    options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: `Variant ${id}` })),
    multiple: false,
  },
  params: {},
  points: 1,
  position: 1,
}
const numeric: PoolQuestion = {
  id: 'q-num',
  type: 'numeric',
  body: { text: 'U = {U} V, R = {R} Ω. Tokni toping.' },
  params: {
    vars: { U: { min: 10, max: 24, step: 2 }, R: { min: 2, max: 10, step: 1 } },
    answer_unit: 'A',
  },
  points: 2,
  position: 2,
}
const pool: PoolQuestion[] = [
  mcq,
  numeric,
  ...[3, 4, 5, 6].map((i) => ({ ...mcq, id: `q${i}`, position: i })),
]
const opts = {
  assessmentId: 'A1',
  pool,
  questionCount: null,
  shuffleQuestions: true,
  shuffleOptions: true,
}

describe('planAttempt', () => {
  it('deterministik: bir xil talaba → bir xil reja (qayta kirsa o‘sha savol)', () => {
    expect(planAttempt({ ...opts, studentId: 'S1' })).toEqual(
      planAttempt({ ...opts, studentId: 'S1' }),
    )
  })
  it('urug‘ = talaba id + nazorat id', () => {
    expect(planAttempt({ ...opts, studentId: 'S1' }).seed).toBe('S1:A1')
  })
  it('har talabaga boshqa boshlang‘ich qiymatlar (ko‘chirib bo‘lmaydi)', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const plan = planAttempt({ ...opts, studentId: `student-${i}` })
      const v = plan.answers.find((a) => a.question_id === 'q-num')?.variant.values
      seen.add(JSON.stringify(v))
    }
    expect(seen.size).toBeGreaterThan(15)
  })
  it('qiymatlar oraliq va qadamga mos', () => {
    for (let i = 0; i < 100; i++) {
      const v = planAttempt({ ...opts, studentId: `s${i}` }).answers.find(
        (a) => a.question_id === 'q-num',
      )!.variant.values!
      expect(v.U).toBeGreaterThanOrEqual(10)
      expect(v.U).toBeLessThanOrEqual(24)
      expect((v.U! - 10) % 2).toBe(0)
      expect(Number.isInteger(v.R)).toBe(true)
    }
  })
  it('tasodifiy tanlov: N ta, takrorsiz, tarkib talabaga bog‘liq', () => {
    const plan = planAttempt({ ...opts, studentId: 'S1', questionCount: 3 })
    expect(plan.answers).toHaveLength(3)
    expect(new Set(plan.answers.map((a) => a.question_id)).size).toBe(3)
    expect(plan.answers.map((a) => a.position)).toEqual([1, 2, 3])
    const sets = new Set<string>()
    for (let i = 0; i < 30; i++)
      sets.add(
        planAttempt({ ...opts, studentId: `x${i}`, questionCount: 3 })
          .answers.map((a) => a.question_id)
          .sort()
          .join(),
      )
    expect(sets.size).toBeGreaterThan(3)
  })
  it('N savollar sonidan ko‘p bo‘lsa — hammasi', () => {
    expect(planAttempt({ ...opts, studentId: 'S1', questionCount: 99 }).answers).toHaveLength(6)
  })
  it('aralashtirmasa — asl tartib', () => {
    const plan = planAttempt({
      ...opts,
      studentId: 'S1',
      shuffleQuestions: false,
      shuffleOptions: false,
    })
    expect(plan.answers.map((a) => a.question_id)).toEqual([
      'q-mcq',
      'q-num',
      'q3',
      'q4',
      'q5',
      'q6',
    ])
    expect(plan.answers[0]!.variant.option_order).toEqual(['a', 'b', 'c', 'd'])
  })
  it('variantlar aralashadi (barcha variantlar saqlanadi)', () => {
    const orders = new Set<string>()
    for (let i = 0; i < 30; i++) {
      const o = planAttempt({ ...opts, studentId: `s${i}` }).answers.find(
        (a) => a.question_id === 'q-mcq',
      )!.variant.option_order!
      expect([...o].sort()).toEqual(['a', 'b', 'c', 'd'])
      orders.add(o.join(''))
    }
    expect(orders.size).toBeGreaterThan(5)
  })
})

describe('renderText', () => {
  it('o‘rinbosarlarni almashtiradi, noma’lumini qoldiradi', () => {
    expect(renderText('U={U}, X={X}', { U: 12 })).toBe('U=12, X={X}')
    expect(renderText('{constructor}', { U: 1 })).toBe('{constructor}')
  })
})

describe('toStudentQuestion (sizib chiqish yo‘q)', () => {
  it('talabaga kalit/formula/izoh/rubrika bermaydi', () => {
    const secretNumeric = {
      ...numeric,
      params: { ...numeric.params, tolerance_pct: 2, rubric: [{ criterion: 'maxfiy', points: 1 }] },
    }
    const plan = planAttempt({ ...opts, studentId: 'S1', pool: [mcq, secretNumeric] })
    const dtos = plan.answers.map((a) =>
      toStudentQuestion(a.question_id === 'q-mcq' ? mcq : secretNumeric, a),
    )
    const json = JSON.stringify(dtos)
    for (const forbidden of [
      'correct',
      'formula',
      'explanation',
      'rubric',
      'maxfiy',
      'sample',
      'tolerance',
      'U / R',
    ]) {
      expect(json).not.toContain(forbidden)
    }
    const num = dtos.find((d) => d.type === 'numeric')!
    expect(num.text).toMatch(/U = \d+ V, R = \d+ Ω/)
    expect(num.unitChoices).toContain('mA')
    expect(num.defaultUnit).toBe('A')
  })
  it('variantlar talabaning tartibida', () => {
    const plan = planAttempt({ ...opts, studentId: 'S7' })
    const a = plan.answers.find((x) => x.question_id === 'q-mcq')!
    const dto = toStudentQuestion(mcq, a)
    expect(dto.options!.map((o) => o.id)).toEqual(a.variant.option_order)
  })
})
