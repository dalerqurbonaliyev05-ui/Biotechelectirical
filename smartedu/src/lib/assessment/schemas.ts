import { z } from 'zod'
import { RESERVED_NAMES, VAR_NAME_RE, evaluate, identifiersIn } from './expr'
import { parseUnit } from './units'

/**
 * Savol kiritish shakli (o'qituvchi formasi, CSV import va API uchun BIR XIL).
 * `toDbRows` uni DB qatorlariga aylantiradi: ochiq qism `questions`, javob kaliti `question_keys`.
 */
const common = {
  subject_id: z.guid(),
  text: z.string().trim().min(3).max(4000),
  topic: z.string().trim().max(200).nullish(),
  difficulty: z.number().int().min(1).max(5).nullish(),
  explanation: z.string().trim().max(4000).nullish(),
  book_ref: z
    .object({
      slug: z.string().trim().min(1).max(100),
      page: z.number().int().min(1).max(10000).nullish(),
    })
    .nullish(),
}

const mcq = z
  .object({
    ...common,
    type: z.literal('mcq'),
    options: z
      .array(
        z.object({
          id: z.string().min(1).max(20).optional(),
          text: z.string().trim().min(1).max(500),
        }),
      )
      .min(2)
      .max(8),
    /** To'g'ri variantlar: variant tartib raqamlari (0 dan) */
    correct_indexes: z.array(z.number().int().min(0).max(7)).min(1),
  })
  .refine((q) => q.correct_indexes.every((i) => i < q.options.length), {
    message: 'correct_out_of_range',
  })

const numericVar = z
  .object({
    min: z.number().finite(),
    max: z.number().finite(),
    step: z.number().positive().finite().optional(),
  })
  .refine((v) => v.max >= v.min, { message: 'var_range' })

const numeric = z
  .object({
    ...common,
    type: z.literal('numeric'),
    vars: z.record(z.string(), numericVar),
    formula: z.string().trim().min(1).max(300),
    answer_unit: z.string().trim().max(12).default(''),
    tolerance_pct: z.number().min(0).max(100).default(2),
  })
  .superRefine((q, ctx) => {
    const names = Object.keys(q.vars)
    if (names.length === 0 || names.length > 8)
      return ctx.addIssue({ code: 'custom', message: 'vars_count' })
    for (const n of names) {
      if (!VAR_NAME_RE.test(n) || RESERVED_NAMES.has(n))
        return ctx.addIssue({ code: 'custom', message: 'var_name' })
    }
    // Matndagi {X} belgilari e'lon qilingan o'zgaruvchilar bo'lishi shart
    for (const m of q.text.matchAll(/\{([^}]+)\}/g)) {
      if (!names.includes(m[1] as string))
        return ctx.addIssue({ code: 'custom', message: 'placeholder_unknown' })
    }
    try {
      for (const id of identifiersIn(q.formula))
        if (!names.includes(id)) throw new Error('formula_unknown_var')
      // Sinov: eng kichik va eng katta qiymatlarda hisoblab ko'ramiz
      for (const pick of ['min', 'max'] as const) {
        evaluate(
          q.formula,
          Object.fromEntries(
            names.map((n) => [n, (q.vars[n] as { min: number; max: number })[pick]]),
          ),
        )
      }
    } catch (e) {
      return ctx.addIssue({
        code: 'custom',
        message:
          e instanceof Error && e.message === 'formula_unknown_var'
            ? 'formula_unknown_var'
            : 'formula_invalid',
      })
    }
    if (q.answer_unit && !parseUnit(q.answer_unit))
      ctx.addIssue({ code: 'custom', message: 'unit_unknown' })
  })

const shortText = z.object({
  ...common,
  type: z.literal('short_text'),
  rubric: z
    .array(
      z.object({
        criterion: z.string().trim().min(1).max(300),
        points: z.number().positive().max(100),
      }),
    )
    .min(1)
    .max(20),
  sample: z.string().trim().max(4000).nullish(),
})

const labTask = z.object({
  ...common,
  type: z.literal('lab_task'),
  lab_id: z.string().trim().min(1).max(100),
  max_points: z.number().positive().max(100).default(10),
})

export const questionInputSchema = z.discriminatedUnion('type', [mcq, numeric, shortText, labTask])
export type QuestionInput = z.infer<typeof questionInputSchema>
export type QuestionType = QuestionInput['type']

