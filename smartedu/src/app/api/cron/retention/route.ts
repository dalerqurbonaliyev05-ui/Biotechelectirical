import { verifyCronAuth } from '@/lib/cron-auth'
import { serverEnv } from '@/lib/env'
import { ApiError, handle, ok } from '@/lib/server/api'
import { getSettings } from '@/lib/server/settings'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Saqlash muddati: tugagan darslarning sezgir faollik ma'lumotlari (reaksiyalar, kuzatish vaqti, izohlar)
 * `activity_retention_days` kundan keyin tozalanadi. Davomat HOLATI (present/nb) saqlanadi. Kuniga bir marta (vercel.json).
 */
export const GET = handle(async (req) => {
  if (!verifyCronAuth(req.headers.get('authorization'), serverEnv().cronSecret))
    throw new ApiError(401, 'unauthenticated')
  const admin = createAdminClient()
  const days = (await getSettings(admin)).activity_retention_days
  const { data, error } = await admin.rpc('app_purge_activity', { p_days: days })
  if (error) throw error
  return ok({ days, purged: data })
})
