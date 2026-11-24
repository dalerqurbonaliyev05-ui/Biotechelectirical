import { describe, expect, it } from 'vitest'
import { checkNumeric, gradeAnswer, gradeMcq, parseNumberInput } from '@/lib/assessment/grade'

describe('parseNumberInput', () => {
  it('vergul va probellarni qabul qiladi', () => {
    expect(parseNumberInput('3,5')).toBe(3.5)
    expect(parseNumberInput(' 1 200 ')).toBe(1200)
    expect(parseNumberInput('-2e3')).toBe(-2000)
    expect(parseNumberInput(7)).toBe(7)
  })
  it('yaroqsizni rad etadi', () => {
    for (const bad of ['', 'abc', '1.2.3', '1,2,3', 'Infinity', null, undefined, NaN, {}])
      expect(parseNumberInput(bad)).toBeNull()
  })
})

describe('gradeMcq', () => {
  it('bitta to‘g‘ri javob', () => {
    expect(gradeMcq(2, ['a'], ['a'])).toMatchObject({ score: 2, isCorrect: true })
    expect(gradeMcq(2, ['b'], ['a'])).toMatchObject({ score: 0, isCorrect: false })
  })
  it('ko‘p javobli: aynan mos bo‘lsagina ball (qisman yo‘q)', () => {
    expect(gradeMcq(1, ['a', 'c'], ['a', 'c']).isCorrect).toBe(true)
    expect(gradeMcq(1, ['c', 'a'], ['a', 'c']).isCorrect).toBe(true)
    expect(gradeMcq(1, ['a'], ['a', 'c']).isCorrect).toBe(false)
    expect(gradeMcq(1, ['a', 'b', 'c'], ['a', 'c']).isCorrect).toBe(false)
  })
  it('javobsiz / noto‘g‘ri tur', () => {
    expect(gradeMcq(1, undefined, ['a'])).toMatchObject({ score: 0, isCorrect: false })
    expect(gradeMcq(1, [], ['a']).isCorrect).toBe(false)
    expect(gradeMcq(1, 'a', ['a']).isCorrect).toBe(false)
  })
})

describe('checkNumeric (±2% va birlik)', () => {
  const base = { expected: 10, expectedUnit: 'A', tolerancePct: 2 }
  it('tolerantlik chegarasida', () => {
    expect(checkNumeric({ ...base, response: { value: '10.2' } }).correct).toBe(true) // aynan +2%
    expect(checkNumeric({ ...base, response: { value: '9.8' } }).correct).toBe(true) // aynan −2%
    expect(checkNumeric({ ...base, response: { value: '10.21' } })).toEqual({
      correct: false,
      reason: 'out_of_tolerance',
    })
    expect(checkNumeric({ ...base, response: { value: '9.79' } }).correct).toBe(false)
  })
  it('birlik o‘giriladi: 500 mA = 0.5 A', () => {
    const r = checkNumeric({
      expected: 0.5,
      expectedUnit: 'A',
      tolerancePct: 2,
      response: { value: '500', unit: 'mA' },
    })
    expect(r.correct).toBe(true)
    expect(
      checkNumeric({
        expected: 2000,
        expectedUnit: 'W',
        tolerancePct: 1,
        response: { value: '2', unit: 'kW' },
      }).correct,
    ).toBe(true)
  })
  it('noto‘g‘ri kattalikdagi birlik rad etiladi', () => {
    expect(checkNumeric({ ...base, response: { value: '10', unit: 'V' } })).toEqual({
      correct: false,
      reason: 'unit_mismatch',
    })
    expect(checkNumeric({ ...base, response: { value: '10', unit: 'xyz' } }).reason).toBe(
      'unit_mismatch',
    )
  })
  it('birlik kiritilmasa savol birligi deb olinadi', () => {
    expect(checkNumeric({ ...base, response: { value: '10' } }).correct).toBe(true)
  })
  it('birliksiz savol: birlik tekshirilmaydi', () => {
    expect(
      checkNumeric({ expected: 5, expectedUnit: '', tolerancePct: 0, response: { value: '5' } })
        .correct,
    ).toBe(true)
  })
  it('javobsiz / yaroqsiz son', () => {
    expect(checkNumeric({ ...base, response: null }).reason).toBe('no_answer')
    expect(checkNumeric({ ...base, response: { value: '' } }).reason).toBe('no_answer')
    expect(checkNumeric({ ...base, response: { value: 'abc' } }).reason).toBe('bad_number')
  })
  it('nolga teng javob aniq bo‘lishi kerak', () => {
    expect(
      checkNumeric({ expected: 0, expectedUnit: '', tolerancePct: 5, response: { value: '0' } })
        .correct,
    ).toBe(true)
    expect(
      checkNumeric({ expected: 0, expectedUnit: '', tolerancePct: 5, response: { value: '0.1' } })
        .correct,
    ).toBe(false)
  })
  it('tolerantlik 0 bo‘lsa aynan teng', () => {
    expect(
      checkNumeric({ expected: 3, expectedUnit: '', tolerancePct: 0, response: { value: '3' } })
        .correct,
    ).toBe(true)
    expect(
      checkNumeric({ expected: 3, expectedUnit: '', tolerancePct: 0, response: { value: '3.001' } })
        .correct,
    ).toBe(false)
  })
})

