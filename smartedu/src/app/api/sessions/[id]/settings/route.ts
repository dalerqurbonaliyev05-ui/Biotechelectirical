import { z } from 'zod'
import { handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import {
  SESSION_COLS,
  buildSessionState,
  getControlledSession,
  type SessionRow,
} from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const schema = z
  .object({
    allow_guests: z.boolean(),
    min_attendance_ratio: z.number().min(0).max(1),
    top_reactors: z.number().int().min(1).max(10),
    show_reactor_names: z.boolean(),
    bonus_enabled: z.boolean(),
    confused_enabled: z.boolean(),
    share_annotations: z.boolean(),
  })
  .partial()

/** Dars sozlamalari (mehmonlar, qatnashish chegarasi, reaksiya/bonus qoidalari). Faqat dars egasi. */
export const PATCH = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`session-settings:${profile.id}`, 60, 60_000)
  const id = idParam((await params).id)
  const body = await readJson(req, schema)
  await getControlledSession(await createClient(), profile, id)
  const admin = createAdminClient()
  if (Object.keys(body).length) {
    const { error } = await admin
      .from('lecture_sessions')
      .update({ ...body, rev: undefined })
      .eq('id', id)
    if (error) throw error
    // rev'ni oshiramiz: doska/talabalar yangilangan sozlamani oladi
    await admin.rpc('app_session_touch', { p_session_id: id })
  }
  const { data } = await admin.from('lecture_sessions').select(SESSION_COLS).eq('id', id).single()
  return ok(await buildSessionState(admin, data as unknown as SessionRow))
})
