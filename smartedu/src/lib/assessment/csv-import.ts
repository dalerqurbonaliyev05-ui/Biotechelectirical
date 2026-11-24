import { questionInputSchema, type QuestionInput } from './schemas'
import { toCsv } from '@/lib/csv'
import { normalizeHeader } from '@/lib/import/students'

/**
 * Savollarni CSV/Excel'dan ommaviy yuklash. Fan import oynasida tanlanadi (CSV'da yo'q).
 * Ustunlar (sarlavha katta-kichik harfga bog'liq emas):
 *   type            mcq | numeric | short_text | lab_task
 *   text            savol matni (numeric: {U} kabi o'rinbosarlar)
 *   topic, difficulty (1-5), explanation, book_slug, book_page
 *   options         mcq: "Variant 1|Variant 2|Variant 3"
 *   correct         mcq: "A" yoki "A|C" (harf) yoki "1|3" (raqam, 1 dan)
 *   formula, vars   numeric: formula "U/R"; vars "U:10..24:2;R:2..10:1"  (nom:min..max[:qadam])
 *   unit, tolerance_pct   numeric: "A", 2
 *   rubric          short_text: "Mezon 1:2|Mezon 2:3"  (mezon:ball)
 *   sample          short_text: namuna javob
 *   lab_id, max_points    lab_task
 */
export interface QuestionImportIssue {
  row: number
  message: string
}

const num = (s: string | undefined): number | undefined => {
  if (s === undefined || s.trim() === '') return undefined
  const n = Number(s.trim().replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

function parseVars(raw: string): Record<string, { min: number; max: number; step?: number }> {
  const out: Record<string, { min: number; max: number; step?: number }> = {}
  for (const part of raw
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)) {
    const [name, range, step] = part.split(':').map((x) => x.trim())
    if (!name || !range) throw new Error('vars_format')
    const [lo, hi] = range.includes('..') ? range.split('..') : range.split('-')
    const min = num(lo),
      max = num(hi)
    if (min === undefined || max === undefined || Number.isNaN(min) || Number.isNaN(max))
      throw new Error('vars_format')
    const st = num(step)
    if (st !== undefined && Number.isNaN(st)) throw new Error('vars_format')
    out[name] = { min, max, ...(st !== undefined ? { step: st } : {}) }
  }
  return out
}

function parseCorrect(raw: string, optionCount: number): number[] {
  return raw
    .split(/[|,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (/^[A-Za-z]$/.test(s)) return s.toUpperCase().charCodeAt(0) - 65
      const n = Number(s)
      if (Number.isInteger(n) && n >= 1 && n <= optionCount) return n - 1
      throw new Error('correct_format')
    })
}

export function parseQuestionRecords(
  records: Record<string, string>[],
  subjectId: string,
): { questions: QuestionInput[]; issues: QuestionImportIssue[] } {
  const questions: QuestionInput[] = []
  const issues: QuestionImportIssue[] = []

  records.slice(0, 500).forEach((rec, i) => {
    const row = i + 2
    const r: Record<string, string> = {}
    for (const [k, v] of Object.entries(rec)) r[normalizeHeader(k)] = String(v ?? '').trim()
    if (!Object.values(r).some(Boolean)) return

    try {
      const type = (r.type ?? '').toLowerCase()
      const base = {
        subject_id: subjectId,
        text: r.text ?? '',
        topic: r.topic || null,
        difficulty: num(r.difficulty) ?? null,
        explanation: r.explanation || null,
        book_ref: r.book_slug ? { slug: r.book_slug, page: num(r.book_page) ?? null } : null,
      }
      let candidate: unknown
      if (type === 'mcq') {
        const options = (r.options ?? '')
          .split('|')
          .map((t) => ({ text: t.trim() }))
          .filter((o) => o.text)
        candidate = {
          ...base,
          type,
          options,
          correct_indexes: parseCorrect(r.correct ?? '', options.length),
        }
      } else if (type === 'numeric') {
        candidate = {
          ...base,
          type,
          vars: parseVars(r.vars ?? ''),
          formula: r.formula ?? '',
          answer_unit: r.unit ?? '',
          tolerance_pct: num(r.tolerance_pct) ?? 2,
        }
      } else if (type === 'short_text') {
        const rubric = (r.rubric ?? '')
          .split('|')
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => {
            const idx = p.lastIndexOf(':')
            if (idx < 0) throw new Error('rubric_format')
            return { criterion: p.slice(0, idx).trim(), points: num(p.slice(idx + 1)) ?? NaN }
          })
        candidate = { ...base, type, rubric, sample: r.sample || null }
      } else if (type === 'lab_task') {
        candidate = { ...base, type, lab_id: r.lab_id ?? '', max_points: num(r.max_points) ?? 10 }
      } else {
        throw new Error('type_unknown')
      }
      const parsed = questionInputSchema.safeParse(candidate)
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'invalid')
      questions.push(parsed.data)
    } catch (e) {
      issues.push({ row, message: e instanceof Error ? e.message : 'invalid' })
    }
  })
  if (records.length > 500) issues.push({ row: 502, message: 'too_many_rows' })
  return { questions, issues }
}

const TEMPLATE_HEADER = [
  'type',
  'text',
  'topic',
  'difficulty',
  'options',
  'correct',
  'explanation',
  'book_slug',
  'book_page',
  'formula',
  'vars',
  'unit',
  'tolerance_pct',
  'rubric',
  'sample',
  'lab_id',
  'max_points',
] as const

const TEMPLATE_ROWS: Partial<Record<(typeof TEMPLATE_HEADER)[number], string | number>>[] = [
  {
    type: 'mcq',
    text: 'Ohm qonuni qaysi formula bilan ifodalanadi?',
    topic: 'Ohm qonuni',
    difficulty: 1,
    options: 'I=U/R|I=U*R|I=R/U|I=U+R',
    correct: 'A',
    explanation: "Tok kuchlanishga to'g'ri, qarshilikka teskari mutanosib",
    book_slug: 'ohm-qonuni',
    book_page: 12,
  },
  {
    type: 'numeric',
    text: 'Kuchlanish {U} V, qarshilik {R} Ω. Tok kuchini toping.',
    topic: 'Ohm qonuni',
    difficulty: 2,
    explanation: 'I = U / R',
    book_slug: 'ohm-qonuni',
    book_page: 12,
    formula: 'U/R',
    vars: 'U:10..24:2;R:2..10:1',
    unit: 'A',
    tolerance_pct: 2,
  },
  {
    type: 'short_text',
    text: 'Qisqa tutashuv tokini tushuntiring.',
    topic: 'Himoya',
    difficulty: 3,
    rubric: "Ta'rif:2|Sabab:2|Oqibat:1",
    sample: 'Qisqa tutashuv — ...',
  },
  {
    type: 'lab_task',
    text: "Sxemani yig'ing va ishga tushiring.",
    topic: 'Laboratoriya',
    difficulty: 2,
    lab_id: 'motor-01',
    max_points: 10,
  },
]

/** Foydalanuvchiga beriladigan namuna fayl (CSV matni). */
export function questionCsvTemplate(): string {
  return toCsv([
    [...TEMPLATE_HEADER],
    ...TEMPLATE_ROWS.map((r) => TEMPLATE_HEADER.map((h) => r[h] ?? '')),
  ])
}
