import { findBackupTable } from '@/lib/backup-tables'
import { toCsv, type Cell } from '@/lib/csv'
import { ApiError, handle, limit, requireUser } from '@/lib/server/api'
import { fetchAll } from '@/lib/server/paginate'
import { createAdminClient } from '@/lib/supabase/admin'

/** Admin: bitta jadvalni CSV ga yuklab olish (zaxira). Faqat ruxsat etilgan jadvallar; maxfiy ustunlar tushirib qoldiriladi. */
export const GET = handle<{ table: string }>(async (_req, { params }) => {
  const { profile } = await requireUser(['admin'])
  limit(`backup:${profile.id}`, 30, 60_000)
  const def = findBackupTable((await params).table)
  if (!def) throw new ApiError(404, 'not_found')

  const admin = createAdminClient()
  const rows = await fetchAll<Record<string, unknown>>((from, to) => {
    let q = admin.from(def.table).select('*')
    for (const col of def.order) q = q.order(col)
    return q.range(from, to)
  })

  const omit = new Set(def.omit ?? [])
  const cols = rows.length ? Object.keys(rows[0] as object).filter((c) => !omit.has(c)) : []
  const cell = (v: unknown): Cell =>
    v !== null && typeof v === 'object' ? JSON.stringify(v) : (v as Cell)
  const csv = toCsv([cols, ...rows.map((r) => cols.map((c) => cell(r[c])))])
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${def.table}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
})
