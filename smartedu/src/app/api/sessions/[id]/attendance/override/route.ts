import { z } from 'zod'
import { handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { getControlledSession } from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  student_id: z.guid(),
  status: z.enum(['present', 'nb']),
  reason: z.string().trim().min(3).max(300),
})

/** NB ro'yxatini qo'lda tuzatish: sabab MAJBURIY; har bir tuzatish audit_log'ga yoziladi. Faqat shu dars o'qituvchisi/admin. */
export const POST = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`attendance-override:${profile.id}`, 60, 60_000)
  const id = idParam((await params).id)
  const body = await readJson(req, schema)
  await getControlledSession(await createClient(), profile, id)
  const { error } = await createAdminClient().rpc('app_override_attendance', {
    p_session_id: id,
    p_student_id: body.student_id,
    p_status: body.status,
    p_reason: body.reason,
    p_actor: profile.id,
  })
  if (error) mapDbError(error)
  return ok({ saved: true })
})
