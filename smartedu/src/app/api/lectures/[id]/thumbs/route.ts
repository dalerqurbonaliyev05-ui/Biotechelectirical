import { ApiError, handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/** Slayd miniatyuralari uchun imzolangan havolalar (slayd raqami bo'yicha). */
export const GET = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`thumbs:${profile.id}`, 60, 60_000)
  const id = idParam((await params).id)
  const { data: slides } = await (
    await createClient()
  )
    .from('lecture_slides')
    .select('slide_no, thumb_path')
    .eq('lecture_id', id)
    .order('slide_no')
  if (!slides) throw new ApiError(404, 'not_found')
  const paths = slides.flatMap((s) => (s.thumb_path ? [s.thumb_path as string] : []))
  const { data: signed } = paths.length
    ? await createAdminClient().storage.from('lectures').createSignedUrls(paths, 3600)
    : { data: [] }
  const byPath = new Map((signed ?? []).map((x) => [x.path, x.signedUrl]))
  return ok({
    thumbs: slides.map((s) => ({
      slide_no: s.slide_no as number,
      url: s.thumb_path ? (byPath.get(s.thumb_path as string) ?? null) : null,
    })),
  })
})
