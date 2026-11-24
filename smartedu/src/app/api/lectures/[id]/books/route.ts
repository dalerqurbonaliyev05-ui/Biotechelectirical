import { slideBookSchema } from '@/lib/lecture-schemas'
import { ApiError, handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { createClient } from '@/lib/supabase/server'

/** Slaydga kitob havolasi biriktirish (hozircha qo'lda: nom, slug, bet). */
export const POST = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`lecture-write:${profile.id}`, 60, 60_000)
  const id = idParam((await params).id)
  const body = await readJson(req, slideBookSchema)
  const supabase = await createClient()
  const { data: lec } = await supabase
    .from('lectures')
    .select('page_count')
    .eq('id', id)
    .maybeSingle()
  if (!lec) throw new ApiError(404, 'not_found')
  if (body.slide_no > Number(lec.page_count))
    throw new ApiError(400, 'validation', 'slide_out_of_range')
  const { data, error } = await supabase
    .from('slide_books')
    .insert({ lecture_id: id, ...body, page: body.page ?? null })
    .select('id')
    .single()
  if (error) throw error
  return ok({ id: data.id })
})
