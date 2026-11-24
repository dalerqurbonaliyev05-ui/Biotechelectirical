import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { publicEnv, serverEnv } from '@/lib/env'

let cached: SupabaseClient | null = null

/**
 * SERVICE ROLE mijozi — RLS'ni chetlab o'tadi! Faqat server kodida, faqat foydalanuvchi
 * huquqi tekshirilgandan KEYIN ishlating. Hech qachon brauzerga yubormang.
 */
export function createAdminClient(): SupabaseClient {
  if (cached) return cached
  const { supabaseUrl } = publicEnv()
  const { serviceRoleKey } = serverEnv()
  if (!supabaseUrl || !serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY sozlanmagan')
  cached = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
