import { isOwnPdfPath, lectureCreateSchema } from '@/lib/lecture-schemas'
import { ApiError, handle, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const POST = handle(async (req) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`lecture-write:${profile.id}`, 30, 60_000)
  const body = await readJson(req, lectureCreateSchema)
  if (!isOwnPdfPath(body.pdf_path, profile.id)) throw new ApiError(400, 'validation', 'bad_path')

  // Fayl haqiqatan Storage'ga yuklanganini tekshiramiz
  const [folder, file] = body.pdf_path.split('/') as [string, string]
  const { data: found } = await createAdminClient()
    .storage.from('lectures')
    .list(folder, { search: file, limit: 1 })
  if (!found?.some((f) => f.name === file)) throw new ApiError(400, 'validation', 'pdf_missing')

  // RLS: o'qituvchi faqat o'z fani uchun yarata oladi
  const { data, error } = await (
    await createClient()
  )
    .from('lectures')
    .insert({ ...body, created_by: profile.id })
    .select('id')
    .single()
  if (error || !data) {
    if (error?.code === '42501') throw new ApiError(403, 'forbidden')
    throw error ?? new Error('insert_failed')
  }
  return ok({ id: data.id })
})
