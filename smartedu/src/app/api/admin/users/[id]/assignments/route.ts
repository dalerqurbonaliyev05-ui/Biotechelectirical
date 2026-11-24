import { z } from 'zod'
import { handle, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { replaceAssignments } from '@/lib/server/accounts'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  assignments: z.array(z.object({ subject_id: z.guid(), group_id: z.guid() })).max(100),
})

export const PUT = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['admin'])
  limit(`assign:${profile.id}`, 60, 60_000)
  const { id } = await params
  const { assignments } = await readJson(req, schema)
  await replaceAssignments(createAdminClient(), id, assignments)
  return ok({ ok: true })
})
