import { toCsv } from '@/lib/csv'
import { ApiError, handle, idParam, limit, requireUser } from '@/lib/server/api'
import { participantNames } from '@/lib/server/names'
import { getControlledSession } from '@/lib/server/sessions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const tz = (iso: string) => new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' })

/** Davomat CSV (guruh belgilangan bo'lsa, kelmaganlar ham). Faqat shu dars o'qituvchisi (yoki admin). */
export const GET = handle<{ id: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`attendance-export:${profile.id}`, 20, 60_000)
  const id = idParam((await params).id)
  const supabase = await createClient()
  const s = await getControlledSession(supabase, profile, id)

  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('session_participants')
    .select('student_id, mode, joined_at, rejoin_count, is_guest, linked_student_id')
    .eq('session_id', id)
    .order('joined_at')
    .limit(2000)
  const names = await participantNames(admin, id)
  const present = (rows ?? []).map((r) => {
    const p = names.get(r.student_id as string)
    return [
      p?.student_code ?? '',
      p?.full_name ?? '',
      r.is_guest && !r.linked_student_id ? 'guest' : 'present',
      r.mode as string,
      tz(r.joined_at as string),
      Number(r.rejoin_count),
    ]
  })
  const codes = new Set(present.map((r) => r[0]).filter(Boolean))
  let absent: (string | number)[][] = []
  if (s.group_id) {
    const { data: students } = await admin
      .from('profiles')
      .select('full_name, student_code')
      .eq('role', 'student')
      .eq('group_id', s.group_id)
      .eq('is_active', true)
      .order('student_code')
      .limit(1000)
    absent = (students ?? [])
      .filter((x) => !codes.has(x.student_code as string))
      .map((x) => [x.student_code ?? '', x.full_name, 'absent', '', '', ''])
  }
  if (present.length + absent.length === 0) throw new ApiError(404, 'not_found')
  return new Response(
    toCsv([
      ['student_code', 'full_name', 'status', 'mode', 'joined_at', 'rejoin_count'],
      ...present,
      ...absent,
    ]),
    {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="davomat-${s.code}.csv"`,
      },
    },
  )
})
