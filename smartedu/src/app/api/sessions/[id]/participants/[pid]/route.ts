import { z } from 'zod'
import { ApiError, handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { getControlledSession } from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('block') }),
  z.object({ action: z.literal('unblock') }),
  z.object({ action: z.literal('link'), student_id: z.guid() }),
])

/** Ishtirokchini chiqarib yuborish/bloklash (qayta kira olmaydi), blokdan chiqarish, dars tugagach mehmonni talabaga bog'lash. */
export const POST = handle<{ id: string; pid: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`participant-act:${profile.id}`, 120, 60_000)
  const p = await params
  const id = idParam(p.id)
  const pid = idParam(p.pid)
  const body = await readJson(req, schema)
  await getControlledSession(await createClient(), profile, id)
  const admin = createAdminClient()

  if (body.action === 'link') {
    // Faqat o'qituvchiga ko'rinadigan (o'z guruhidagi) talaba bilan bog'lash mumkin (RLS)
    const { data: st } = await (
      await createClient()
    )
      .from('profiles')
      .select('id')
      .eq('id', body.student_id)
      .eq('role', 'student')
      .maybeSingle()
    if (!st) throw new ApiError(404, 'not_found')
    const { error } = await admin.rpc('app_link_guest', {
      p_session_id: id,
      p_participant_id: pid,
      p_student_id: body.student_id,
    })
    if (error) mapDbError(error)
    return ok({ ok: true })
  }
  const { data, error } = await admin
    .from('session_participants')
    .update({ blocked: body.action === 'block' })
    .eq('id', pid)
    .eq('session_id', id)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new ApiError(404, 'not_found')
  return ok({ ok: true })
})
