import { ApiError, handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { createClient } from '@/lib/supabase/server'

export const DELETE = handle<{ id: string; bookId: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`lecture-write:${profile.id}`, 60, 60_000)
  const p = await params
  const { data } = await (
    await createClient()
  )
    .from('slide_books')
    .delete()
    .eq('id', idParam(p.bookId))
    .eq('lecture_id', idParam(p.id))
    .select('id')
  if (!data || data.length === 0) throw new ApiError(404, 'not_found')
  return ok({ ok: true })
})
