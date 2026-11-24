import { ApiError, handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { submitAttempt } from '@/lib/server/assessments'
import { createAdminClient } from '@/lib/supabase/admin'

export const POST = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['student'])
  limit(`submit:${profile.id}`, 20, 60_000)
  const id = idParam((await params).id)
  const admin = createAdminClient()
  const { data: own } = await admin
    .from('attempts')
    .select('id')
    .eq('id', id)
    .eq('student_id', profile.id)
    .maybeSingle()
  if (!own) throw new ApiError(404, 'not_found')
  const attempt = await submitAttempt(admin, id)
  return ok({ status: attempt.status })
})
