import { Download } from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'
import { Empty, Loading, PageHeader } from '@/components/Layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, NativeSelect } from '@/components/ui/input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { must, supabase } from '@/lib/supabase'
import { downloadCsv, fmtDate } from '@/lib/utils'

type Row = {
  id: number
  actor_email: string | null
  action: string
  table_name: string
  row_pk: string | null
  old_data: unknown
  new_data: unknown
  created_at: string
}

export function Audit() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [table, setTable] = useState('')
  const [actor, setActor] = useState('')
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    setRows(null)
    let q = supabase.from('ew_audit_log').select('*').order('created_at', { ascending: false }).limit(300)
    if (table) q = q.eq('table_name', table)
    if (actor) q = q.ilike('actor_email', `%${actor}%`)
    q.then((r) => setRows(must(r)))
  }, [table, actor])

  const tables = ['ew_lessons', 'ew_lesson_steps', 'ew_materials', 'ew_material_prices', 'ew_app_config', 'ew_legal_texts', 'ew_electricians', 'ew_reviews', 'ew_profiles', 'ew_admins', 'ew_reports', 'ew_work_checks']

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every admin change to content, config, users and moderation (latest 300)."
        actions={
          <Button variant="outline" onClick={() => rows && downloadCsv('elektruy-audit.csv', rows as unknown as Record<string, unknown>[])}>
            <Download /> CSV
          </Button>
        }
      />
      <div className="mb-3 flex max-w-xl gap-2">
        <NativeSelect value={table} onChange={(e) => setTable(e.target.value)}>
          <option value="">All tables</option>
          {tables.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </NativeSelect>
        <Input placeholder="Actor email" value={actor} onChange={(e) => setActor(e.target.value)} />
      </div>
      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>When</TH>
              <TH>Who</TH>
              <TH>Action</TH>
              <TH>Table</TH>
              <TH>Row</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <TR className="cursor-pointer" onClick={() => setOpen(open === r.id ? null : r.id)}>
                  <TD className="whitespace-nowrap">{fmtDate(r.created_at)}</TD>
                  <TD>{r.actor_email ?? 'system'}</TD>
                  <TD>
                    <Badge variant={r.action === 'DELETE' ? 'destructive' : r.action === 'INSERT' ? 'success' : 'default'}>{r.action}</Badge>
                  </TD>
                  <TD>{r.table_name}</TD>
                  <TD className="font-mono text-xs">{r.row_pk}</TD>
                </TR>
                {open === r.id && (
                  <TR>
                    <TD colSpan={5}>
                      <div className="grid gap-2 md:grid-cols-2">
                        <pre className="max-h-80 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(r.old_data, null, 2)}</pre>
                        <pre className="max-h-80 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(r.new_data, null, 2)}</pre>
                      </div>
                    </TD>
                  </TR>
                )}
              </Fragment>
            ))}
          </TBody>
        </Table>
      )}
    </>
  )
}
