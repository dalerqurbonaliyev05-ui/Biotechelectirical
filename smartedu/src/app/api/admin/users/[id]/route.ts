import { z } from 'zod'
import { ApiError, handle, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { createAdminClient } from '@/lib/supabase/admin'

const patch = z
  .object({
    full_name: z.string().min(3).max(200),
    group_id: z.guid().nullable(),
    department_id: z.guid().nullable(),
    is_active: z.boolean(),
  })
  .partial()

type P = { id: string }

export const PATCH = handle<P>(async (req, { params }) => {
  const { profile } = await requireUser(['admin'])
  limit(`users-edit:${profile.id}`, 120, 60_000)
  const { id } = await params
  const body = await readJson(req, patch)
  if (id === profile.id && body.is_active === false)
    throw new ApiError(400, 'validation', 'self_deactivate')

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update(body).eq('id', id)
  if (error) throw error
  // Faolsizlantirilgan foydalanuvchi qayta kira olmasligi uchun auth darajasida ham bloklanadi.
  if (body.is_active !== undefined) {
    await admin.auth.admin.updateUserById(id, { ban_duration: body.is_active ? 'none' : '876000h' })
  }
  return ok({ ok: true })
})

/** O'chirish: auth foydalanuvchisi o'chadi, profil va unga bog'liq natijalar cascade bilan ketadi. */
export const DELETE = handle<P>(async (_req, { params }) => {
  const { profile } = await requireUser(['admin'])
  limit(`users-del:${profile.id}`, 30, 60_000)
  const { id } = await params
  if (id === profile.id) throw new ApiError(400, 'validation', 'self_delete')
  const { error } = await createAdminClient().auth.admin.deleteUser(id)
  if (error) throw error
  return ok({ ok: true })
})
