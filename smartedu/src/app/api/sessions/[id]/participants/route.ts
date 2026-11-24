import { handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { participantNames } from '@/lib/server/names'
import { getControlledSession } from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/** Ishtirokchilar ro'yxati (o'qituvchi: bloklash/bog'lash uchun). Faqat dars egasi. */
export const GET = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`participants:${profile.id}`, 60, 60_000)
  const id = idParam((await params).id)
  await getControlledSession(await createClient(), profile, id)
  const admin = createAdminClient()
  const { data } = await admin
    .from('session_participants')
    .select(
      'id, student_id, mode, joined_at, rejoin_count, is_guest, guest_group, blocked, linked_student_id',
    )
    .eq('session_id', id)
    .order('joined_at')
    .limit(2000)
  const names = await participantNames(admin, id)
  return ok({
    participants: (data ?? []).map((r) => ({
      id: r.id as string,
      name: names.get(r.student_id as string)?.full_name ?? '—',
      code: names.get(r.student_id as string)?.student_code ?? null,
      isGuest: Boolean(r.is_guest) && !r.linked_student_id,
      guestGroup: (r.guest_group as string | null) ?? null,
      mode: r.mode as string,
      rejoin: Number(r.rejoin_count),
      blocked: Boolean(r.blocked),
      linked: Boolean(r.linked_student_id),
    })),
  })
})
