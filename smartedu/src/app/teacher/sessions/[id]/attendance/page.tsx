import Link from 'next/link'
import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n'
import { findControlledSession } from '@/lib/server/sessions'
import { requireRole } from '@/lib/server/session'
import { createClient } from '@/lib/supabase/server'

const A = t.attendance
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('uz-UZ', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'Asia/Tashkent',
  })
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function AttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('teacher', 'admin')
  const { id } = await params
  if (!GUID.test(id)) notFound()
  const supabase = await createClient()
  const session = await findControlledSession(supabase, me, id)
  if (!session) notFound()

  const { data } = await supabase
    .from('session_participants')
    .select('student_id, mode, joined_at, rejoin_count, profiles(full_name, student_code)')
    .eq('session_id', id)
    .order('joined_at')
  const rows = (data ?? []) as unknown as {
    student_id: string
    mode: 'auditorium' | 'remote'
    joined_at: string
    rejoin_count: number
    profiles: { full_name: string; student_code: string | null } | null
  }[]

  let absent: { full_name: string; student_code: string | null }[] = []
  if (session.group_id) {
    const { data: students } = await supabase
      .from('profiles')
      .select('id, full_name, student_code')
      .eq('role', 'student')
      .eq('group_id', session.group_id)
      .eq('is_active', true)
      .order('student_code')
    const present = new Set(rows.map((r) => r.student_id))
    absent = (students ?? [])
      .filter((s) => !present.has(s.id as string))
      .map((s) => ({
        full_name: s.full_name as string,
        student_code: s.student_code as string | null,
      }))
  }
  const auditorium = rows.filter((r) => r.mode === 'auditorium').length

  return (
    <div className="space-y-4">
      <Link href={`/teacher/sessions/${id}`} className="text-sm text-brand-600 hover:underline">
        {t.results.back}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{A.title}</h1>
        <a className="btn-secondary" href={`/api/sessions/${id}/attendance`} download>
          {A.export}
        </a>
      </div>
      <p className="text-sm text-slate-600">
        {A.present}: <b>{rows.length}</b> ({A.auditorium}: {auditorium}, {A.remote}:{' '}
        {rows.length - auditorium})
        {session.group_id && (
          <>
            {' '}
            · {A.absent}: <b>{absent.length}</b>
          </>
        )}
      </p>
      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{A.note}</p>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t.importStudents.columns.code}</th>
              <th>{A.student}</th>
              <th>{A.mode}</th>
              <th>{A.joinedAt}</th>
              <th title={A.rejoinsHint}>{A.rejoins}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.student_id}>
                <td className="font-mono text-xs">{r.profiles?.student_code}</td>
                <td>{r.profiles?.full_name}</td>
                <td>
                  <span className="badge">{r.mode === 'auditorium' ? A.auditorium : A.remote}</span>
                </td>
                <td className="whitespace-nowrap">{fmt(r.joined_at)}</td>
                <td className={r.rejoin_count >= 2 ? 'font-semibold text-amber-700' : ''}>
                  {r.rejoin_count}
                </td>
              </tr>
            ))}
            {absent.map((s, i) => (
              <tr key={`a${i}`} className="text-slate-400">
                <td className="font-mono text-xs">{s.student_code}</td>
                <td>{s.full_name}</td>
                <td colSpan={3}>{A.absent}</td>
              </tr>
            ))}
            {rows.length === 0 && absent.length === 0 && (
              <tr>
                <td colSpan={5} className="text-slate-500">
                  {t.app.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
