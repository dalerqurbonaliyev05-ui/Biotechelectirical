import { z } from 'zod'
import { buildPollOptions, pollCreateSchema } from '@/lib/extras'
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

const schema = z.union([
  z.object({ action: z.literal('open') }).and(pollCreateSchema),
  z.object({ action: z.literal('close') }),
])

/** Tezkor so'rov: ochish (ha/yo'q yoki 2–6 variant) va yopish. Yangi so'rov ochilsa oldingisi yopiladi. */
export const POST = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`session-poll:${profile.id}`, 60, 60_000)
  const id = idParam((await params).id)
  const b = await readJson(req, schema)
  await getControlledSession(await createClient(), profile, id)
  const admin = createAdminClient()
  const { error } =
    b.action === 'open'
      ? await admin.rpc('app_poll_open', {
          p_session_id: id,
          p_body: b.body,
          p_options: buildPollOptions(b.options),
        })
      : await admin.rpc('app_poll_close', { p_session_id: id })
  if (error) mapDbError(error)
  const { data } = await admin.from('lecture_sessions').select(SESSION_COLS).eq('id', id).single()
  return ok(await buildSessionState(admin, data as unknown as SessionRow))
})
