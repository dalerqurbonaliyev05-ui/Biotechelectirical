import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { attendedSeconds, computeAttendance, lessonSeconds, type Interval } from '@/lib/presence'
import { mapDbError } from '@/lib/server/db-errors'
import type { SessionRow } from '@/lib/server/sessions'

/**
 * Dars tugaganda davomat holatini hisoblab `attendance` jadvaliga yozadi (NB — "bo'lmagan").
 * Ro'yxatga FAQAT shu dars o'qituvchisi/talabaning o'zi kira oladi; doska holatiga hech qachon chiqmaydi.
 * Mehmonlar (talabaga bog'lanmagan) NB ro'yxatiga kirmaydi. Guruh belgilangan bo'lsa, qo'shilmagan a'zolar ham NB.
 */
export async function finalizeAttendance(
  admin: SupabaseClient,
  session: SessionRow,
): Promise<number> {
  const endedAt = new Date(session.ended_at ?? Date.now())
  const startedAt = new Date(session.started_at)
  const [{ data: parts }, { data: br }] = await Promise.all([
    admin
      .from('session_participants')
      .select('student_id, mode, joined_at, present_seconds, is_guest, linked_student_id')
      .eq('session_id', session.id)
      .limit(2000),
    admin.from('session_breaks').select('started_at, ended_at').eq('session_id', session.id),
  ])
  const breaks: Interval[] = (br ?? []).map((b) => ({
    start: new Date(b.started_at as string),
    end: b.ended_at ? new Date(b.ended_at as string) : null,
  }))
  const lesson = lessonSeconds(startedAt, endedAt, breaks)
  const rows: { student_id: string; status: string; ratio: number; present_seconds: number }[] = []
  const seen = new Set<string>()
  for (const p of parts ?? []) {
    if (p.is_guest && !p.linked_student_id) continue
    const secs = attendedSeconds(
      {
        mode: p.mode as 'auditorium' | 'remote',
        joinedAt: new Date(p.joined_at as string),
        visibleSeconds: Number(p.present_seconds),
      },
      startedAt,
      endedAt,
      breaks,
    )
    const r = computeAttendance(secs, lesson, Number(session.min_attendance_ratio))
    seen.add(p.student_id as string)
    rows.push({
      student_id: p.student_id as string,
      status: r.status,
      ratio: r.ratio,
      present_seconds: secs,
    })
  }
  if (session.group_id) {
    const { data: students } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'student')
      .eq('is_active', true)
      .eq('group_id', session.group_id)
      .limit(1000)
    for (const s of students ?? [])
      if (!seen.has(s.id as string))
        rows.push({ student_id: s.id as string, status: 'nb', ratio: 0, present_seconds: 0 })
  }
  if (rows.length === 0) return 0
  const { data, error } = await admin.rpc('app_write_attendance_results', {
    p_session_id: session.id,
    p_rows: rows,
  })
  if (error) mapDbError(error)
  return Number(data ?? rows.length)
}
