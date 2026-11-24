import { z } from 'zod'
import { ApiError, handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { closeOpenQuestion, openPlannedQuestion } from '@/lib/server/live-questions'
import { SESSION_COLS, buildSessionState, getControlledSession } from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('open'), lecture_question_id: z.guid() }),
  z.object({ action: z.literal('close') }),
])

/** O'qituvchi: rejalashtirilgan savolni ochish yoki ochiq savolni yopish. Yangi holat qaytadi. */
export const POST = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`session-question:${profile.id}`, 120, 60_000)
  const id = idParam((await params).id)
  const body = await readJson(req, schema)
  const session = await getControlledSession(await createClient(), profile, id)
  if (session.status !== 'active') throw new ApiError(409, 'session_ended')

  const admin = createAdminClient()
  if (body.action === 'open') await openPlannedQuestion(admin, session, body.lecture_question_id)
  else await closeOpenQuestion(admin, id)

  const { data: fresh } = await admin
    .from('lecture_sessions')
    .select(SESSION_COLS)
    .eq('id', id)
    .single()
  return ok(await buildSessionState(admin, fresh as typeof session))
})
