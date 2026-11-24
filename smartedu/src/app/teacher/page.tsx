import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'
import { createClient } from '@/lib/supabase/server'

export default async function TeacherHome() {
  const me = await requireRole('teacher', 'admin')
  const supabase = await createClient()
  const { data } = await supabase
    .from('teacher_subjects')
    .select('subjects(name), groups(name)')
    .eq('teacher_id', me.id)
  const rows = (data ?? []) as unknown as {
    subjects: { name: string } | null
    groups: { name: string } | null
  }[]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.teacherHome.title}</h1>
      <section className="card">
        <h2 className="mb-2 font-semibold">{t.teacherHome.myAssignments}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">{t.teacherHome.noAssignments}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {rows.map((r, i) => (
              <li key={i}>
                {r.subjects?.name} — <span className="badge">{r.groups?.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
