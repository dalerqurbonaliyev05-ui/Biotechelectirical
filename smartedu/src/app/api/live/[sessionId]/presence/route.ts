import { z } from 'zod'
import { ApiError, handle, idParam, limit, ok, readJson, requireLiveUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { requireParticipant } from '@/lib/server/live'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({ token: z.string().min(10).max(100), visible: z.boolean() })

/**
 * Heartbeat (~20 s): sahifa ko'rinib turibdimi. Vaqt SERVERDA hisoblanadi (mijoz soatiga ishonilmaydi).
 * Javobda "Doskaga qarang" hisoblagichi va tanaffus holati (Realtime uzilganda ham chaqiruv yetib borsin).
 */
export const POST = handle<{ sessionId: string }>(async (req, { params }) => {
  const { userId } = await requireLiveUser()
  limit(`live-presence:${userId}`, 12, 60_000)
  const sessionId = idParam((await params).sessionId)
  const { token, visible } = await readJson(req, schema)
  const admin = createAdminClient()
  await requireParticipant(admin, userId, sessionId, token)
  const { data, error } = await admin.rpc('app_presence_ping', {
    p_session_id: sessionId,
    p_student_id: userId,
    p_visible: visible,
  })
  if (error) mapDbError(error)
  const r = (data as { out_focus_seq: number; out_on_break: boolean; out_ended: boolean }[])?.[0]
  if (!r) throw new ApiError(404, 'not_found')
  return ok({ focusSeq: r.out_focus_seq, onBreak: r.out_on_break, ended: r.out_ended })
})
