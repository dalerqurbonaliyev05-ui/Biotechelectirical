import { z } from 'zod'

export const assessmentSchema = z
  .object({
    subject_id: z.guid(),
    group_id: z.guid(),
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(2000).nullish(),
    opens_at: z.iso.datetime({ offset: true }),
    closes_at: z.iso.datetime({ offset: true }),
    duration_minutes: z.number().int().min(1).max(600),
    question_count: z.number().int().min(1).max(200).nullable(),
    shuffle_questions: z.boolean(),
    shuffle_options: z.boolean(),
    show_score: z.enum(['immediate', 'after_close', 'after_finalize']),
    reveal_answers: z.enum(['never', 'after_close', 'manual']),
    weight: z.number().int().min(0).max(1000),
    is_published: z.boolean(),
    questions: z
      .array(z.object({ question_id: z.guid(), points: z.number().min(0.5).max(100) }))
      .min(1)
      .max(200),
  })
  .refine((a) => new Date(a.closes_at) > new Date(a.opens_at), { message: 'closes_before_opens' })
  .refine((a) => a.question_count === null || a.question_count <= a.questions.length, {
    message: 'question_count_too_big',
  })
  .refine((a) => new Set(a.questions.map((q) => q.question_id)).size === a.questions.length, {
    message: 'duplicate_question',
  })

export type AssessmentInput = z.infer<typeof assessmentSchema>
