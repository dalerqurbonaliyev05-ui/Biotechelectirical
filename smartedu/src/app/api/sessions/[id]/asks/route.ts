import { z } from 'zod'
import { handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { loadAsks } from '@/lib/server/extras'
import { getControlledSession } from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const patchSchema = z
  .object({
    ask_id: z.guid(),
    on_board: z.boolean().optional(),
    answered: z.boolean().optional(),
    hidden: z.boolean().optional(),
  })
  .refine((v) => v.on_board !== undefined || v.answered !== undefined || v.hidden !== undefined)

/** O'qituvchi: savollar (ovoz bo'yicha). Muallif ko'rsatilmaydi (anonimlik). */
export const GET = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`session-asks:${profile.id}`, 90, 60_000)
  const s = await getControlledSession(await createClient(), profile, idParam((await params).id))
  return ok({ asks: await loadAsks(createAdminClient(), s.id) })
})

/** Doskaga chiqarish / javob berildi / yashirish. */
export const PATCH = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`session-asks-mod:${profile.id}`, 120, 60_000)
  const s = await getControlledSession(await createClient(), profile, idParam((await params).id))
  const b = await readJson(req, patchSchema)
  const { error } = await createAdminClient().rpc('app_ask_moderate', {
    p_ask_id: b.ask_id,
    p_session_id: s.id,
    p_on_board: b.on_board ?? null,
    p_answered: b.answered ?? null,
    p_hidden: b.hidden ?? null,
  })
  if (error) mapDbError(error)
  return ok({ saved: true })
})
