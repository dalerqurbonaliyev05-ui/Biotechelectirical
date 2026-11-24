import { NextResponse, type NextRequest } from 'next/server'
import { isSupabaseConfigured } from '@/lib/env'
import { updateSession } from '@/lib/supabase/middleware'
import { ROLE_HOME, type Role } from '@/lib/types'

// Tokensiz (yoki o'z imzosi bilan) ishlaydigan yo'llar
const PUBLIC_EXACT = new Set(['/', '/login', '/api/auth/login'])
const PUBLIC_PREFIX = ['/api/lab/submit', '/api/cron/']

// Qo'pol rol-yo'l mosligi. Haqiqiy tekshiruv — layout'lar va API'larda (DB'dagi rol bo'yicha).
const ROLE_PREFIX: { prefix: string; roles: Role[] }[] = [
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/teacher', roles: ['teacher', 'admin'] },
  { prefix: '/student', roles: ['student'] },
  { prefix: '/board', roles: ['teacher', 'admin'] },
]

export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next()

  const { response, isAuthenticated, role } = await updateSession(request)
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_EXACT.has(path) || PUBLIC_PREFIX.some((p) => path.startsWith(p))

  const redirectTo = (to: string, search = '') => {
    const url = request.nextUrl.clone()
    url.pathname = to
    url.search = search
    const res = NextResponse.redirect(url)
    for (const c of response.cookies.getAll()) res.cookies.set(c)
    return res
  }

  if (isPublic) {
    if (path === '/login' && isAuthenticated && role) return redirectTo(ROLE_HOME[role])
    return response
  }

  if (!isAuthenticated) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: { code: 'unauthenticated' } }, { status: 401 })
    }
    return redirectTo('/login', `?next=${encodeURIComponent(path + request.nextUrl.search)}`)
  }

  const rule = ROLE_PREFIX.find((r) => path === r.prefix || path.startsWith(r.prefix + '/'))
  if (rule && role && !rule.roles.includes(role)) return redirectTo(ROLE_HOME[role])

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mjs|js|css|map)$).*)',
  ],
}
