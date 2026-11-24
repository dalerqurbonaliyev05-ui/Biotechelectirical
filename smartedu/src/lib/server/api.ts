import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { logError } from '@/lib/log'
import { rateLimit } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import type { Role, SessionProfile } from '@/lib/types'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code)
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

/** zod bilan tekshirilgan JSON tana. Xato bo'lsa 400. */
export async function readJson<S extends z.ZodType>(
  req: NextRequest,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new ApiError(400, 'bad_json')
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'validation')
  }
  return parsed.data
}

export function limit(key: string, max: number, windowMs: number): void {
  const r = rateLimit(key, max, windowMs)
  if (!r.ok) throw new ApiError(429, 'rate_limited', String(r.retryAfterSec))
}

export interface AuthedUser {
  profile: SessionProfile
}

/** Kirgan foydalanuvchi va uning DB'dagi roli. Kerak bo'lsa rolni tekshiradi. */
export async function requireUser(
  roles?: Role[],
  opts: { allowPasswordChange?: boolean } = {},
): Promise<AuthedUser> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new ApiError(401, 'unauthenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, student_code, group_id, must_change_password, is_active')
    .eq('id', data.user.id)
    .maybeSingle()
  if (!profile || !profile.is_active) throw new ApiError(401, 'unauthenticated')
  const p = profile as SessionProfile
  if (p.must_change_password && !opts.allowPasswordChange)
    throw new ApiError(403, 'password_change_required')
  if (roles && !roles.includes(p.role)) throw new ApiError(403, 'forbidden')
  return { profile: p }
}

type Ctx<P> = { params: Promise<P> }

/** Route handler o'rami: ApiError → JSON; kutilmagan xato → 500 (tafsilotsiz, logga faqat tur). */
export function handle<P = Record<string, never>>(
  fn: (req: NextRequest, ctx: Ctx<P>) => Promise<Response>,
): (req: NextRequest, ctx: Ctx<P>) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx)
    } catch (err) {
      if (err instanceof ApiError) {
        const headers: Record<string, string> = {}
        if (err.status === 429) headers['Retry-After'] = err.message
        return NextResponse.json(
          { error: { code: err.code, message: err.message } },
          { status: err.status, headers },
        )
      }
      logError(`${req.method} ${req.nextUrl.pathname}`, err)
      return NextResponse.json({ error: { code: 'internal' } }, { status: 500 })
    }
  }
}

export const guid = () => z.guid()

/** URL parametri UUID ko'rinishida bo'lishi shart, aks holda 404 (DB'ga bema'ni so'rov bormasin). */
export function idParam(raw: string): string {
  if (!z.guid().safeParse(raw).success) throw new ApiError(404, 'not_found')
  return raw
}
