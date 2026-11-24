import { z } from 'zod'
import { validateNewPassword } from '@/lib/auth/password'
import { ApiError, handle, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { setPassword } from '@/lib/server/accounts'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLE_HOME } from '@/lib/types'

const schema = z.object({ password: z.string().max(200) })

export const POST = handle(async (req) => {
  const { profile } = await requireUser(undefined, { allowPasswordChange: true })
  limit(`pwd:${profile.id}`, 10, 60_000)
  const { password } = await readJson(req, schema)

  const check = validateNewPassword(password, profile.student_code)
  if (!check.ok) throw new ApiError(400, 'validation', check.error)

  await setPassword(createAdminClient(), profile.id, password, false)
  return ok({ redirect: ROLE_HOME[profile.role] })
})
