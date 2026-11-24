import { z } from 'zod'
import { handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { autoOpenForSlide, closeOpenQuestion } from '@/lib/server/live-questions'
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

  // 1) ochiq savol yopiladi  2) slayd o'zgaradi  3) yangi slaydda rejalashtirilgan savol bo'lsa — doska to'xtab savol chiqaradi
  if (slide !== session.current_slide) await closeOpenQuestion(admin, id)
  const { data, error } = await admin.rpc('app_session_set_slide', {
    p_session_id: id,
    p_slide: slide,
  })
  if (error) mapDbError(error)
  let row = data as SessionRow
  if (slide !== session.current_slide && (await autoOpenForSlide(admin, row, slide))) {
    const { data: fresh } = await admin
      .from('lecture_sessions')
      .select('id, lecture_id, created_by, group_id, code, status, current_slide, rev')
      .eq('id', id)
      .single()
    row = fresh as SessionRow
  }
  return ok(await buildSessionState(admin, row))
})
