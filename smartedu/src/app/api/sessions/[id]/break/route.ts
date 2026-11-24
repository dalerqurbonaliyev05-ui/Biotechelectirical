import { z } from 'zod'
import { handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import {
  buildSessionState,
  getControlledSession,
  SESSION_COLS,
  type SessionRow,
} from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({ action: z.enum(['start', 'end']) })

/** Tanaffus: davomat hisobiga kirmaydi; doska va talabalar telefonida "Tanaffus" ko'rsatiladi. */
export const POST = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`session-break:${profile.id}`, 30, 60_000)
  const id = idParam((await params).id)
  const { action } = await readJson(req, schema)
  await getControlledSession(await createClient(), profile, id)
  const admin = createAdminClient()
  const { error } = await admin.rpc(action === 'start' ? 'app_break_start' : 'app_break_end', {
    p_session_id: id,
  })
  if (error) mapDbError(error)
  const { data } = await admin.from('lecture_sessions').select(SESSION_COLS).eq('id', id).single()
  return ok(await buildSessionState(admin, data as unknown as SessionRow))
})
