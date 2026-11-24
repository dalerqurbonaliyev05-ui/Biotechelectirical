import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { clampSettings, type AppSettings } from '@/lib/settings-bounds'

let cache: { at: number; value: AppSettings } | null = null

/** Sozlamalar (ball qoidalari, vaqtlar). 30 s keshlanadi; noto'g'ri qiymat xavfsiz oraliqqa keltiriladi. */
export async function getSettings(admin: SupabaseClient): Promise<AppSettings> {
  if (cache && Date.now() - cache.at < 30_000) return cache.value
  const { data } = await admin.from('app_settings').select('key, value')
  const raw: Record<string, unknown> = {}
  for (const r of data ?? []) raw[r.key as string] = r.value
  const value = clampSettings(raw)
  cache = { at: Date.now(), value }
  return value
}
