import Link from 'next/link'
import { attendanceSummary } from '@/lib/analytics'
import { canSeeScore, type ShowScorePolicy } from '@/lib/assessment/policy'
import { CodeEntry } from '@/components/code-entry'
import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const S = t.studentHome
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('uz-UZ', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Tashkent',
  })

interface AssessmentRow {
  id: string
  title: string
  opens_at: string
  closes_at: string
  duration_minutes: number
  show_score: ShowScorePolicy
  subjects: { name: string } | null
}

export default async function StudentHome() {
  const me = await requireRole('student')
  const supabase = await createClient()
  const { data: group } = me.group_id
    ? await supabase.from('groups').select('name').eq('id', me.group_id).maybeSingle()
    : { data: null }

  // RLS: faqat o'z guruhining e'lon qilingan nazoratlari
  const { data } = await supabase
    .from('assessments')
    .select('id, title, opens_at, closes_at, duration_minutes, show_score, subjects(name)')
    .order('opens_at', { ascending: false })
    .limit(100)
  const assessments = (data ?? []) as unknown as AssessmentRow[]

  // Urinishlar: server orqali, faqat o'zining; ball faqat ko'rinishi mumkin bo'lganda uzatiladi
  const { data: attempts } = await createAdminClient()
    .from('attempts')
    .select('id, assessment_id, status, deadline_at, total_score, max_score')
    .eq('student_id', me.id)
  // Mening qatnashishim: guruhimning tugagan darslari bo'yicha (faqat o'zimning yozuvlarim; boshqalarniki ko'rinmaydi)
  let myAttendance: { present: number; total: number; pct: number | null } | null = null
  if (me.group_id) {
    const { data: sess } = await createAdminClient()
      .from('lecture_sessions')
      .select('id')
      .eq('group_id', me.group_id)
      .eq('status', 'ended')
      .limit(500)
    const ids = (sess ?? []).map((s) => s.id as string)
    if (ids.length) {
      const { data: att } = await createAdminClient()
        .from('attendance')
        .select('status, override_status')
        .eq('student_id', me.id)
        .in('session_id', ids.slice(0, 200))
      const sum = attendanceSummary(
        (att ?? []).map((a) => ({
          status: a.status as 'present' | 'nb',
          override: a.override_status as 'present' | 'nb' | null,
        })),
      )
      // Jami = tugagan darslar soni (ishtirok etmagan dars ham hisobga kiradi)
      const total = Math.max(ids.slice(0, 200).length, sum.total)
      myAttendance = {
        present: sum.present,
        total,
        pct: total > 0 ? Math.round((sum.present / total) * 1000) / 10 : null,
      }
    }
  }
  // Dars xulosalari: men qatnashgan tugagan darslar (oxirgi 8 ta)
  const admin2 = createAdminClient()
  const { data: myParts } = await admin2
    .from('session_participants')
    .select('session_id, lecture_sessions!inner(id, status, started_at, lectures(title))')
    .eq('student_id', me.id)
    .eq('lecture_sessions.status', 'ended')
    .order('joined_at', { ascending: false })
    .limit(8)
  const lessons = (myParts ?? []).map((p) => {
    const ls = p.lecture_sessions as unknown as {
      id: string
      started_at: string
      lectures: { title: string } | null
    }
    return { id: ls.id, title: ls.lectures?.title ?? '', at: ls.started_at }
  })
  const byAssessment = new Map((attempts ?? []).map((a) => [a.assessment_id as string, a]))
  const now = new Date()

  const cards = assessments.map((a) => {
    const at = byAssessment.get(a.id)
    let state: string
    let score: string | null = null
    if (at) {
      if (at.status === 'in_progress')
        state = now.getTime() <= Date.parse(at.deadline_at) + 5000 ? 'in_progress' : 'awaiting'
      else if (
        canSeeScore(
          { policy: a.show_score, status: at.status, closesAt: new Date(a.closes_at) },
          now,
        )
      ) {
        state = 'result'
        score = `${Number(at.total_score ?? 0)} / ${Number(at.max_score ?? 0)}`
      } else state = 'awaiting'
    } else {
      state =
        now < new Date(a.opens_at) ? 'upcoming' : now >= new Date(a.closes_at) ? 'missed' : 'open'
    }
    return { a, state, score, at: at?.id as string | undefined }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{S.title}</h1>
        <p className="text-sm text-slate-600">
          {S.group}: <span className="badge">{group?.name ?? S.noGroup}</span>
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{S.sections.assessments}</h2>
        {cards.length === 0 ? (
          <p className="card text-sm text-slate-500">{S.noAssessments}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {cards.map(({ a, state, score, at }) => (
              <li key={a.id} className="card space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-xs text-slate-500">
                      {a.subjects?.name} · {a.duration_minutes} {t.attempt.minutes}
                    </p>
                  </div>
                  <span className="badge">{S.states[state]}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {S.opens}: {fmt(a.opens_at)} · {S.closes}: {fmt(a.closes_at)}
                </p>
                {score && at && (
                  <p className="text-sm font-medium">
                    {S.score}: {score} ·{' '}
                    <Link href={`/student/results/${at}`} className="text-brand-600 underline">
                      {t.results.view}
                    </Link>
                  </p>
                )}
                {(state === 'open' || state === 'in_progress') && (
                  <Link href={`/student/assessments/${a.id}`} className="btn-primary">
                    {state === 'open' ? S.open : S.continue}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card space-y-2">
          <h2 className="font-semibold">{S.sections.live}</h2>
          <p className="text-sm text-slate-500">{t.liveStudent.lead}</p>
          <CodeEntry compact />
        </section>
        {lessons.length > 0 && (
          <section className="card space-y-2 sm:col-span-2">
            <h2 className="font-semibold">{t.extras.summaryTitle}</h2>
            <ul className="space-y-1 text-sm">
              {lessons.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2">
                  <span>
                    {l.title} <span className="text-xs text-slate-500">{fmt(l.at)}</span>
                  </span>
                  <Link href={`/student/lessons/${l.id}`} className="text-brand-600 underline">
                    {t.extras.summaryOpen}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {myAttendance && (
          <section className="card space-y-1">
            <h2 className="font-semibold">{t.analytics.myAttendance}</h2>
            <p className="text-3xl font-bold tabular-nums">
              {myAttendance.pct ?? '—'}%{' '}
              <span className="text-sm font-normal text-slate-500">
                ({myAttendance.present} / {myAttendance.total})
              </span>
            </p>
            <p className="text-xs text-slate-500">{t.analytics.myAttendanceNote}</p>
          </section>
        )}
        <section className="card">
          <h2 className="font-semibold">{S.sections.results}</h2>
          <p className="mt-2 text-sm text-slate-500">{S.soon}</p>
        </section>
      </div>
    </div>
  )
}
