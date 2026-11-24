import { handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import {
  SESSION_COLS,
  buildSessionState,
  getControlledSession,
  type SessionRow,
} from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/** Qo'shilish kodini yangilash: eskisi darhol bekor, yangisi doskada ko'rinadi. */
export const POST = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`rotate-code:${profile.id}`, 20, 60_000)
  const id = idParam((await params).id)
  await getControlledSession(await createClient(), profile, id)
  const admin = createAdminClient()
  const { error } = await admin.rpc('app_rotate_session_code', { p_session_id: id })
  if (error) mapDbError(error)
  const { data } = await admin.from('lecture_sessions').select(SESSION_COLS).eq('id', id).single()
  return ok(await buildSessionState(admin, data as unknown as SessionRow))
})
