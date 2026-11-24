import { handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { leaderboardForBoard, slideReactionTotals } from '@/lib/server/reactions'
import { getControlledSession } from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Doska/boshqaruv: joriy slayd reaksiyalari (jami) va "eng faol" talabalar. Ismlar FAQAT o'qituvchi
 * "ismlarni ko'rsatish"ni yoqqan bo'lsagina qaytadi (doskada ko'rinadi). Talabaga bu yo'l yopiq.
 */
export const GET = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`session-reactions:${profile.id}`, 90, 60_000)
  const s = await getControlledSession(await createClient(), profile, idParam((await params).id))
  const admin = createAdminClient()
  const [totals, leaders] = await Promise.all([
    slideReactionTotals(admin, s.id, s.current_slide),
    leaderboardForBoard(admin, s.id, s.top_reactors, s.show_reactor_names),
  ])
  return ok({
    slide: s.current_slide,
    ...totals,
    leaders,
    confusedEnabled: s.confused_enabled,
  })
})
