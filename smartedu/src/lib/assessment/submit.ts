import { z } from 'zod'
import { gradeAnswer, type GradeInput } from './grade'

export interface SubmitAnswer {
  id: string
  type: GradeInput['type']
  points_max: number
  response: unknown
  variant: { values?: Record<string, number> }
  params: GradeInput['params']
  key: { correct: unknown } | null
  lab?: { score: number; max_score: number } | null
}

export interface SubmitResult {
  answer_id: string
  score: number | null
  is_correct: boolean | null
  needs_review: boolean
}

/** Topshirishda har bir javobni baholaydi. DB funksiyasi (`app_submit_attempt`) shuni qabul qiladi. */
export function buildSubmitResults(answers: SubmitAnswer[]): SubmitResult[] {
  return answers.map((a) => {
    const g = gradeAnswer({
      type: a.type,
      points: Number(a.points_max),
      response: a.response,
      variant: a.variant ?? {},
      params: a.params ?? {},
      key: a.key,
      labResult: a.lab ?? null,
    })
    return { answer_id: a.id, score: g.score, is_correct: g.isCorrect, needs_review: g.needsReview }
  })
}

/** Talaba javobi shakli (turga qarab). Server saqlashdan oldin tekshiradi. */
const responseSchemas = {
  mcq: z.object({ selected: z.array(z.string().max(20)).max(8) }),
  numeric: z.object({
    value: z.union([z.string().max(40), z.number()]),
    unit: z.string().max(12).optional(),
  }),
  short_text: z.object({ text: z.string().max(5000) }),
  lab_task: z.object({}).passthrough(),
} as const

export function parseResponse(type: keyof typeof responseSchemas, raw: unknown): unknown | null {
  const r = responseSchemas[type].safeParse(raw)
  return r.success ? r.data : null
}
