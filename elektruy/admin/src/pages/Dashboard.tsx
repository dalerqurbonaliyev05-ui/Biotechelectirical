import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading, PageHeader } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/input'
import { must, supabase } from '@/lib/supabase'

type Stats = {
  users_total: number
  users_new: number
  projects_total: number
  projects_out_of_scope: number
  projects_per_day: { day: string; count: number }[]
  ai_calls_per_day: { day: string; estimate: number; check: number; failed: number }[]
  ai_calls_total: number
  work_checks: Record<string, number>
  work_checks_flagged: number
  top_lessons: { slug: string; started: number; completed: number }[]
  reports_open: number
  electricians_pending: number
  electricians_approved: number
}

function Stat({ label, value, to, hint }: { label: string; value: number | string; to?: string; hint?: string }) {
  const body = (
    <Card className="h-full transition-colors hover:border-primary/40">
      <CardContent className="pt-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-bold">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

function Bars({ data, series }: { data: Record<string, number | string>[]; series: { key: string; color: string; label: string }[] }) {
  const max = Math.max(1, ...data.map((d) => series.reduce((s, x) => s + Number(d[x.key] ?? 0), 0)))
  return (
    <div>
      <div className="flex h-40 items-end gap-[2px]">
        {data.map((d) => (
          <div key={String(d.day)} className="flex flex-1 flex-col-reverse" title={`${d.day}: ${series.map((s) => `${s.label} ${d[s.key]}`).join(', ')}`}>
            {series.map((s) => (
              <div key={s.key} style={{ height: `${(Number(d[s.key] ?? 0) / max) * 160}px`, background: s.color }} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{String(data[0]?.day ?? '')}</span>
        <span className="flex gap-3">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </span>
        <span>{String(data[data.length - 1]?.day ?? '')}</span>
      </div>
    </div>
  )
}

export function Dashboard() {
  const [days, setDays] = useState(30)
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStats(null)
    supabase
      .rpc('ew_admin_stats', { p_days: days })
      .then(
        (r) => {
          try {
            setStats(must(r) as Stats)
          } catch (e) {
            setError((e as Error).message)
          }
        },
        (e: Error) => setError(e.message),
      )
  }, [days])

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <NativeSelect value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-36">
            {[7, 30, 90, 365].map((d) => (
              <option key={d} value={d}>
                Last {d} days
              </option>
            ))}
          </NativeSelect>
        }
      />
      {error && <p className="text-destructive">{error}</p>}
      {!stats ? (
        <Loading />
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Users" value={stats.users_total} hint={`+${stats.users_new} in period`} to="/users" />
            <Stat label="Projects" value={stats.projects_total} hint={`${stats.projects_out_of_scope} sent to an electrician`} />
            <Stat label="AI calls" value={stats.ai_calls_total} hint="in period" to="/ai" />
            <Stat label="Flagged AI checks" value={stats.work_checks_flagged} hint="waiting for review" to="/ai" />
            <Stat label="Open reports" value={stats.reports_open} to="/reports" />
            <Stat label="Electricians pending" value={stats.electricians_pending} to="/electricians" />
            <Stat label="Electricians approved" value={stats.electricians_approved} to="/electricians" />
            <Stat
              label="Work checks"
              value={Object.values(stats.work_checks).reduce((a, b) => a + b, 0)}
              hint={Object.entries(stats.work_checks).map(([k, v]) => `${k} ${v}`).join(' · ') || 'none'}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Projects per day</CardTitle>
              </CardHeader>
              <CardContent>
                <Bars data={stats.projects_per_day} series={[{ key: 'count', color: '#1565c0', label: 'projects' }]} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>AI usage per day</CardTitle>
              </CardHeader>
              <CardContent>
                <Bars
                  data={stats.ai_calls_per_day}
                  series={[
                    { key: 'estimate', color: '#1565c0', label: 'estimate' },
                    { key: 'check', color: '#2e7d32', label: 'check' },
                    { key: 'failed', color: '#c62828', label: 'failed' },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Most started lessons</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {stats.top_lessons.length === 0 && <p className="text-sm text-muted-foreground">No lesson progress yet.</p>}
              {stats.top_lessons.map((l) => (
                <div key={l.slug} className="grid grid-cols-[12rem_1fr_6rem] items-center gap-3 text-sm">
                  <span className="truncate font-medium">{l.slug}</span>
                  <div className="h-2 rounded bg-muted">
                    <div className="h-2 rounded bg-success" style={{ width: `${(l.completed / Math.max(1, l.started)) * 100}%` }} />
                  </div>
                  <span className="text-right text-muted-foreground">
                    {l.completed}/{l.started}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
