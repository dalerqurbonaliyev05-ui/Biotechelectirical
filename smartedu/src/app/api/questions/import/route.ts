import { z } from 'zod'
import { parseQuestionRecords } from '@/lib/assessment/csv-import'
import { toDbRows } from '@/lib/assessment/schemas'
import { parseTabularFile } from '@/lib/import/file'
import { ApiError, handle, limit, ok, requireUser } from '@/lib/server/api'
import { createClient } from '@/lib/supabase/server'

/** CSV/Excel'dan savollarni ommaviy yuklash. `dry_run=1` — faqat tekshirish (hech narsa saqlanmaydi). */
export const POST = handle(async (req) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`question-import:${profile.id}`, 20, 60_000)

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const subjectId = z.guid().safeParse(form?.get('subject_id'))
  if (!(file instanceof File) || !subjectId.success) throw new ApiError(400, 'validation')

  let records
  try {
    records = await parseTabularFile(Buffer.from(await file.arrayBuffer()), file.name)
  } catch (e) {
    throw new ApiError(
      400,
      e instanceof Error && ['file_too_large', 'unsupported_format'].includes(e.message)
        ? e.message
        : 'validation',
    )
  }
  const { questions, issues } = parseQuestionRecords(records, subjectId.data)
  const dry = form?.get('dry_run') === '1'
  if (dry || questions.length === 0 || issues.length > 0) {
    // Xato bo'lsa hech narsa yozilmaydi: foydalanuvchi faylni tuzatib qayta yuklaydi
    return ok({
      imported: 0,
      count: questions.length,
      issues,
      preview: questions.slice(0, 5).map((q) => ({ type: q.type, text: q.text })),
    })
  }

  const supabase = await createClient()
  const rows = questions.map((q) => toDbRows(q))
  const { data: ins, error } = await supabase
    .from('questions')
    .insert(rows.map((r) => ({ ...r.question, created_by: profile.id })))
    .select('id')
  if (error || !ins) {
    if (error?.code === '42501') throw new ApiError(403, 'forbidden')
    throw error ?? new Error('insert_failed')
  }
  const { error: kErr } = await supabase.from('question_keys').insert(
    ins.map((q, i) => ({
      question_id: q.id,
      ...(rows[i]?.key ?? { correct: null, explanation: null }),
    })),
  )
  if (kErr) {
    await supabase
      .from('questions')
      .delete()
      .in(
        'id',
        ins.map((q) => q.id),
      )
    throw kErr
  }
  return ok({ imported: ins.length, count: questions.length, issues: [], preview: [] })
})
