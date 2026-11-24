import { t } from '@/lib/i18n'
import { loadGroupSemester } from '@/lib/server/analytics'
import { requireRole } from '@/lib/server/session'
import { listMyPairs } from '@/lib/server/teacher-data'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const S = t.semester

export default async function TeacherRatingPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>
}) {
  const me = await requireRole('teacher', 'admin')
  const supabase = await createClient()
  // RLS/biriktirish: o'qituvchi faqat o'z guruhlari; admin — hammasi
  const pairs = await listMyPairs(me)
  const { data: allGroups } = await supabase.from('groups').select('id, name').order('name')
  const groups = (allGroups ?? [])
    .filter((g) => !pairs || pairs.some((p) => p.group_id === g.id))
    .map((g) => ({ id: String(g.id), name: String(g.name) }))
  if (groups.length === 0) return <p className="card text-slate-500">{S.noGroup}</p>

  const { group } = await searchParams
  const current = groups.find((g) => g.id === group) ?? groups[0]!
  const rows = await loadGroupSemester(createAdminClient(), current.id)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{S.title}</h1>
      <p className="text-sm text-slate-600">{S.formula}</p>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <div className="min-w-48">
          <label className="label" htmlFor="group">
            {S.group}
          </label>
          <select id="group" name="group" defaultValue={current.id} className="input">
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-secondary">{t.app.search}</button>
        <a className="btn-secondary" href={`/api/rating/export?group=${current.id}`} download>
          {S.export}
        </a>
      </form>

      {rows.length === 0 ? (
        <p className="card text-slate-500">{t.app.empty}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{S.rank}</th>
                <th>{t.importStudents.columns.code}</th>
                <th>{t.attendance.student}</th>
                <th>{S.live}</th>
                <th>{S.assessments}</th>
                <th>{S.total}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.studentId}>
                  <td className="font-semibold">{r.rank}</td>
                  <td className="font-mono text-xs">{r.code}</td>
                  <td>{r.name}</td>
                  <td>
                    {r.totals.live}{' '}
                    <span className="text-xs text-slate-400">
                      ({r.totals.sessions} {S.sessionsCount})
                    </span>
                  </td>
                  <td>
                    {r.totals.assessments}{' '}
                    <span className="text-xs text-slate-400">
                      ({r.totals.attempts} {S.attemptsCount})
                    </span>
                  </td>
                  <td className="font-bold">{r.totals.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
