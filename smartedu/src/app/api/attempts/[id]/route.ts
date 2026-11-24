import { ApiError, handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { loadAttemptState } from '@/lib/server/assessments'
import { createAdminClient } from '@/lib/supabase/admin'

export const GET = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['student'])
  limit(`attempt-get:${profile.id}`, 120, 60_000)
  const state = await loadAttemptState(createAdminClient(), profile.id, idParam((await params).id))
  if (!state) throw new ApiError(404, 'not_found')
  return ok(state)
})
