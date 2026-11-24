import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'
import { createClient } from '@/lib/supabase/server'

export default async function StudentHome() {
  const me = await requireRole('student')
  const supabase = await createClient()
  const { data: group } = me.group_id
    ? await supabase.from('groups').select('name').eq('id', me.group_id).maybeSingle()
    : { data: null }
  const S = t.studentHome

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{S.title}</h1>
        <p className="text-sm text-slate-600">
          {S.group}: <span className="badge">{group?.name ?? S.noGroup}</span>
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Object.values(S.sections).map((title) => (
          <section key={title} className="card">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-slate-500">{S.soon}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