describe('gradeAnswer', () => {
  const numericBase = {
    type: 'numeric' as const,
    points: 2,
    variant: { values: { U: 12, R: 4 } },
    params: { answer_unit: 'A', tolerance_pct: 2 },
    key: { correct: { formula: 'U / R' } },
  }
  it('elektr misoli: I = U/R = 3 A', () => {
    expect(gradeAnswer({ ...numericBase, response: { value: '3', unit: 'A' } })).toMatchObject({
      score: 2,
      isCorrect: true,
    })
    expect(gradeAnswer({ ...numericBase, response: { value: '3000', unit: 'mA' } })).toMatchObject({
      score: 2,
      isCorrect: true,
    })
    expect(gradeAnswer({ ...numericBase, response: { value: '4', unit: 'A' } })).toMatchObject({
      score: 0,
      isCorrect: false,
    })
  })
  it('javob berilmagan: 0 ball (tekshirish kerak emas)', () => {
    expect(gradeAnswer({ ...numericBase, response: null })).toMatchObject({
      score: 0,
      isCorrect: false,
      needsReview: false,
    })
  })
  it('formula buzilgan bo‘lsa — o‘qituvchi ko‘rib chiqadi (talaba jazolanmaydi)', () => {
    expect(
      gradeAnswer({
        ...numericBase,
        key: { correct: { formula: 'X / R' } },
        response: { value: '3' },
      }),
    ).toMatchObject({ score: null, needsReview: true })
  })
  it('short_text: matn bo‘lsa — o‘qituvchi; bo‘sh bo‘lsa — 0', () => {
    const base = { type: 'short_text' as const, points: 5, variant: {}, params: {}, key: null }
    expect(gradeAnswer({ ...base, response: { text: 'Javob' } })).toMatchObject({
      score: null,
      needsReview: true,
    })
    expect(gradeAnswer({ ...base, response: { text: '   ' } })).toMatchObject({
      score: 0,
      needsReview: false,
    })
    expect(gradeAnswer({ ...base, response: null })).toMatchObject({ score: 0, needsReview: false })
  })
  it('lab_task: natija bo‘lsa mutanosib ball, bo‘lmasa — o‘qituvchi', () => {
    const base = {
      type: 'lab_task' as const,
      points: 10,
      response: null,
      variant: {},
      params: {},
      key: null,
    }
    expect(gradeAnswer(base)).toMatchObject({ needsReview: true })
    expect(gradeAnswer({ ...base, labResult: { score: 7, max_score: 10 } })).toMatchObject({
      score: 7,
      isCorrect: false,
    })
    expect(gradeAnswer({ ...base, labResult: { score: 15, max_score: 10 } })).toMatchObject({
      score: 10,
      isCorrect: true,
    })
  })
})
