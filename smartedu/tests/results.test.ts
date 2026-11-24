import { describe, expect, it } from 'vitest'
import { describeCorrect, describeResponse, renderQuestionText } from '@/lib/assessment/result-view'
import { bookUrl } from '@/lib/books'
import { medalFor, rankEntries } from '@/lib/ranking'

describe('rankEntries', () => {
  it('musobaqa reytingi: 1, 2, 2, 4', () => {
    const r = rankEntries([
      { id: 'a', score: 90 },
      { id: 'b', score: 80 },
      { id: 'c', score: 80 },
      { id: 'd', score: 70 },
    ])
    expect([...r.entries()]).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 2],
      ['d', 4],
    ])
  })
  it('tiebreak: kam vaqt yuqoriroq; teng bo‘lsa — teng o‘rin', () => {
    const r = rankEntries([
      { id: 'a', score: 100, tiebreak: 5000 },
      { id: 'b', score: 100, tiebreak: 3000 },
      { id: 'c', score: 100, tiebreak: 3000 },
      { id: 'd', score: 50 },
    ])
    expect(r.get('b')).toBe(1)
    expect(r.get('c')).toBe(1)
    expect(r.get('a')).toBe(3)
    expect(r.get('d')).toBe(4)
  })
  it('bo‘sh va yagona', () => {
    expect(rankEntries([]).size).toBe(0)
    expect(rankEntries([{ id: 'x', score: 0 }]).get('x')).toBe(1)
  })
  it('medallar 1–3-o‘ringa', () => {
    expect([1, 2, 3, 4].map(medalFor)).toEqual(['gold', 'silver', 'bronze', null])
  })
})

describe('bookUrl (kutubxona chuqur havolasi)', () => {
  it('sahifa bilan va sahifasiz', () => {
    expect(bookUrl('https://energyvibe.uz/kutubxona', 'ohm-qonuni', 12)).toBe(
      'https://energyvibe.uz/kutubxona/#/kitob/ohm-qonuni/12',
    )
    expect(bookUrl('https://energyvibe.uz/kutubxona/', 'ohm-qonuni')).toBe(
      'https://energyvibe.uz/kutubxona/#/kitob/ohm-qonuni',
    )
    expect(bookUrl('https://x.uz/k', 'a b/c', 0)).toBe('https://x.uz/k/#/kitob/a%20b%2Fc')
  })
})

describe('result-view', () => {
  const mcq = {
    type: 'mcq' as const,
    body: {
      text: 'T',
      options: [
        { id: 'a', text: 'Bir' },
        { id: 'b', text: 'Ikki' },
      ],
    },
    params: {},
  }
  const num = {
    type: 'numeric' as const,
    body: { text: 'U={U}, R={R}' },
    params: { answer_unit: 'A', tolerance_pct: 2 },
  }
  it('javobni o‘qiladigan qiladi', () => {
    expect(describeResponse(mcq, { selected: ['b', 'a'] }, {})).toBe('Ikki; Bir')
    expect(describeResponse(num, { value: '3', unit: 'mA' }, {})).toBe('3 mA')
    expect(describeResponse(mcq, null, {})).toBe('')
  })
  it('to‘g‘ri javob: talabaning o‘z qiymatlari bo‘yicha', () => {
    expect(describeCorrect(mcq, { correct: ['a'] }, {})).toBe('Bir')
    expect(describeCorrect(num, { correct: { formula: 'U/R' } }, { values: { U: 12, R: 4 } })).toBe(
      '3 A (±2%)',
    )
    expect(renderQuestionText(num, { values: { U: 12, R: 4 } })).toBe('U=12, R=4')
  })
  it('kalit yo‘q yoki formula xato bo‘lsa bo‘sh (xatolik tashlamaydi)', () => {
    expect(describeCorrect(num, null, {})).toBe('')
    expect(describeCorrect(num, { correct: { formula: 'X/Y' } }, { values: {} })).toBe('')
  })
})
