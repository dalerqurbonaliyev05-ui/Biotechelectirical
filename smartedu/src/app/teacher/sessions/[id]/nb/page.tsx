import Link from 'next/link'
import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n'
import { effectiveStatus, type AttendanceStatus } from '@/lib/presence'
import { findControlledSession } from '@/lib/server/sessions'
import { requireRole } from '@/lib/server/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NbManager, type NbRow } from './nb-manager'

const P = t.presence
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * NB ro'yxati: FAQAT shu dars o'qituvchisi (yoki admin) ko'radi. `findControlledSession` RLS ostida ishlaydi:
 * boshqa o'qituvchining darsi uchun 404. Bu sahifa doska yo'llariga ulanmagan.
 */
export default async function NbPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('teacher', 'admin')
  const { id } = await params
  if (!GUID.test(id)) notFound()
  const session = await findControlledSession(await createClient(), me, id)
  if (!session) notFound()

  const admin = createAdminClient()
  const { data } = await admin
    .from('attendance')
    .select(
      'student_id, status, attendance_ratio, present_seconds, override_status, override_reason',
    )
    .eq('session_id', id)
    .limit(2000)
  const ids = (data ?? []).map((r) => r.student_id as string)
  const names = new Map<string, { full_name: string; student_code: string | null }>()
  for (let i = 0; i < ids.length; i += 80) {
    const { data: ps } = await admin
      .from('profiles')
      .select('id, full_name, student_code')
      .in('id', ids.slice(i, i + 80))
    for (const p of ps ?? [])
      names.set(p.id as string, {
        full_name: String(p.full_name),
        student_code: (p.student_code as string | null) ?? null,
      })
  }
  const rows: NbRow[] = (data ?? [])
    .filter((r) => names.has(r.student_id as string)) // mehmonlar (profilsiz) NB ro'yxatiga kirmaydi
    .map((r) => {
      const status = r.status as AttendanceStatus
      const override = (r.override_status as AttendanceStatus | null) ?? null
      return {
        studentId: r.student_id as string,
        name: names.get(r.student_id as string)!.full_name,
        code: names.get(r.student_id as string)!.student_code,
        status: effectiveStatus(status, override),
        auto: status,
        overridden: override !== null,
        reason: (r.override_reason as string | null) ?? null,
        ratio: r.attendance_ratio === null ? null : Number(r.attendance_ratio),
        minutes: r.present_seconds === null ? null : Math.round(Number(r.present_seconds) / 60),
      }
    })
    .sort((a, b) =>
      a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'nb' ? -1 : 1,
    )

  return (
    <div className="space-y-4">
      <Link href={`/teacher/sessions/${id}`} className="text-sm text-brand-600 hover:underline">
        {t.results.back}
      </Link>
      <h1 className="text-2xl font-bold">{P.nbTitle}</h1>
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{P.nbLead}</p>
      <p className="text-xs text-slate-500">
        {P.legend} ({Math.round(Number(session.min_attendance_ratio) * 100)}%)
      </p>
      {session.status === 'active' ? (
        <p className="card text-sm text-slate-600">{t.live.boardHint}</p>
      ) : (
        <NbManager sessionId={id} rows={rows} />
      )}
    </div>
  )
}
