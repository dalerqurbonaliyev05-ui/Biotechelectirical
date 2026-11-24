import { handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { finalizeAttendance } from '@/lib/server/attendance'
import { closeOpenQuestion } from '@/lib/server/live-questions'
import { buildSessionState, getControlledSession, type SessionRow } from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const POST = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`session-end:${profile.id}`, 30, 60_000)
  const id = idParam((await params).id)
  const before = await getControlledSession(await createClient(), profile, id)
  const admin = createAdminClient()
  await closeOpenQuestion(admin, id)
  // Tanaffus ochiq qolgan bo'lsa yopamiz (davomat hisobi to'g'ri chiqsin)
  if (before.break_started_at) await admin.rpc('app_break_end', { p_session_id: id })
  const { data, error } = await admin.rpc('app_session_end', { p_session_id: id })
  if (error) mapDbError(error)
  const row = data as SessionRow
  // Davomat (NB) natijalari: faqat birinchi tugatishda hisoblanadi (qayta chaqirilsa — qo'lda tuzatishlar saqlanadi)
  if (before.status === 'active') await finalizeAttendance(admin, row)
  return ok(await buildSessionState(admin, row))
})
