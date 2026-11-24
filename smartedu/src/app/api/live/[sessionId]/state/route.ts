import { handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { requireParticipant } from '@/lib/server/live'
import { createAdminClient } from '@/lib/supabase/admin'

/** Talaba uchun dars holati (slayd raqami, holat). Token mos kelmasa — `token_replaced`. */
export const GET = handle<{ sessionId: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['student'])
  limit(`live-state:${profile.id}`, 60, 60_000)
  const sessionId = idParam((await params).sessionId)
  const admin = createAdminClient()
  await requireParticipant(admin, profile.id, sessionId, req.headers.get('x-join-token'))
  const { data: s } = await admin
    .from('lecture_sessions')
    .select('current_slide, status, rev, lectures(page_count)')
    .eq('id', sessionId)
    .single()
  return ok({
    slide: s?.current_slide,
    status: s?.status,
    rev: s?.rev,
    page_count: (s?.lectures as unknown as { page_count: number } | null)?.page_count,
  })
})
