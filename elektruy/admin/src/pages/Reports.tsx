import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Empty, Loading, PageHeader } from '@/components/Layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, NativeSelect } from '@/components/ui/input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { must, supabase } from '@/lib/supabase'
import { downloadCsv, fmtDate } from '@/lib/utils'

type Status = 'open' | 'in_review' | 'resolved' | 'rejected'
type Report = { id: string; type: string; target: string | null; text: string; status: Status; admin_note: string | null; created_at: string; resolved_at: string | null; user_id: string }

const STATUSES: Status[] = ['open', 'in_review', 'resolved', 'rejected']
const VARIANT = { open: 'warning', in_review: 'default', resolved: 'success', rejected: 'muted' } as const

export function Reports() {
  const [rows, setRows] = useState<Report[] | null>(null)
  const [status, setStatus] = useState<Status | 'active' | 'all'>('active')
  const [type, setType] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = () => {
    let q = supabase.from('ew_reports').select('*').order('created_at', { ascending: false }).limit(500)
    if (status === 'active') q = q.in('status', ['open', 'in_review'])
    else if (status !== 'all') q = q.eq('status', status)
    if (type) q = q.eq('type', type)
    q.then((r) => setRows(must(r)))
  }
  useEffect(load, [status, type])

  async function update(r: Report, next: Status) {
    const { error } = await supabase
      .from('ew_reports')
      .update({ status: next, admin_note: notes[r.id] ?? r.admin_note, resolved_at: next === 'resolved' || next === 'rejected' ? new Date().toISOString() : null })
      .eq('id', r.id)
    if (error) return toast.error(error.message)
    toast.success('Report updated')
    load()
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Mistakes in lessons, wrong AI results, problems with electricians or reviews, and general feedback from users."
        actions={
          <Button variant="outline" onClick={() => rows && downloadCsv('elektruy-reports.csv', rows)}>
            <Download /> CSV
          </Button>
        }
      />
      <div className="mb-3 flex max-w-md gap-2">
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="active">Open + in review</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
          <option value="all">All</option>
        </NativeSelect>
        <NativeSelect value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {['lesson', 'content', 'electrician', 'review', 'ai_check', 'other'].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </NativeSelect>
      </div>
      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty text="No reports." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Type / target</TH>
              <TH>Text</TH>
              <TH>Admin note</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="whitespace-nowrap">{fmtDate(r.created_at)}</TD>
                <TD>
                  <Badge variant="muted">{r.type}</Badge>
                  <div className="font-mono text-xs break-all">{r.target}</div>
                </TD>
                <TD className="max-w-md whitespace-pre-wrap">{r.text}</TD>
                <TD className="min-w-48">
                  <Input defaultValue={r.admin_note ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} placeholder="note" />
                </TD>
                <TD>
                  <Badge variant={VARIANT[r.status]}>{r.status}</Badge>
                  <NativeSelect className="mt-1 h-8 w-32" value="" onChange={(e) => e.target.value && update(r, e.target.value as Status)}>
                    <option value="">Set…</option>
                    {STATUSES.filter((s) => s !== r.status).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </NativeSelect>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  )
}
