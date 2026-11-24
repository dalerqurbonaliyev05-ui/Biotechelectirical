import Link from 'next/link'
import { canSeeScore, type ShowScorePolicy } from '@/lib/assessment/policy'
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
    return { a, state, score }
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
            {cards.map(({ a, state, score }) => (
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
                {score && (
                  <p className="text-sm font-medium">
                    {S.score}: {score}
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
        {[S.sections.live, S.sections.results].map((title) => (
          <section key={title} className="card">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-slate-500">{S.soon}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
