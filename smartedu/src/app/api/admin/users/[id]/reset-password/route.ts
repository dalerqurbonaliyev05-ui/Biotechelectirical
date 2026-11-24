import { generateTempPassword } from '@/lib/auth/password'
import { handle, limit, ok, requireUser } from '@/lib/server/api'
import { setPassword } from '@/lib/server/accounts'
import { createAdminClient } from '@/lib/supabase/admin'

export const POST = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['admin'])
  limit(`pwd-reset:${profile.id}`, 60, 60_000)
  const { id } = await params
  const password = generateTempPassword()
  await setPassword(createAdminClient(), id, password, true)
  return ok({ temp_password: password })
})
