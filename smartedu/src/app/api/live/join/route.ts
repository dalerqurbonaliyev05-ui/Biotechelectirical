import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { verifyQrToken } from '@/lib/attendance-token'
import { serverEnv } from '@/lib/env'
import { ApiError, clientIp, handle, limit, ok, readJson, requireLiveUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { getSettings } from '@/lib/server/settings'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  code: z
    .string()
    .transform((s) => s.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{6}$/)),
  token: z.string().max(100).optional(),
  /** Faqat mehmon uchun */
  guest: z.object({ name: z.string().max(80), group: z.string().max(80).optional() }).optional(),
})

const clean = (s: string) =>
  s
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Darsga qo'shilish (QR yoki 6 xonali kod): ro'yxatdagi talaba YOKI mehmon (anonim kirish).
 * QR tokeni yaroqli bo'lsa `auditorium`, aks holda `remote`. Har qo'shilishda yangi join_token (eski qurilma bekor).
 * Mehmon uchun IP bo'yicha qo'shimcha tezlik cheklovi (anonim akkaunt yaratish arzon, shuning uchun).
 */
export const POST = handle(async (req) => {
  const ip = clientIp(req)
  const user = await requireLiveUser()
  limit(`join:${user.userId}`, 20, 60_000)
  if (user.isGuest) limit(`join-guest:ip:${ip}`, 30, 60_000)
  const { code, token, guest } = await readJson(req, schema)

  let guestName: string | null = null
  if (user.isGuest) {
    guestName = clean(guest?.name ?? '')
    if (guestName.length < 2 || guestName.length > 60)
      throw new ApiError(400, 'validation', 'guest_name_required')
  }

  const admin = createAdminClient()
  const { data: s } = await admin
    .from('lecture_sessions')
    .select('id, status, current_slide, rev, lectures(title, page_count)')
    .eq('code', code)
    .eq('status', 'active')
    .maybeSingle()
  if (!s) throw new ApiError(404, 'session_not_found')

  const { qr_window_sec } = await getSettings(admin)
  const qrValid =
    Boolean(token) &&
    verifyQrToken(
      serverEnv().attendanceSecret,
      s.id as string,
      token as string,
      Date.now(),
      qr_window_sec,
    )
  const joinToken = randomBytes(24).toString('base64url')

  const { data, error } = await admin.rpc('app_join_session', {
    p_code: code,
    p_user_id: user.userId,
    p_mode: qrValid ? 'auditorium' : 'remote',
    p_token: joinToken,
    p_is_guest: user.isGuest,
    p_guest_name: guestName,
    p_guest_group: user.isGuest ? clean(guest?.group ?? '').slice(0, 60) || null : null,
  })
  if (error) mapDbError(error)
  const row = (
    data as { out_session_id: string; out_mode: 'auditorium' | 'remote'; out_rejoin: number }[]
  )[0]
  const lec = s.lectures as unknown as { title: string; page_count: number } | null

  return ok({
    session_id: s.id,
    mode: row?.out_mode,
    rejoin: row?.out_rejoin ?? 0,
    is_guest: user.isGuest,
    qr_rejected: Boolean(token) && !qrValid,
    join_token: joinToken,
    title: lec?.title ?? '',
    slide: s.current_slide,
    page_count: lec?.page_count ?? 1,
    rev: s.rev,
  })
})
