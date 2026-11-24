import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { verifyQrToken } from '@/lib/attendance-token'
import { serverEnv } from '@/lib/env'
import { ApiError, handle, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { getSettings } from '@/lib/server/settings'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  code: z
    .string()
    .transform((s) => s.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{6}$/)),
  token: z.string().max(100).optional(),
})

/**
 * Darsga qo'shilish (QR yoki 6 xonali kod). QR tokeni yaroqli bo'lsa `auditorium`, aks holda `remote`.
 * Har qo'shilishda yangi join_token beriladi (eski qurilma tokeni bekor bo'ladi) va takroriy kirish sanaladi.
 */
export const POST = handle(async (req) => {
  const { profile } = await requireUser(['student'])
  limit(`join:${profile.id}`, 20, 60_000)
  const { code, token } = await readJson(req, schema)

  const admin = createAdminClient()
  const { data: s } = await admin
    .from('lecture_sessions')
    .select('id, status, current_slide, rev, lecture_id, lectures(title, page_count)')
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
    p_student_id: profile.id,
    p_mode: qrValid ? 'auditorium' : 'remote',
    p_token: joinToken,
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
    // QR berilgan, lekin muddati o'tgan/yaroqsiz: foydalanuvchiga qayta skanerlashni tavsiya qilamiz
    qr_rejected: Boolean(token) && !qrValid,
    join_token: joinToken,
    title: lec?.title ?? '',
    slide: s.current_slide,
    page_count: lec?.page_count ?? 1,
    rev: s.rev,
  })
})
