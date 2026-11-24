import { z } from 'zod'
import { studentEmail } from '@/lib/auth/identifier'
import { generateTempPassword } from '@/lib/auth/password'
import { serverEnv } from '@/lib/env'
import { ApiError, handle, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { createAccount, replaceAssignments } from '@/lib/server/accounts'
import { isValidStudentCode } from '@/lib/auth/identifier'
import { createAdminClient } from '@/lib/supabase/admin'

const assignment = z.object({ subject_id: z.guid(), group_id: z.guid() })
const schema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('student'),
    full_name: z.string().min(3).max(200),
    student_code: z.string().min(3).max(32),
    group_id: z.guid(),
  }),
  z.object({
    role: z.literal('teacher'),
    full_name: z.string().min(3).max(200),
    email: z.email().max(254),
    department_id: z.guid().nullable().optional(),
    assignments: z.array(assignment).max(100).default([]),
  }),
  z.object({
    role: z.literal('admin'),
    full_name: z.string().min(3).max(200),
    email: z.email().max(254),
  }),
])

/** Bitta akkaunt yaratish (admin). Vaqtinchalik parol javobda BIR MARTA qaytadi. */
export const POST = handle(async (req) => {
  const { profile } = await requireUser(['admin'])
  limit(`users-create:${profile.id}`, 60, 60_000)
  const body = await readJson(req, schema)
  const admin = createAdminClient()
  const password = generateTempPassword()

  try {
    if (body.role === 'student') {
      if (!isValidStudentCode(body.student_code))
        throw new ApiError(400, 'validation', 'invalid_code')
      const { id } = await createAccount(admin, {
        role: 'student',
        fullName: body.full_name,
        email: studentEmail(body.student_code, serverEnv().syntheticEmailDomain),
        password,
        studentCode: body.student_code.trim(),
        groupId: body.group_id,
      })
      return ok({ id, temp_password: password })
    }
    const { id } = await createAccount(admin, {
      role: body.role,
      fullName: body.full_name,
      email: body.email.toLowerCase(),
      password,
      departmentId: body.role === 'teacher' ? (body.department_id ?? null) : null,
    })
    if (body.role === 'teacher') await replaceAssignments(admin, id, body.assignments)
    return ok({ id, temp_password: password })
  } catch (err) {
    if (err instanceof ApiError) throw err
    const code = (err as { code?: string }).code
    // 23505 = unikal; GoTrue: email_exists / user_already_exists
    if (code === '23505' || code === 'email_exists' || code === 'user_already_exists') {
      throw new ApiError(409, 'duplicate')
    }
    throw err
  }
})
