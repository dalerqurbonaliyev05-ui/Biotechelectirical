import { handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { sessionRating } from '@/lib/server/live-questions'
import { getControlledSession } from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/** Doska: reyting (eng yaxshi 10 ta; qisqartirilgan ismlar). Dars tugaganda medallar bilan. */
export const GET = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`session-rating:${profile.id}`, 60, 60_000)
  const s = await getControlledSession(await createClient(), profile, idParam((await params).id))
  const rows = await sessionRating(createAdminClient(), s.id)
  return ok({ top: rows.slice(0, 10), total: rows.length, ended: s.status === 'ended' })
})
