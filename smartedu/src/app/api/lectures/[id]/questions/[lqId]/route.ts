import { checkpointItemPatchSchema } from '@/lib/lecture-schemas'
import { ApiError, handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { createClient } from '@/lib/supabase/server'

type P = { id: string; lqId: string }

/** Nuqta savolini o'zgartirish: vaqt, bonus belgisi, tartibni almashtirish (yuqori/past). */
export const PATCH = handle<P>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`lecture-write:${profile.id}`, 120, 60_000)
  const p = await params
  const lectureId = idParam(p.id)
  const lqId = idParam(p.lqId)
  const body = await readJson(req, checkpointItemPatchSchema)
  const supabase = await createClient()

  const { data: me } = await supabase
    .from('lecture_questions')
    .select('id, checkpoint_id, position')
    .eq('id', lqId)
    .eq('lecture_id', lectureId)
    .maybeSingle()
  if (!me) throw new ApiError(404, 'not_found')

  if (body.move) {
    const { data: siblings } = await supabase
      .from('lecture_questions')
      .select('id, position')
      .eq('checkpoint_id', me.checkpoint_id)
      .order('position')
      .order('created_at')
    const list = siblings ?? []
    const i = list.findIndex((x) => x.id === lqId)
    const j = body.move === 'up' ? i - 1 : i + 1
    if (i >= 0 && j >= 0 && j < list.length) {
      // Qo'shni bilan o'rin almashtirish (pozitsiyalar qayta raqamlanadi: teng pozitsiya bo'lsa ham to'g'ri ishlaydi)
      ;[list[i], list[j]] = [list[j]!, list[i]!]
      for (const [idx, row] of list.entries())
        await supabase
          .from('lecture_questions')
          .update({ position: idx + 1 })
          .eq('id', row.id)
    }
  }
  const patch: Record<string, unknown> = {}
  if (body.time_limit_sec !== undefined) patch.time_limit_sec = body.time_limit_sec ?? 30
  if (body.is_bonus !== undefined) patch.is_bonus = body.is_bonus
  if (Object.keys(patch).length) {
    const { error } = await supabase.from('lecture_questions').update(patch).eq('id', lqId)
    if (error) throw error
  }
  return ok({ ok: true })
})

export const DELETE = handle<P>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`lecture-write:${profile.id}`, 60, 60_000)
  const p = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('lecture_questions')
    .delete()
    .eq('id', idParam(p.lqId))
    .eq('lecture_id', idParam(p.id))
    .select('id, checkpoint_id')
  if (!data || data.length === 0) throw new ApiError(404, 'not_found')
  // Bo'sh qolgan nuqta ham o'chiriladi
  const cp = data[0]?.checkpoint_id as string | null
  if (cp) {
    const { count } = await supabase
      .from('lecture_questions')
      .select('id', { count: 'exact', head: true })
      .eq('checkpoint_id', cp)
    if ((count ?? 0) === 0) await supabase.from('lecture_checkpoints').delete().eq('id', cp)
  }
  return ok({ ok: true })
})
