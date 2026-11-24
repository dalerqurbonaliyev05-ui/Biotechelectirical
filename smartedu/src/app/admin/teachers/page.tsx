import { UserManager, type UserRow } from '@/components/user-manager'
import { requireRole } from '@/lib/server/session'
import { createClient } from '@/lib/supabase/server'

export default async function TeachersPage() {
  const me = await requireRole('admin')
  const supabase = await createClient()
  const [
    { data: people },
    { data: assigns },
    { data: groups },
    { data: subjects },
    { data: deps },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, student_code, email, group_id, department_id, is_active')
      .eq('role', 'teacher')
      .order('full_name'),
    supabase.from('teacher_subjects').select('teacher_id, subject_id, group_id'),
    supabase.from('groups').select('id, name').order('name'),
    supabase.from('subjects').select('id, name').order('name'),
    supabase.from('departments').select('id, name').order('name'),
  ])
  const rows: UserRow[] = (people ?? []).map((p) => ({
    ...(p as Omit<UserRow, 'assignments'>),
    assignments: (assigns ?? [])
      .filter((a) => a.teacher_id === p.id)
      .map((a) => ({ subject_id: String(a.subject_id), group_id: String(a.group_id) })),
  }))
  const opt = (list: { id: unknown; name: unknown }[] | null) =>
    (list ?? []).map((x) => ({ value: String(x.id), label: String(x.name) }))
  return (
    <UserManager
      role="teacher"
      rows={rows}
      groups={opt(groups)}
      subjects={opt(subjects)}
      departments={opt(deps)}
      selfId={me.id}
    />
  )
}
