import Link from 'next/link'
import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'
import { createClient } from '@/lib/supabase/server'
import { DeleteLecture } from './delete-lecture'

const L = t.lectures

export default async function LecturesPage() {
  await requireRole('teacher', 'admin')
  const { data } = await (
    await createClient()
  )
    .from('lectures')
    .select('id, title, page_count, created_at, subjects(name)')
    .order('created_at', { ascending: false })
    .limit(200)
  const rows = (data ?? []) as unknown as {
    id: string
    title: string
    page_count: number
    created_at: string
    subjects: { name: string } | null
  }[]
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{L.title}</h1>
        <Link href="/teacher/lectures/new" className="btn-primary">
          + {L.new}
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="card text-slate-500">{L.empty}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <li key={r.id} className="card flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/teacher/lectures/${r.id}`}
                  className="font-semibold text-brand-700 hover:underline"
                >
                  {r.title}
                </Link>
                <p className="text-xs text-slate-500">
                  {r.subjects?.name} · {r.page_count} {L.pages}
                </p>
              </div>
              <DeleteLecture id={r.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
