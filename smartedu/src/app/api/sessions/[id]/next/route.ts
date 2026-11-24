import { z } from 'zod'
import { handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { advanceSession } from '@/lib/server/live-questions'
import {
  SESSION_COLS,
  buildSessionState,
  getControlledSession,
  type SessionRow,
} from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({ skip: z.boolean().optional() })

/**
 * "Keyingi": nazorat nuqtasi bo'lsa doska to'xtab savol chiqaradi; ochiq savol yopiladi; bo'lmasa keyingi slayd.
 * `skip: true` — nuqtani o'tkazib yuborish. Yangi holat qaytadi (mijoz uni Realtime orqali e'lon qiladi).
 */
export const POST = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`session-next:${profile.id}`, 240, 60_000)
  const id = idParam((await params).id)
  const { skip } = await readJson(req, schema)
  const session = await getControlledSession(await createClient(), profile, id)
  const admin = createAdminClient()
  const { action } = await advanceSession(admin, session, skip ?? false)
  const { data } = await admin.from('lecture_sessions').select(SESSION_COLS).eq('id', id).single()
  return ok({ ...(await buildSessionState(admin, data as unknown as SessionRow)), action })
})
