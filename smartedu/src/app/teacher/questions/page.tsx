import Link from 'next/link'
import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'
import { listMySubjects } from '@/lib/server/teacher-data'
import { createClient } from '@/lib/supabase/server'
import { QuestionRowActions } from './row-actions'

const Q = t.questions
const LIMIT = 200

interface Row {
  id: string
  type: string
  body: { text?: string }
  topic: string | null
  difficulty: number | null
  book_ref: { slug: string; page?: number } | null
  subjects: { name: string } | null
}

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; type?: string; q?: string }>
}) {
  const me = await requireRole('teacher', 'admin')
  const sp = await searchParams
  const supabase = await createClient()
  const subjects = await listMySubjects(me)

  let query = supabase
    .from('questions')
    .select('id, type, body, topic, difficulty, book_ref, subjects(name)')
    .order('created_at', { ascending: false })
    .limit(LIMIT)
  if (sp.subject) query = query.eq('subject_id', sp.subject)
  if (sp.type) query = query.eq('type', sp.type)
  const term = (sp.q ?? '').replace(/[,()%*\\]/g, ' ').trim()
  if (term) query = query.or(`topic.ilike.%${term}%,body->>text.ilike.%${term}%`)
  const rows = ((await query).data ?? []) as unknown as Row[]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{Q.title}</h1>
        <div className="flex gap-2">
          <Link href="/teacher/questions/import" className="btn-secondary">
            {Q.import}
          </Link>
          <Link href="/teacher/questions/new" className="btn-primary">
            + {Q.new}
          </Link>
        </div>
      </div>

      <form method="get" className="grid gap-2 sm:grid-cols-4">
        <select
          name="subject"
          defaultValue={sp.subject ?? ''}
          className="input"
          aria-label={Q.filters.subject}
        >
          <option value="">
            {Q.filters.subject}: {Q.filters.all}
          </option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={sp.type ?? ''}
          className="input"
          aria-label={Q.filters.type}
        >
          <option value="">
            {Q.filters.type}: {Q.filters.all}
          </option>
          {Object.entries(Q.types).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          className="input"
          placeholder={Q.filters.search}
        />
        <button className="btn-secondary">{t.app.search}</button>
      </form>

      {rows.length === 0 ? (
        <p className="card text-slate-500">{Q.emptyBank}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{Q.fields.text}</th>
                <th>{Q.fields.type}</th>
                <th>{Q.fields.topic}</th>
                <th>{Q.fields.difficulty}</th>
                <th>{Q.book}</th>
                <th>{t.app.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="max-w-md">
                    <span className="line-clamp-2">{r.body.text}</span>
                    <span className="text-xs text-slate-400">{r.subjects?.name}</span>
                  </td>
                  <td>
                    <span className="badge">{Q.types[r.type]}</span>
                  </td>
                  <td>{r.topic ?? '—'}</td>
                  <td>{r.difficulty ?? '—'}</td>
                  <td className="text-xs">
                    {r.book_ref
                      ? `${r.book_ref.slug}${r.book_ref.page ? `, ${r.book_ref.page}-${Q.pageShort}` : ''}`
                      : '—'}
                  </td>
                  <td>
                    <QuestionRowActions id={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length >= LIMIT && <p className="text-xs text-slate-500">{t.admin.users.limitNote}</p>}
    </div>
  )
}
