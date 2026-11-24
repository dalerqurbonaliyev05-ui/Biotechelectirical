import { z } from 'zod'
import { askCreateSchema } from '@/lib/extras'
import { handle, idParam, limit, ok, readJson, requireLiveUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { loadAsks } from '@/lib/server/extras'
import { requireParticipant } from '@/lib/server/live'
import { createAdminClient } from '@/lib/supabase/admin'

const voteSchema = z.object({ token: z.string().min(10).max(100), ask_id: z.guid() })

/** Talaba: savollar ro'yxati (muallifsiz; faqat o'z savoli/ovozi belgilanadi). */
export const GET = handle<{ sessionId: string }>(async (req, { params }) => {
  const { userId } = await requireLiveUser()
  limit(`live-asks:${userId}`, 60, 60_000)
  const sessionId = idParam((await params).sessionId)
  const admin = createAdminClient()
  await requireParticipant(admin, userId, sessionId, req.headers.get('x-join-token'))
  const asks = (await loadAsks(admin, sessionId, userId)).filter((a) => !a.answered || a.mine)
  return ok({ asks })
})

/** Yangi savol (standart: anonim). Bir talabadan ko'pi bilan 5 ta (SQL ham tekshiradi). */
export const POST = handle<{ sessionId: string }>(async (req, { params }) => {
  const { userId } = await requireLiveUser()
  limit(`live-ask-new:${userId}`, 10, 60_000)
  const sessionId = idParam((await params).sessionId)
  const body = await readJson(req, askCreateSchema)
  const admin = createAdminClient()
  await requireParticipant(admin, userId, sessionId, body.token)
  const { error } = await admin.rpc('app_ask_create', {
    p_session_id: sessionId,
    p_student_id: userId,
    p_body: body.body,
    p_anonymous: body.anonymous,
  })
  if (error) mapDbError(error)
  return ok({ saved: true })
})

/** "Men ham shuni so'ramoqchiman" (ovoz). */
export const PUT = handle<{ sessionId: string }>(async (req, { params }) => {
  const { userId } = await requireLiveUser()
  limit(`live-ask-vote:${userId}`, 60, 60_000)
  const sessionId = idParam((await params).sessionId)
  const body = await readJson(req, voteSchema)
  const admin = createAdminClient()
  await requireParticipant(admin, userId, sessionId, body.token)
  const { data, error } = await admin.rpc('app_ask_vote', {
    p_ask_id: body.ask_id,
    p_voter_id: userId,
  })
  if (error) mapDbError(error)
  return ok({ votes: Number(data) })
})
