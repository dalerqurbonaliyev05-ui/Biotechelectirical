import Link from 'next/link'
import { UserManager, type UserRow } from '@/components/user-manager'
import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'
import { createClient } from '@/lib/supabase/server'

const LIMIT = 300

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; q?: string }>
}) {
  const me = await requireRole('admin')
  const { group, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select('id, full_name, student_code, email, group_id, department_id, is_active')
    .eq('role', 'student')
    .order('student_code')
    .limit(LIMIT)
  if (group) query = query.eq('group_id', group)
  // PostgREST filtr sintaksisini buzadigan belgilar olib tashlanadi
  const term = (q ?? '').replace(/[,()%*\\]/g, ' ').trim()
  if (term) query = query.or(`full_name.ilike.%${term}%,student_code.ilike.%${term}%`)

  const [{ data: people }, { data: groups }] = await Promise.all([
    query,
    supabase.from('groups').select('id, name').order('name'),
  ])
  const rows: UserRow[] = (people ?? []).map((p) => ({
    ...(p as Omit<UserRow, 'assignments'>),
    assignments: [],
  }))
  const groupOpts = (groups ?? []).map((g) => ({ value: String(g.id), label: String(g.name) }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <form className="flex flex-1 flex-wrap items-end gap-2" method="get">
          <div className="min-w-40 flex-1">
            <select
              name="group"
              defaultValue={group ?? ''}
              className="input"
              aria-label={t.admin.users.group}
            >
              <option value="">{t.admin.users.filterAll}</option>
              {groupOpts.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-40 flex-1">
            <input
              name="q"
              defaultValue={q ?? ''}
              className="input"
              placeholder={t.admin.users.searchPlaceholder}
            />
          </div>
          <button className="btn-secondary">{t.app.search}</button>
        </form>
        <Link href="/admin/students/import" className="btn-secondary">
          {t.importStudents.title}
        </Link>
      </div>
      <UserManager
        role="student"
        rows={rows}
        groups={groupOpts}
        subjects={[]}
        departments={[]}
        selfId={me.id}
      />
      {rows.length >= LIMIT && <p className="text-xs text-slate-500">{t.admin.users.limitNote}</p>}
    </div>
  )
}