export interface QuestionRow {
  subject_id: string
  type: QuestionType
  body: Record<string, unknown>
  topic: string | null
  difficulty: number | null
  params: Record<string, unknown>
  book_ref: { slug: string; page?: number | null } | null
  lab_ref: { lab_id: string } | null
}
export interface KeyRow {
  correct: unknown
  explanation: string | null
}

const LETTER_IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

export function toDbRows(q: QuestionInput): { question: QuestionRow; key: KeyRow } {
  const base = {
    subject_id: q.subject_id,
    type: q.type,
    topic: q.topic?.trim() || null,
    difficulty: q.difficulty ?? null,
    book_ref: q.book_ref
      ? { slug: q.book_ref.slug, ...(q.book_ref.page ? { page: q.book_ref.page } : {}) }
      : null,
    lab_ref: null as { lab_id: string } | null,
  }
  const explanation = q.explanation?.trim() || null
  switch (q.type) {
    case 'mcq': {
      const options = q.options.map((o, i) => ({ id: LETTER_IDS[i] as string, text: o.text }))
      const correct = [...new Set(q.correct_indexes)].sort().map((i) => LETTER_IDS[i] as string)
      return {
        question: {
          ...base,
          body: { text: q.text, options, multiple: correct.length > 1 },
          params: {},
        },
        key: { correct, explanation },
      }
    }
    case 'numeric':
      return {
        question: {
          ...base,
          body: { text: q.text },
          params: { vars: q.vars, answer_unit: q.answer_unit, tolerance_pct: q.tolerance_pct },
        },
        key: { correct: { formula: q.formula }, explanation },
      }
    case 'short_text':
      return {
        question: { ...base, body: { text: q.text }, params: { rubric: q.rubric } },
        key: { correct: { sample: q.sample ?? null }, explanation },
      }
    case 'lab_task':
      return {
        question: {
          ...base,
          body: { text: q.text },
          params: { max_points: q.max_points },
          lab_ref: { lab_id: q.lab_id },
        },
        key: { correct: {}, explanation },
      }
  }
}

/** DB qatorlari → forma/CSV shakli (tahrirlash uchun). */
export function fromDbRows(
  q: {
    subject_id: string
    type: QuestionType
    body: Record<string, unknown>
    topic: string | null
    difficulty: number | null
    params: Record<string, unknown>
    book_ref: { slug: string; page?: number | null } | null
    lab_ref: { lab_id: string } | null
  },
  key: { correct: unknown; explanation: string | null } | null,
): QuestionInput {
  const common = {
    subject_id: q.subject_id,
    text: String(q.body.text ?? ''),
    topic: q.topic,
    difficulty: q.difficulty,
    explanation: key?.explanation ?? null,
    book_ref: q.book_ref ? { slug: q.book_ref.slug, page: q.book_ref.page ?? null } : null,
  }
  const params = q.params as Record<string, unknown>
  switch (q.type) {
    case 'mcq': {
      const options = ((q.body.options as { id: string; text: string }[]) ?? []).map((o) => ({
        id: o.id,
        text: o.text,
      }))
      const correct = (key?.correct as string[] | null) ?? []
      return {
        ...common,
        type: 'mcq',
        options,
        correct_indexes: options.flatMap((o, i) => (correct.includes(o.id as string) ? [i] : [])),
      }
    }
    case 'numeric':
      return {
        ...common,
        type: 'numeric',
        vars: (params.vars as Record<string, { min: number; max: number; step?: number }>) ?? {},
        formula: String((key?.correct as { formula?: string } | null)?.formula ?? ''),
        answer_unit: String(params.answer_unit ?? ''),
        tolerance_pct: Number(params.tolerance_pct ?? 2),
      }
    case 'short_text':
      return {
        ...common,
        type: 'short_text',
        rubric: (params.rubric as { criterion: string; points: number }[]) ?? [],
        sample: (key?.correct as { sample?: string | null } | null)?.sample ?? null,
      }
    case 'lab_task':
      return {
        ...common,
        type: 'lab_task',
        lab_id: q.lab_ref?.lab_id ?? '',
        max_points: Number(params.max_points ?? 10),
      }
  }
}
