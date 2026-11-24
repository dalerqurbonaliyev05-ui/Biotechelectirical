import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { pickTopReactors } from '@/lib/reactions'
import { mapDbError } from '@/lib/server/db-errors'
import { participantNames } from '@/lib/server/names'

/** Joriy slayd bo'yicha jami reaksiyalar (barcha ishtirokchilar yig'indisi; shaxsiy ma'lumotsiz). */
export async function slideReactionTotals(
  admin: SupabaseClient,
  sessionId: string,
  slide: number,
): Promise<{ understood: number; confused: number; reactors: number }> {
  const { data } = await admin
    .from('session_reactions')
    .select('student_id, kind, cnt')
    .eq('session_id', sessionId)
    .eq('slide_no', slide)
    .limit(1000)
  let understood = 0
  let confused = 0
  const who = new Set<string>()
  for (const r of data ?? []) {
    if (r.kind === 'understood') understood += Number(r.cnt)
    else confused += Number(r.cnt)
    who.add(r.student_id as string)
  }
  return { understood, confused, reactors: who.size }
}

/** Dars davomida eng faol talabalar (bloklanganlarsiz), deterministik tartibda. */
export async function topReactors(
  admin: SupabaseClient,
  sessionId: string,
  n: number,
): Promise<{ studentId: string; total: number }[]> {
  const { data, error } = await admin.rpc('app_top_reactors', {
    p_session_id: sessionId,
    p_limit: n,
  })
  if (error) mapDbError(error)
  return pickTopReactors(
    ((data ?? []) as { out_student_id: string; out_total: number }[]).map((r) => ({
      studentId: r.out_student_id,
      total: Number(r.out_total),
    })),
    n,
  )
}

/** Doskada ko'rsatish uchun: ismlar FAQAT o'qituvchi "ismlarni ko'rsatish"ni yoqqan bo'lsa. */
export async function leaderboardForBoard(
  admin: SupabaseClient,
  sessionId: string,
  n: number,
  showNames: boolean,
): Promise<{ count: number; names: string[] }> {
  const top = await topReactors(admin, sessionId, n)
  if (!showNames || top.length === 0) return { count: top.length, names: [] }
  const names = await participantNames(
    admin,
    sessionId,
    top.map((t) => t.studentId),
  )
  return { count: top.length, names: top.map((t) => names.get(t.studentId)?.full_name ?? '—') }
}
