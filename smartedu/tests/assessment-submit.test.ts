import { describe, expect, it } from 'vitest'
import { buildSubmitResults, parseResponse, type SubmitAnswer } from '@/lib/assessment/submit'

const base = { variant: {}, params: {}, key: null, lab: null }

describe('buildSubmitResults', () => {
  const answers: SubmitAnswer[] = [
    {
      ...base,
      id: 'a1',
      type: 'mcq',
      points_max: 1,
      response: { selected: ['b'] },
      key: { correct: ['b'] },
    },
    {
      ...base,
      id: 'a2',
      type: 'mcq',
      points_max: 1,
      response: { selected: ['a'] },
      key: { correct: ['b'] },
    },
    { ...base, id: 'a3', type: 'mcq', points_max: 1, response: null, key: { correct: ['b'] } },
    {
      ...base,
      id: 'a4',
      type: 'numeric',
      points_max: 2,
      response: { value: '3', unit: 'A' },
      variant: { values: { U: 12, R: 4 } },
      params: { answer_unit: 'A', tolerance_pct: 2 },
      key: { correct: { formula: 'U/R' } },
    },
    { ...base, id: 'a5', type: 'short_text', points_max: 5, response: { text: 'Javob matni' } },
    { ...base, id: 'a6', type: 'short_text', points_max: 5, response: null },
    {
      ...base,
      id: 'a7',
      type: 'lab_task',
      points_max: 10,
      response: null,
      lab: { score: 8, max_score: 10 },
    },
    { ...base, id: 'a8', type: 'lab_task', points_max: 10, response: null },
  ]
  const r = Object.fromEntries(buildSubmitResults(answers).map((x) => [x.answer_id, x]))

  it('mcq va numeric avtomatik', () => {
    expect(r.a1).toMatchObject({ score: 1, is_correct: true, needs_review: false })
    expect(r.a2).toMatchObject({ score: 0, is_correct: false, needs_review: false })
    expect(r.a3).toMatchObject({ score: 0, is_correct: false, needs_review: false })
    expect(r.a4).toMatchObject({ score: 2, is_correct: true })
  })
  it('yozma javob o‘qituvchiga qoldiriladi; bo‘sh javob 0', () => {
    expect(r.a5).toMatchObject({ score: null, needs_review: true })
    expect(r.a6).toMatchObject({ score: 0, needs_review: false })
  })
  it('laboratoriya: natija bo‘lsa mutanosib ball, bo‘lmasa tekshiruvga', () => {
    expect(r.a7).toMatchObject({ score: 8, needs_review: false })
    expect(r.a8).toMatchObject({ score: null, needs_review: true })
  })
})

describe('parseResponse (talaba kiritishini tekshirish)', () => {
  it('to‘g‘ri shakllarni qabul qiladi', () => {
    expect(parseResponse('mcq', { selected: ['a'] })).toEqual({ selected: ['a'] })
    expect(parseResponse('numeric', { value: '3,5', unit: 'mA' })).toEqual({
      value: '3,5',
      unit: 'mA',
    })
    expect(parseResponse('short_text', { text: 'x' })).toEqual({ text: 'x' })
  })
  it('noto‘g‘ri/xavfli kiritishni rad etadi', () => {
    expect(parseResponse('mcq', { selected: 'a' })).toBeNull()
    expect(parseResponse('mcq', { selected: Array(9).fill('a') })).toBeNull()
    expect(parseResponse('numeric', { value: 'x'.repeat(41) })).toBeNull()
    expect(parseResponse('short_text', { text: 'x'.repeat(5001) })).toBeNull()
    expect(parseResponse('short_text', null)).toBeNull()
    expect(parseResponse('short_text', { text: 5 })).toBeNull()
  })
  it('ortiqcha maydonlar tashlab yuboriladi (ball yoki is_correct yuborib bo‘lmaydi)', () => {
    expect(parseResponse('mcq', { selected: ['a'], score: 100, is_correct: true })).toEqual({
      selected: ['a'],
    })
  })
})
