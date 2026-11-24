import { handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { buildSessionState, getControlledSession } from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const GET = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`session-state:${profile.id}`, 60, 60_000)
  const s = await getControlledSession(await createClient(), profile, idParam((await params).id))
  return ok(await buildSessionState(createAdminClient(), s))
})
