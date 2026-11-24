import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { studentEmail } from '@/lib/auth/identifier'
import { generateTempPassword } from '@/lib/auth/password'
import { serverEnv } from '@/lib/env'
import type { StudentRow } from '@/lib/import/students'
import { logError } from '@/lib/log'
import type { Role } from '@/lib/types'

export interface NewAccount {
  role: Role
  fullName: string
  email: string
  password: string
  studentCode?: string
  groupId?: string | null
  departmentId?: string | null
  mustChangePassword?: boolean
}

/**
 * Auth foydalanuvchisi + profil. Profil yozilmasa, auth foydalanuvchisi o'chiriladi (yarim holat qolmasin).
 * Rol `app_metadata` ga yoziladi: foydalanuvchi uni o'zgartira olmaydi (user_metadata dan farqli).
 */
export async function createAccount(
  admin: SupabaseClient,
  input: NewAccount,
): Promise<{ id: string }> {
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    app_metadata: { role: input.role },
    user_metadata: { full_name: input.fullName },
  })
  if (error || !data.user)
    throw Object.assign(new Error(error?.message ?? 'create_failed'), {
      code: error?.code ?? 'create_failed',
    })

  const { error: pErr } = await admin.from('profiles').insert({
    id: data.user.id,
    role: input.role,
    full_name: input.fullName,
    student_code: input.studentCode ?? null,
    group_id: input.groupId ?? null,
    department_id: input.departmentId ?? null,
    must_change_password: input.mustChangePassword ?? true,
  })
  if (pErr) {
    await admin.auth.admin.deleteUser(data.user.id)
    throw Object.assign(new Error(pErr.message), { code: pErr.code ?? 'profile_failed' })
  }
  return { id: data.user.id }
}

export async function setPassword(
  admin: SupabaseClient,
  userId: string,
  password: string,
  mustChange: boolean,
): Promise<void> {
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) throw error
  const { error: pErr } = await admin
    .from('profiles')
    .update({ must_change_password: mustChange })
    .eq('id', userId)
  if (pErr) throw pErr
}

export interface ImportResult {
  row: number
  student_code: string
  full_name: string
  group: string
  status: 'created' | 'exists' | 'error'
  message?: string
  temp_password?: string
}

/** Talabalarni ommaviy yaratish (service role). Takror kod → 'exists' (parol o'zgarmaydi). */
export async function importStudents(
  admin: SupabaseClient,
  rows: StudentRow[],
  opts: { createMissingGroups: boolean; startRow?: number },
): Promise<ImportResult[]> {
  const { syntheticEmailDomain } = serverEnv()
  const groupIds = new Map<string, string>()
  const { data: groups } = await admin.from('groups').select('id, name')
  for (const g of groups ?? []) groupIds.set(String(g.name).toLowerCase(), String(g.id))

  if (opts.createMissingGroups) {
    const missing = [...new Set(rows.map((r) => r.group.trim()))].filter(
      (g) => !groupIds.has(g.toLowerCase()),
    )
    for (const name of missing) {
      const { data, error } = await admin
        .from('groups')
        .insert({ name })
        .select('id, name')
        .single()
      if (!error && data) groupIds.set(String(data.name).toLowerCase(), String(data.id))
    }
  }

  const results: ImportResult[] = new Array(rows.length)
  const queue = rows.map((r, i) => ({ r, i }))
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const { r, i } = job
      const base = {
        row: (opts.startRow ?? 2) + i,
        student_code: r.student_code,
        full_name: r.full_name,
        group: r.group,
      }
      const groupId = groupIds.get(r.group.trim().toLowerCase())
      if (!groupId) {
        results[i] = { ...base, status: 'error', message: 'group_not_found' }
        continue
      }
      const { data: existing } = await admin
        .from('profiles')
        .select('id')
        .ilike(
          'student_code',
          r.student_code.replace(/[%_]/g, (c) => `\\${c}`),
        )
        .maybeSingle()
      if (existing) {
        results[i] = { ...base, status: 'exists' }
        continue
      }
      const password = r.password && r.password.length >= 8 ? r.password : generateTempPassword()
      try {
        await createAccount(admin, {
          role: 'student',
          fullName: r.full_name,
          email: studentEmail(r.student_code, syntheticEmailDomain),
          password,
          studentCode: r.student_code,
          groupId,
          mustChangePassword: true,
        })
        results[i] = { ...base, status: 'created', temp_password: password }
      } catch (err) {
        logError('importStudents.createAccount', err)
        results[i] = { ...base, status: 'error', message: 'create_failed' }
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  return results
}
