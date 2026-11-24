import { z } from 'zod'
import { identifierToEmail } from '@/lib/auth/identifier'
import { serverEnv } from '@/lib/env'
import { ApiError, clientIp, handle, limit, ok, readJson } from '@/lib/server/api'
import { createClient } from '@/lib/supabase/server'
import { ROLE_HOME, type Role } from '@/lib/types'

const schema = z.object({
  identifier: z.string().min(1).max(254),
  password: z.string().min(1).max(200),
})

/**
 * Kirish. Talaba kodi → sintetik email xaritasi serverda (domen brauzerga kerak emas).
 * Xato xabari bir xil ("kod yoki parol noto'g'ri") — foydalanuvchi mavjudligi oshkor bo'lmasin.
 */
export const POST = handle(async (req) => {
  const body = await readJson(req, schema)
  limit(`login:ip:${clientIp(req)}`, 30, 60_000)
  limit(`login:id:${body.identifier.trim().toLowerCase()}`, 8, 60_000)

  const email = identifierToEmail(body.identifier, serverEnv().syntheticEmailDomain)
  if (!email) throw new ApiError(401, 'invalid_credentials')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: body.password })
  if (error || !data.user) throw new ApiError(401, 'invalid_credentials')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, must_change_password, is_active')
    .eq('id', data.user.id)
    .maybeSingle()
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut()
    throw new ApiError(401, 'invalid_credentials')
  }
  const role = profile.role as Role
  return ok({ role, redirect: profile.must_change_password ? '/change-password' : ROLE_HOME[role] })
})
