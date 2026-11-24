import { ApiError, handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const DELETE = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`lecture-write:${profile.id}`, 30, 60_000)
  const id = idParam((await params).id)
  const supabase = await createClient()
  const { data: lec } = await supabase
    .from('lectures')
    .select('pdf_path')
    .eq('id', id)
    .maybeSingle()
  if (!lec) throw new ApiError(404, 'not_found')
  // Dars (sessiya) o'tkazilgan bo'lsa FK restrict → 409
  const { error } = await supabase.from('lectures').delete().eq('id', id)
  if (error) mapDbError(error)
  await createAdminClient()
    .storage.from('lectures')
    .remove([lec.pdf_path as string])
  return ok({ ok: true })
})
