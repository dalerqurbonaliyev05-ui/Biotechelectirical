import { isOwnPdfPath, isOwnThumbPath, lectureCreateSchema } from '@/lib/lecture-schemas'
import { ApiError, handle, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const POST = handle(async (req) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`lecture-write:${profile.id}`, 30, 60_000)
  const { thumbs, ...body } = await readJson(req, lectureCreateSchema)
  if (!isOwnPdfPath(body.pdf_path, profile.id)) throw new ApiError(400, 'validation', 'bad_path')
  if (
    thumbs?.some((t) => t !== null && !isOwnThumbPath(t, profile.id)) ||
    (thumbs && thumbs.length > body.page_count)
  ) {
    throw new ApiError(400, 'validation', 'bad_path')
  }

  // Fayl haqiqatan Storage'ga yuklanganini tekshiramiz
  const [folder, file] = body.pdf_path.split('/') as [string, string]
  const { data: found } = await createAdminClient()
    .storage.from('lectures')
    .list(folder, { search: file, limit: 1 })
  if (!found?.some((f) => f.name === file)) throw new ApiError(400, 'validation', 'pdf_missing')

  // RLS: o'qituvchi faqat o'z fani uchun yarata oladi
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lectures')
    .insert({ ...body, created_by: profile.id })
    .select('id')
    .single()
  if (error || !data) {
    if (error?.code === '42501') throw new ApiError(403, 'forbidden')
    throw error ?? new Error('insert_failed')
  }
  // Har slayd uchun yozuv (miniatyura bo'lmasa ham raqam bilan)
  const rows = Array.from({ length: body.page_count }, (_, i) => ({
    lecture_id: data.id,
    slide_no: i + 1,
    thumb_path: thumbs?.[i] ?? null,
  }))
  const { error: sErr } = await supabase.from('lecture_slides').insert(rows)
  if (sErr) throw sErr
  return ok({ id: data.id })
})
