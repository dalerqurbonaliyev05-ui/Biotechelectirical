import { z } from 'zod'
import { handle, idParam, limit, ok, readJson, requireLiveUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { requireParticipant } from '@/lib/server/live'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  token: z.string().min(10).max(100),
  slide: z.number().int().min(1).max(5000),
  understood: z.number().int().min(0).max(5),
  confused: z.number().int().min(0).max(5),
})

/**
 * Reaksiya paketi (~5 s da bir marta). Talaba/ishtirokchi tekshiriladi (token, blok), chegaralar SQL'da
 * (`app_add_reactions`): bir chaqiruvda har tur ko'pi bilan 5, slayd/tur uchun jami 20. Bu yerdagi
 * `limit` — qo'shimcha himoya (bir foydalanuvchidan daqiqada 30 ta paket).
 */
export const POST = handle<{ sessionId: string }>(async (req, { params }) => {
  const { userId } = await requireLiveUser()
  limit(`live-reaction:${userId}`, 30, 60_000)
  const sessionId = idParam((await params).sessionId)
  const body = await readJson(req, schema)
  const admin = createAdminClient()
  await requireParticipant(admin, userId, sessionId, body.token)
  if (body.understood + body.confused === 0) return ok({ saved: false })
  const { error } = await admin.rpc('app_add_reactions', {
    p_session_id: sessionId,
    p_student_id: userId,
    p_slide: body.slide,
    p_understood: body.understood,
    p_confused: body.confused,
  })
  if (error) mapDbError(error)
  return ok({ saved: true })
})
