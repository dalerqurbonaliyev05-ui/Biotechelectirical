import { handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { createAdminClient } from '@/lib/supabase/admin'

/** Sahifadan chiqish SIGNALI (hisoblagich). Jazo emas: o'qituvchiga ma'lumot sifatida ko'rinadi. */
export const POST = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['student'])
  limit(`leave:${profile.id}`, 60, 60_000)
  await createAdminClient().rpc('app_attempt_leave', {
    p_attempt_id: idParam((await params).id),
    p_student_id: profile.id,
  })
  return ok({ ok: true })
})
