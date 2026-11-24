import { z } from 'zod'
import { handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { closeOpenQuestion } from '@/lib/server/live-questions'
import { buildSessionState, getControlledSession, type SessionRow } from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({ slide: z.number().int().min(1).max(5000) })

export const POST = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`session-slide:${profile.id}`, 240, 60_000)
  const id = idParam((await params).id)
  const { slide } = await readJson(req, schema)
  const session = await getControlledSession(await createClient(), profile, id)
  const admin = createAdminClient()

  // Sakrash/orqaga: ochiq savol yopiladi, nuqta TO'XTAMAYDI (nuqta faqat "Keyingi" bilan oldinga o'tishda to'xtatadi)
  if (slide !== session.current_slide) await closeOpenQuestion(admin, id)
  const { data, error } = await admin.rpc('app_session_set_slide', {
    p_session_id: id,
    p_slide: slide,
  })
  if (error) mapDbError(error)
  const row = data as SessionRow
  return ok(await buildSessionState(admin, row))
})
