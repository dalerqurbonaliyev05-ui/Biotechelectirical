import { z } from 'zod'

export const lectureCreateSchema = z.object({
  /** Miniatyura yo'llari (indeks+1 = slayd raqami); ixtiyoriy */
  thumbs: z.array(z.string().max(200).nullable()).max(2000).optional(),
  title: z.string().trim().min(3).max(200),
  subject_id: z.guid(),
  pdf_path: z.string().min(5).max(200),
  page_count: z.number().int().min(1).max(2000),
})

export const lectureQuestionSchema = z.object({
  slide_no: z.number().int().min(1).max(2000),
  question_id: z.guid(),
  time_limit_sec: z.number().int().min(5).max(600).nullable().optional(),
})

/** Storage yo'li: faqat `<foydalanuvchi_id>/<fayl>.pdf` (boshqa papkaga ishora qilib bo'lmaydi). */
export function isOwnPdfPath(path: string, userId: string): boolean {
  return (
    new RegExp(`^${userId}/[A-Za-z0-9._-]{1,100}\\.pdf$`, 'i').test(path) && !path.includes('..')
  )
}

/** Jonli rejimda faqat avtomatik tekshiriladigan savol turlari */
export const LIVE_TYPES = ['mcq', 'numeric'] as const

/** Miniatyura yo'li: `<uid>/<papka>/<n>.jpg` — faqat o'z papkasi, ichma-ich yo'q. */
export function isOwnThumbPath(path: string, userId: string): boolean {
  return (
    new RegExp(`^${userId}/[A-Za-z0-9._-]{1,100}/\\d{1,4}\\.jpg$`, 'i').test(path) &&
    !path.includes('..')
  )
}

/** Nuqtaga savol qo'shish: bankdan (question_id) YOKI shu yerning o'zida yangi test savoli (2–6 variant). */
export const checkpointQuestionSchema = z
  .object({
    after_slide: z.number().int().min(1).max(2000),
    time_limit_sec: z.number().int().min(5).max(600).nullable().optional(),
    is_bonus: z.boolean().optional(),
    question_id: z.guid().optional(),
    new_question: z
      .object({
        text: z.string().trim().min(3).max(4000),
        options: z
          .array(z.object({ text: z.string().trim().min(1).max(500) }))
          .min(2)
          .max(6),
        correct_indexes: z.array(z.number().int().min(0).max(5)).min(1),
        explanation: z.string().trim().max(4000).nullish(),
        topic: z.string().trim().max(200).nullish(),
      })
      .optional(),
  })
  .refine((b) => Boolean(b.question_id) !== Boolean(b.new_question), { message: 'one_of_question' })

export const checkpointItemPatchSchema = z
  .object({
    time_limit_sec: z.number().int().min(5).max(600).nullable(),
    is_bonus: z.boolean(),
    move: z.enum(['up', 'down']),
  })
  .partial()

export const slideBookSchema = z.object({
  slide_no: z.number().int().min(1).max(2000),
  title: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/),
  page: z.number().int().min(1).max(10000).nullable().optional(),
})
