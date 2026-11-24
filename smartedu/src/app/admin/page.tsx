import Link from 'next/link'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'

export default async function AdminHome() {
  const supabase = await createClient()
  const count = async (table: string, role?: string) => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true })
    if (role) q = q.eq('role', role)
    return (await q).count ?? 0
  }
  const [students, teachers, groups, subjects] = await Promise.all([
    count('profiles', 'student'),
    count('profiles', 'teacher'),
    count('groups'),
    count('subjects'),
  ])
  const cards = [
    { href: '/admin/students', label: t.nav.admin[7]?.label, n: students },
    { href: '/admin/teachers', label: t.nav.admin[6]?.label, n: teachers },
    { href: '/admin/groups', label: t.nav.admin[3]?.label, n: groups },
    { href: '/admin/subjects', label: t.nav.admin[4]?.label, n: subjects },
  ]
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.adminHome.title}</h1>
      <p className="text-slate-600">{t.adminHome.lead}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card hover:border-brand-500">
            <p className="text-3xl font-bold">{c.n}</p>
            <p className="text-sm text-slate-600">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
