import { ApiError, handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/** PDF uchun qisqa muddatli imzolangan havola (shaxsiy bucket). Faqat ma'ruza egasi/o'qituvchi/admin. */
export const GET = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`pdf-url:${profile.id}`, 60, 60_000)
  const id = idParam((await params).id)
  const { data: lec } = await (
    await createClient()
  )
    .from('lectures')
    .select('pdf_path, page_count')
    .eq('id', id)
    .maybeSingle()
  if (!lec) throw new ApiError(404, 'not_found')
  const { data, error } = await createAdminClient()
    .storage.from('lectures')
    .createSignedUrl(lec.pdf_path as string, 3600)
  if (error || !data) throw new ApiError(404, 'not_found')
  return ok({ url: data.signedUrl, page_count: lec.page_count })
})
