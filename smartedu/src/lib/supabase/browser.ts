import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'

/** Brauzer mijozi: Realtime, Storage yuklash va (RLS ostida) admin/o'qituvchi CRUD uchun. */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = publicEnv()
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
