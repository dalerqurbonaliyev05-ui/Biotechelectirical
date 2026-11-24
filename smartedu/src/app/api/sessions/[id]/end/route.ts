import { handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { closeOpenQuestion } from '@/lib/server/live-questions'
import { buildSessionState, getControlledSession, type SessionRow } from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const POST = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`session-end:${profile.id}`, 30, 60_000)
  const id = idParam((await params).id)
  await getControlledSession(await createClient(), profile, id)
  const admin = createAdminClient()
  await closeOpenQuestion(admin, id)
  const { data, error } = await admin.rpc('app_session_end', { p_session_id: id })
  if (error) mapDbError(error)
  return ok(await buildSessionState(admin, data as SessionRow))
})
