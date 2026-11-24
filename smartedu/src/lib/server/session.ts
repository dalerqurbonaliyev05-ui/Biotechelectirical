import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROLE_HOME, type Role, type SessionProfile } from '@/lib/types'

/** Joriy foydalanuvchi profili (bir so'rov ichida keshlanadi). Kirmagan bo'lsa null. */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, student_code, group_id, must_change_password, is_active')
    .eq('id', data.user.id)
    .maybeSingle()
  // DB xatosida null qaytarsak /login ↔ bosh sahifa o'rtasida cheksiz yo'naltirish tsikli bo'lardi
  if (error) throw error
  if (!profile || !profile.is_active) return null
  return profile as SessionProfile
})

/** Layout/sahifa himoyasi: kirmagan → /login, parol almashtirilmagan → /change-password, rol mos emas → o'z bosh sahifasi. */
export async function requireRole(...roles: Role[]): Promise<SessionProfile> {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')
  if (profile.must_change_password) redirect('/change-password')
  if (!roles.includes(profile.role)) redirect(ROLE_HOME[profile.role])
  return profile
}
