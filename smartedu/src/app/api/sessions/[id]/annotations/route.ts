import { z } from 'zod'
import { parseItems, annotationItemsSchema } from '@/lib/annotations'
import { ApiError, handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { mapDbError } from '@/lib/server/db-errors'
import { getControlledSession } from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const putSchema = z.object({
  slide: z.number().int().min(1).max(5000),
  items: annotationItemsSchema,
})

/** Doska: slayd izohlarini o'qish. Faqat shu dars o'qituvchisi (yoki admin). */
export const GET = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`annot-read:${profile.id}`, 120, 60_000)
  const s = await getControlledSession(await createClient(), profile, idParam((await params).id))
  const slide = Number(new URL(req.url).searchParams.get('slide'))
  if (!Number.isInteger(slide) || slide < 1) throw new ApiError(400, 'validation')
  const { data } = await createAdminClient()
    .from('session_annotations')
    .select('items')
    .eq('session_id', s.id)
    .eq('slide_no', slide)
    .maybeSingle()
  return ok({ slide, items: parseItems(data?.items) ?? [] })
})

/** Izohlarni saqlash (butun slayd hujjati almashtiriladi). Sxema va hajm serverda ham tekshiriladi. */
export const PUT = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`annot-write:${profile.id}`, 120, 60_000)
  const s = await getControlledSession(await createClient(), profile, idParam((await params).id))
  const body = await readJson(req, putSchema)
  const { error } = await createAdminClient().rpc('app_save_annotations', {
    p_session_id: s.id,
    p_slide: body.slide,
    p_items: body.items,
  })
  if (error) mapDbError(error)
  return ok({ saved: true })
})
