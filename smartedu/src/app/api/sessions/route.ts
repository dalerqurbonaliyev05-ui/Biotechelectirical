import { z } from 'zod'
import { ApiError, handle, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { buildSessionState, type SessionRow } from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  lecture_id: z.guid(),
  group_id: z.guid().nullable().optional(),
  room_id: z.guid().nullable().optional(),
})

/** Jonli dars boshlash: 6 xonali qo'shilish kodi bilan sessiya yaratadi. */
export const POST = handle(async (req) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`session-create:${profile.id}`, 20, 60_000)
  const body = await readJson(req, schema)

  // RLS: ma'ruza o'qituvchiga ko'rinishi shart
  const { data: lec } = await (
    await createClient()
  )
    .from('lectures')
    .select('id')
    .eq('id', body.lecture_id)
    .maybeSingle()
  if (!lec) throw new ApiError(404, 'not_found')

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('app_create_session', {
    p_lecture_id: body.lecture_id,
    p_actor: profile.id,
    p_group_id: body.group_id ?? null,
    p_room_id: body.room_id ?? null,
  })
  if (error) mapDbError(error)
  return ok(await buildSessionState(admin, data as SessionRow))
})
