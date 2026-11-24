import ExcelJS from 'exceljs'
import { toCsv, type Cell } from '@/lib/csv'
import { ApiError, handle, idParam, limit, requireUser } from '@/lib/server/api'
import { submitExpiredAttempts } from '@/lib/server/assessments'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const tz = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' }) : ''

/** Natijalar jadvali (CSV yoki Excel). RLS: o'qituvchi faqat o'z nazoratini oladi. */
export const GET = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`export:${profile.id}`, 20, 60_000)
  const id = idParam((await params).id)
  const format = req.nextUrl.searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv'

  const supabase = await createClient()
  const { data: a } = await supabase
    .from('assessments')
    .select('id, title, group_id')
    .eq('id', id)
    .maybeSingle()
  if (!a) throw new ApiError(404, 'not_found')
  await submitExpiredAttempts(createAdminClient(), id)

  const { data: aq } = await supabase
    .from('assessment_questions')
    .select('question_id, position, points, questions(body)')
    .eq('assessment_id', id)
    .order('position')
  const cols = (aq ?? []).map((r, i) => ({
    id: r.question_id as string,
    label: `Q${i + 1} (${Number(r.points)}): ${String((r.questions as unknown as { body: { text?: string } } | null)?.body.text ?? '').slice(0, 40)}`,
  }))

  const { data: attempts } = await supabase
    .from('attempts')
    .select(
      'id, status, total_score, max_score, leave_count, submitted_at, profiles(full_name, student_code)',
    )
    .eq('assessment_id', id)
  const { data: answers } = await supabase
    .from('answers')
    .select('attempt_id, question_id, score')
    .in(
      'attempt_id',
      (attempts ?? []).map((t) => t.id as string),
    )
  const score = new Map<string, number | null>(
    (answers ?? []).map((x) => [
      `${x.attempt_id}:${x.question_id}`,
      x.score === null ? null : Number(x.score),
    ]),
  )

  const header: Cell[] = [
    'student_code',
    'full_name',
    'status',
    ...cols.map((c) => c.label),
    'total',
    'max',
    'percent',
    'leave_count',
    'submitted_at',
  ]
  const rows: Cell[][] = (attempts ?? [])
    .map((t) => ({
      t,
      p: t.profiles as unknown as { full_name: string; student_code: string | null } | null,
    }))
    .sort((x, y) => (x.p?.student_code ?? '').localeCompare(y.p?.student_code ?? ''))
    .map(({ t, p }) => {
      const total = Number(t.total_score ?? 0)
      const max = Number(t.max_score ?? 0)
      return [
        p?.student_code ?? '',
        p?.full_name ?? '',
        t.status as string,
        ...cols.map((c) => score.get(`${t.id}:${c.id}`) ?? ''),
        total,
        max,
        max > 0 ? Math.round((total / max) * 1000) / 10 : 0,
        Number(t.leave_count ?? 0),
        tz(t.submitted_at as string | null),
      ]
    })

  const base = `natijalar-${a.title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40)}`
  if (format === 'csv') {
    return new Response(toCsv([header, ...rows]), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(base)}.csv`,
      },
    })
  }
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Natijalar')
  ws.addRow(header)
  ws.getRow(1).font = { bold: true }
  for (const r of rows) ws.addRow(r.map((c) => (c === undefined ? null : c)))
  ws.columns.forEach((c) => {
    c.width = 16
  })
  const buf = await wb.xlsx.writeBuffer()
  return new Response(buf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(base)}.xlsx`,
    },
  })
})
