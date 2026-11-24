import { z } from 'zod'
import { ApiError, handle, idParam, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({ reveal: z.boolean() })

/** To'g'ri javoblar va izohlarni talabalarga ochish/yopish (faqat nazorat yaratuvchisi yoki admin). */
export const POST = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`reveal:${profile.id}`, 20, 60_000)
  const id = idParam((await params).id)
  const { reveal } = await readJson(req, schema)

  const at = reveal ? new Date().toISOString() : null
  const { data } = await (
    await createClient()
  )
    .from('assessments')
    .update({ answers_revealed_at: at })
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (!data) throw new ApiError(404, 'not_found')

  await createAdminClient()
    .from('audit_log')
    .insert({
      actor_id: profile.id,
      action: reveal ? 'answers.reveal' : 'answers.hide',
      entity: 'assessment',
      entity_id: id,
      assessment_id: id,
      new_value: { answers_revealed_at: at },
    })
  return ok({ answers_revealed_at: at })
})
