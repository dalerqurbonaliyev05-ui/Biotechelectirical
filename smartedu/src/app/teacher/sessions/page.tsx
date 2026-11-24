import Link from 'next/link'
import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'
import { createClient } from '@/lib/supabase/server'

const L = t.live
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('uz-UZ', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Tashkent',
  })

interface Row {
  id: string
  code: string
  status: 'active' | 'ended'
  started_at: string
  ended_at: string | null
  lectures: { title: string } | null
  groups: { name: string } | null
}

export default async function SessionsPage() {
  await requireRole('teacher', 'admin')
  const { data } = await (
    await createClient()
  )
    .from('lecture_sessions')
    .select('id, code, status, started_at, ended_at, lectures(title), groups(name)')
    .order('started_at', { ascending: false })
    .limit(100)
  const rows = (data ?? []) as unknown as Row[]
  const active = rows.filter((r) => r.status === 'active')
  const past = rows.filter((r) => r.status === 'ended')

  const list = (items: Row[]) => (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((r) => (
        <li key={r.id} className="card space-y-2">
          <p className="font-semibold">{r.lectures?.title}</p>
          <p className="text-xs text-slate-500">
            {fmt(r.started_at)} · {r.groups?.name ?? L.startAnyGroup}
          </p>
          {r.status === 'active' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge font-mono text-base">{r.code}</span>
              <Link href={`/teacher/sessions/${r.id}`} className="btn-primary">
                {L.control}
              </Link>
              <Link href={`/board/${r.id}`} target="_blank" className="btn-secondary">
                {L.openBoard}
              </Link>
            </div>
          ) : (
            <Link
              href={`/teacher/sessions/${r.id}`}
              className="text-sm text-brand-600 hover:underline"
            >
              {t.teacherResults.detail}
            </Link>
          )}
        </li>
      ))}
    </ul>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{L.sessionsTitle}</h1>
      {rows.length === 0 && <p className="card text-slate-500">{L.noSessions}</p>}
      {active.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{L.activeTitle}</h2>
          {list(active)}
        </section>
      )}
      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{L.pastTitle}</h2>
          {list(past)}
        </section>
      )}
    </div>
  )
}
