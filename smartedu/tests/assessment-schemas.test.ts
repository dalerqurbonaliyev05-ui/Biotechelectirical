import { describe, expect, it } from 'vitest'
import { parseQuestionRecords, questionCsvTemplate } from '@/lib/assessment/csv-import'
import {
  fromDbRows,
  questionInputSchema,
  toDbRows,
  type QuestionInput,
} from '@/lib/assessment/schemas'
import Papa from 'papaparse'

const S = '00000000-0000-0000-0000-00000000b001'

describe('questionInputSchema', () => {
  const numeric = {
    type: 'numeric',
    subject_id: S,
    text: 'U={U} V, R={R} Ω',
    vars: { U: { min: 10, max: 24, step: 2 }, R: { min: 2, max: 10 } },
    formula: 'U/R',
    answer_unit: 'A',
    tolerance_pct: 2,
  }
  it('to‘g‘ri numeric savolni qabul qiladi', () => {
    expect(questionInputSchema.safeParse(numeric).success).toBe(true)
  })
  it.each([
    ['noma’lum o‘zgaruvchi formulada', { formula: 'U/X' }, 'formula_unknown_var'],
    ['buzuq formula', { formula: 'U/' }, 'formula_invalid'],
    ['matndagi noma’lum {X}', { text: 'U={U}, X={X}' }, 'placeholder_unknown'],
    ['noma’lum birlik', { answer_unit: 'xyz' }, 'unit_unknown'],
    [
      'zahiralangan nom',
      { vars: { sqrt: { min: 1, max: 2 } }, formula: 'sqrt', text: 'Savol matni' },
      'var_name',
    ],
    ['min > max', { vars: { U: { min: 5, max: 1 }, R: { min: 1, max: 2 } } }, 'var_range'],
    [
      'nolga bo‘linish ehtimoli (R=0 oraliqda)',
      { vars: { U: { min: 1, max: 2 }, R: { min: 0, max: 5 } } },
      'formula_invalid',
    ],
  ])('%s rad etiladi', (_n, patch, msg) => {
    const r = questionInputSchema.safeParse({ ...numeric, ...patch })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toBe(msg)
  })
  it('mcq: to‘g‘ri javob indeksi oraliqda bo‘lishi shart', () => {
    const bad = questionInputSchema.safeParse({
      type: 'mcq',
      subject_id: S,
      text: 'Savol?',
      options: [{ text: 'a' }, { text: 'b' }],
      correct_indexes: [2],
    })
    expect(bad.success).toBe(false)
  })
})

describe('toDbRows / fromDbRows', () => {
  it('kalit va ochiq qism ajratiladi: to‘g‘ri javob faqat key ichida', () => {
    const q: QuestionInput = questionInputSchema.parse({
      type: 'mcq',
      subject_id: S,
      text: 'Savol?',
      options: [{ text: 'Bir' }, { text: 'Ikki' }, { text: 'Uch' }],
      correct_indexes: [2, 0],
      explanation: 'Izoh',
      topic: ' Mavzu ',
      book_ref: { slug: 'kitob', page: 5 },
    })
    const { question, key } = toDbRows(q)
    expect(key.correct).toEqual(['a', 'c'])
    expect(key.explanation).toBe('Izoh')
    expect(JSON.stringify(question)).not.toContain('Izoh')
    expect(question.body).toMatchObject({ multiple: true })
    expect(question.topic).toBe('Mavzu')
    expect(question.book_ref).toEqual({ slug: 'kitob', page: 5 })
  })
  it('aylanma: numeric va short_text', () => {
    const inputs = [
      questionInputSchema.parse({
        type: 'numeric',
        subject_id: S,
        text: 'U={U}',
        vars: { U: { min: 1, max: 5, step: 1 } },
        formula: 'U*2',
        answer_unit: 'V',
        tolerance_pct: 1,
      }),
      questionInputSchema.parse({
        type: 'short_text',
        subject_id: S,
        text: 'Yozing',
        rubric: [{ criterion: 'a', points: 2 }],
        sample: 'ns',
      }),
      questionInputSchema.parse({
        type: 'lab_task',
        subject_id: S,
        text: 'Lab',
        lab_id: 'motor-01',
        max_points: 5,
      }),
    ]
    for (const input of inputs) {
      const { question, key } = toDbRows(input)
      const back = fromDbRows({ ...question, book_ref: question.book_ref }, key)
      expect(back).toMatchObject({ type: input.type, text: input.text })
      expect(questionInputSchema.safeParse(back).success).toBe(true)
    }
  })
})

describe('CSV namuna fayli', () => {
  it('namuna fayl to‘liq va xatosiz o‘qiladi (4 tur)', () => {
    const rec = Papa.parse<Record<string, string>>(questionCsvTemplate().replace(/^\uFEFF/, ''), {
      header: true,
      skipEmptyLines: true,
    }).data
    const { questions, issues } = parseQuestionRecords(rec, S)
    expect(issues).toEqual([])
    expect(questions.map((q) => q.type)).toEqual(['mcq', 'numeric', 'short_text', 'lab_task'])
    const num = questions[1]!
    expect(num.type === 'numeric' && num.vars.U).toEqual({ min: 10, max: 24, step: 2 })
  })
  it('xatolarni qator raqami bilan qaytaradi', () => {
    const { questions, issues } = parseQuestionRecords(
      [
        { type: 'mcq', text: 'Yaxshi savol?', options: 'a|b', correct: 'C' },
        { type: 'nomalum', text: 'x' },
        { type: 'numeric', text: 'U={U}', vars: 'U:1..5', formula: 'U/Z' },
        { type: 'mcq', text: 'To‘g‘ri', options: 'a|b|c', correct: '2|3' },
        { type: '', text: '' },
      ],
      S,
    )
    expect(questions).toHaveLength(1)
    expect(issues.map((i) => [i.row, i.message])).toEqual([
      [2, 'correct_out_of_range'],
      [3, 'type_unknown'],
      [4, 'formula_unknown_var'],
    ])
  })
})
