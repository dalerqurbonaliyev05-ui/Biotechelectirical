import { toCsv } from '@/lib/csv'
import { ApiError, handle, limit, requireUser } from '@/lib/server/api'
import { loadGroupSemester } from '@/lib/server/analytics'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

/** Guruhning semestr reytingi (CSV). O'qituvchi faqat o'z guruhlarini oladi. */
export const GET = handle(async (req) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`rating-export:${profile.id}`, 20, 60_000)
  const group = z.guid().safeParse(req.nextUrl.searchParams.get('group'))
  if (!group.success) throw new ApiError(400, 'validation')

  if (profile.role === 'teacher') {
    const { data } = await (
      await createClient()
    )
      .from('teacher_subjects')
      .select('group_id')
      .eq('teacher_id', profile.id)
      .eq('group_id', group.data)
      .limit(1)
    if (!data || data.length === 0) throw new ApiError(403, 'forbidden')
  }
  const rows = await loadGroupSemester(createAdminClient(), group.data)
  return new Response(
    toCsv([
      [
        'rank',
        'student_code',
        'full_name',
        'live_points',
        'live_sessions',
        'assessment_points',
        'assessments',
        'total',
      ],
      ...rows.map((r) => [
        r.rank,
        r.code,
        r.name,
        r.totals.live,
        r.totals.sessions,
        r.totals.assessments,
        r.totals.attempts,
        r.totals.total,
      ]),
    ]),
    {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="semestr-reyting.csv"',
      },
    },
  )
})
