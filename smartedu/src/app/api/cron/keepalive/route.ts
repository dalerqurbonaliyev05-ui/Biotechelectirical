import { verifyCronAuth } from '@/lib/cron-auth'
import { serverEnv } from '@/lib/env'
import { ApiError, handle, ok } from '@/lib/server/api'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Bepul Supabase tarifida loyiha ~1 hafta faolsiz bo'lsa to'xtatiladi (pause). Bu endpoint muntazam chaqirilib,
 * bazaga oddiy so'rov yuboradi. Vercel Cron (vercel.json) yoki GitHub Actions (smartedu-keepalive.yml) chaqiradi.
 * Javobda maxfiy ma'lumot yo'q.
 */
export const GET = handle(async (req) => {
  if (!verifyCronAuth(req.headers.get('authorization'), serverEnv().cronSecret))
    throw new ApiError(401, 'unauthenticated')
  const { error } = await createAdminClient()
    .from('app_settings')
    .select('key', { head: true, count: 'exact' })
    .limit(1)
  if (error) throw error
  return ok({ ok: true, at: new Date().toISOString() })
})
