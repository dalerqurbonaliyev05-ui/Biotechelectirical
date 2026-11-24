import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { publicEnv } from '@/lib/env'

/** Joriy foydalanuvchi sessiyasi bilan server mijozi (RLS amal qiladi). */
export async function createClient() {
  const store = await cookies()
  const { supabaseUrl, supabaseAnonKey } = publicEnv()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options)
        } catch {
          // Server Component ichida cookie yozib bo'lmaydi — middleware yangilaydi.
        }
      },
    },
  })
}
