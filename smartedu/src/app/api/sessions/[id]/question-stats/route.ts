import { handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { questionStats } from '@/lib/server/live-questions'
import { getControlledSession } from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/** Doska/boshqaruv: joriy savol bo'yicha jonli statistika (to'g'ri javob faqat savol yopilgach). */
export const GET = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`question-stats:${profile.id}`, 120, 60_000)
  const s = await getControlledSession(await createClient(), profile, idParam((await params).id))
  return ok({ stats: await questionStats(createAdminClient(), s) })
})
