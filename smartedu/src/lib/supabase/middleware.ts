import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { publicEnv } from '@/lib/env'
import type { Role } from '@/lib/types'

/** Sessiya tokenini yangilaydi va kirgan foydalanuvchining (JWT'dagi) rolini qaytaradi. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { supabaseUrl, supabaseAnonKey } = publicEnv()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of list) response.cookies.set(name, value, options)
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const appMeta = (claims?.app_metadata ?? {}) as { role?: Role }
  return {
    response,
    isAuthenticated: Boolean(claims?.sub),
    // Qo'pol yo'naltirish uchun. Haqiqiy tekshiruv — layout'larda (DB'dagi profiles.role).
    role: appMeta.role ?? null,
  }
}
