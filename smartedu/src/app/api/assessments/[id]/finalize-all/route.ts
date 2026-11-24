import { ApiError, handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { submitExpiredAttempts } from '@/lib/server/assessments'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/** Tekshirilishi kerak javobi qolmagan barcha topshirilgan urinishlarni tasdiqlaydi. */
export const POST = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`finalize-all:${profile.id}`, 10, 60_000)
  const id = idParam((await params).id)
  const supabase = await createClient()
  const { data: a } = await supabase.from('assessments').select('id').eq('id', id).maybeSingle()
  if (!a) throw new ApiError(404, 'not_found')

  const admin = createAdminClient()
  await submitExpiredAttempts(admin, id)
  const { data: attempts } = await supabase
    .from('attempts')
    .select('id')
    .eq('assessment_id', id)
    .eq('status', 'submitted')
  let done = 0
  let pending = 0
  for (const t of attempts ?? []) {
    const { error } = await admin.rpc('app_finalize_attempt', {
      p_attempt_id: t.id,
      p_actor: profile.id,
    })
    if (error) pending++
    else done++
  }
  return ok({ finalized: done, pending })
})
