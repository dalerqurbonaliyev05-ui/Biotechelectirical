import { z } from 'zod'

export const lectureCreateSchema = z.object({
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
