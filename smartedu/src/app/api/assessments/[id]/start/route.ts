import { handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { startAttempt } from '@/lib/server/assessments'
import { createAdminClient } from '@/lib/supabase/admin'

/** Nazoratni boshlash / davom ettirish. Vaqt DB soati bilan, shartlar DB funksiyasida tekshiriladi. */
export const POST = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['student'])
  limit(`start:${profile.id}`, 20, 60_000)
  const id = idParam((await params).id)
  const attempt = await startAttempt(createAdminClient(), profile.id, id)
  return ok({ attempt_id: attempt.id })
})
