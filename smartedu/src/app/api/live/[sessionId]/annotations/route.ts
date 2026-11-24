import { parseItems } from '@/lib/annotations'
import { ApiError, handle, idParam, limit, ok, requireLiveUser } from '@/lib/server/api'
import { requireParticipant } from '@/lib/server/live'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Talaba: o'qituvchi "izohlarni talabalarga ko'rsatish"ni yoqqan bo'lsa — joriy slayd miniaturasi va izohlari.
 * Yoqilmagan bo'lsa `shared:false` (ma'lumot qaytmaydi). Realtime faqat "yangilang" signali; ma'lumot shu yerdan keladi.
 */
export const GET = handle<{ sessionId: string }>(async (req, { params }) => {
  const { userId } = await requireLiveUser()
  limit(`live-annot:${userId}`, 60, 60_000)
  const sessionId = idParam((await params).sessionId)
  const slide = Number(new URL(req.url).searchParams.get('slide'))
  if (!Number.isInteger(slide) || slide < 1) throw new ApiError(400, 'validation')
  const admin = createAdminClient()
  await requireParticipant(admin, userId, sessionId, req.headers.get('x-join-token'))
  const { data: s } = await admin
    .from('lecture_sessions')
    .select('lecture_id, share_annotations')
    .eq('id', sessionId)
    .single()
  if (!s?.share_annotations) return ok({ shared: false })
  const [{ data: a }, { data: th }] = await Promise.all([
    admin
      .from('session_annotations')
      .select('items')
      .eq('session_id', sessionId)
      .eq('slide_no', slide)
      .maybeSingle(),
    admin
      .from('lecture_slides')
      .select('thumb_path')
      .eq('lecture_id', s.lecture_id)
      .eq('slide_no', slide)
      .maybeSingle(),
  ])
  let thumbUrl: string | null = null
  if (th?.thumb_path) {
    const { data: u } = await admin.storage
      .from('lectures')
      .createSignedUrl(th.thumb_path as string, 600)
    thumbUrl = u?.signedUrl ?? null
  }
  return ok({ shared: true, slide, items: parseItems(a?.items) ?? [], thumbUrl })
})
