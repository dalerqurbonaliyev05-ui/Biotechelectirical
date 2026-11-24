import { ApiError, handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/** O'qituvchining yakuniy tasdig'i (tekshirilmagan javob qolmagan bo'lsa). */
export const POST = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`finalize:${profile.id}`, 120, 60_000)
  const id = idParam((await params).id)
  // RLS: o'qituvchi faqat o'z nazoratining urinishini ko'radi
  const { data: visible } = await (
    await createClient()
  )
    .from('attempts')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (!visible) throw new ApiError(404, 'not_found')
  const { data, error } = await createAdminClient().rpc('app_finalize_attempt', {
    p_attempt_id: id,
    p_actor: profile.id,
  })
  if (error) mapDbError(error)
  return ok({ status: (data as { status: string }).status })
})
