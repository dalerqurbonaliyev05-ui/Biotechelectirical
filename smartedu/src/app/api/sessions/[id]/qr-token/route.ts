import { currentWindow, makeQrToken, msUntilNextWindow } from '@/lib/attendance-token'
import { publicEnv, serverEnv } from '@/lib/env'
import { ApiError, handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { getControlledSession } from '@/lib/server/sessions'
import { getSettings } from '@/lib/server/settings'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/** Doska uchun joriy QR token (vaqt chegarali). Faqat sessiya egasi/admin. */
export const GET = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`qr-token:${profile.id}`, 120, 60_000)
  const id = idParam((await params).id)
  const s = await getControlledSession(await createClient(), profile, id)
  const secret = serverEnv().attendanceSecret
  if (secret.length < 16) throw new ApiError(503, 'not_configured')

  const { qr_window_sec } = await getSettings(createAdminClient())
  const now = Date.now()
  const token = makeQrToken(secret, id, now, qr_window_sec)
  return ok({
    token,
    url: `${publicEnv().siteUrl}/live/${s.code}?t=${token}`,
    window: currentWindow(now, qr_window_sec),
    next_in_ms: msUntilNextWindow(now, qr_window_sec),
  })
})
