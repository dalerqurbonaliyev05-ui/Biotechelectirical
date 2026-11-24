import { z } from 'zod'
import { handle, idParam, limit, ok, readJson, requireLiveUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { currentPoll } from '@/lib/server/extras'
import { requireParticipant } from '@/lib/server/live'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  token: z.string().min(10).max(100),
  poll_id: z.guid(),
  option_id: z.string().min(1).max(20),
})

/** Talaba: tezkor so'rovga ovoz (bitta). Natija doskada umumiy; shaxsiy tanlov hech kimga ko'rsatilmaydi. */
export const POST = handle<{ sessionId: string }>(async (req, { params }) => {
  const { userId } = await requireLiveUser()
  limit(`live-poll:${userId}`, 20, 60_000)
  const sessionId = idParam((await params).sessionId)
  const body = await readJson(req, schema)
  const admin = createAdminClient()
  await requireParticipant(admin, userId, sessionId, body.token)
  const { error } = await admin.rpc('app_poll_vote', {
    p_poll_id: body.poll_id,
    p_voter_id: userId,
    p_option_id: body.option_id,
  })
  if (error) {
    if (String(error.message).includes('duplicate')) return ok({ saved: false, duplicate: true })
    mapDbError(error)
  }
  return ok({ saved: true, poll: await currentPoll(admin, sessionId) })
})
