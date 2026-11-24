import { describe, expect, it } from 'vitest'
import { isOwnPdfPath, lectureQuestionSchema } from '@/lib/lecture-schemas'

const uid = '00000000-0000-0000-0000-0000000000b1'

describe('isOwnPdfPath', () => {
  it('faqat o‘z papkasidagi .pdf', () => {
    expect(isOwnPdfPath(`${uid}/abc-123.pdf`, uid)).toBe(true)
    expect(isOwnPdfPath(`${uid}/ABC.PDF`, uid)).toBe(true)
  })
  it('boshqa papka, ichki papka, traversal, boshqa kengaytma — rad', () => {
    expect(isOwnPdfPath('00000000-0000-0000-0000-0000000000b2/a.pdf', uid)).toBe(false)
    expect(isOwnPdfPath(`${uid}/sub/a.pdf`, uid)).toBe(false)
    expect(isOwnPdfPath(`${uid}/../a.pdf`, uid)).toBe(false)
    expect(isOwnPdfPath(`${uid}/a.pptx`, uid)).toBe(false)
    expect(isOwnPdfPath(`${uid}/a b.pdf`, uid)).toBe(false)
  })
})

describe('lectureQuestionSchema', () => {
  const q = '00000000-0000-0000-0000-0000000000c1'
  it('oraliqlar', () => {
    expect(lectureQuestionSchema.safeParse({ slide_no: 3, question_id: q }).success).toBe(true)
    expect(lectureQuestionSchema.safeParse({ slide_no: 0, question_id: q }).success).toBe(false)
    expect(
      lectureQuestionSchema.safeParse({ slide_no: 3, question_id: q, time_limit_sec: 4 }).success,
    ).toBe(false)
    expect(
      lectureQuestionSchema.safeParse({ slide_no: 3, question_id: q, time_limit_sec: null })
        .success,
    ).toBe(true)
  })
})
