import { Check, Download, Lock, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Empty, Loading, PageHeader } from '@/components/Layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, Textarea } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { must, supabase } from '@/lib/supabase'
import { downloadCsv, fmtDate } from '@/lib/utils'

type Status = 'pending' | 'approved' | 'rejected' | 'blocked'
type Electrician = {
  id: string
  name: string
  phone: string
  telegram: string | null
  city: string
  district: string | null
  experience_years: number
  price_from: number | null
  price_to: number | null
  bio: string | null
  services: string[]
  status: Status
  rating_avg: number
  rating_count: number
  admin_note: string | null
  created_at: string
  updated_at: string
}

const VARIANT = { pending: 'warning', approved: 'success', rejected: 'destructive', blocked: 'destructive' } as const

export function Electricians() {
  const [status, setStatus] = useState<Status | 'all'>('pending')
  const [rows, setRows] = useState<Electrician[] | null>(null)
  const [action, setAction] = useState<{ e: Electrician; to: Status } | null>(null)
  const [note, setNote] = useState('')

  const load = () => {
    setRows(null)
    let q = supabase.from('ew_electricians').select('*').order('updated_at', { ascending: false })
    if (status !== 'all') q = q.eq('status', status)
    q.then((r) => setRows(must(r)))
  }
  useEffect(load, [status])

  async function apply() {
    if (!action) return
    const { error } = await supabase
      .from('ew_electricians')
      .update({ status: action.to, admin_note: note.trim() || null })
      .eq('id', action.e.id)
    if (error) return toast.error(error.message)
    toast.success(`${action.e.name}: ${action.to}`)
    setAction(null)
    setNote('')
    load()
  }

  return (
    <>
      <PageHeader
        title="Electricians"
        description="Applications from the app. Only approved profiles are visible to users; any edit by the electrician sends the profile back to pending."
        actions={
          <Button variant="outline" onClick={() => rows && downloadCsv('elektruy-electricians.csv', rows)}>
            <Download /> CSV
          </Button>
        }
      />
      <Tabs value={status} onValueChange={(v) => setStatus(v as Status | 'all')} className="mb-3">
        <TabsList>
          {(['pending', 'approved', 'rejected', 'blocked', 'all'] as const).map((s) => (
            <TabsTrigger key={s} value={s}>
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Contact</TH>
              <TH>Area</TH>
              <TH>Experience / price</TH>
              <TH>Rating</TH>
              <TH>Status</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {rows.map((e) => (
              <TR key={e.id}>
                <TD className="max-w-xs">
                  <div className="font-medium">{e.name}</div>
                  <div className="line-clamp-2 text-xs text-muted-foreground">{e.bio}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {e.services.map((s) => (
                      <Badge key={s} variant="muted">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </TD>
                <TD className="whitespace-nowrap">
                  {e.phone}
                  {e.telegram && <div className="text-xs">@{e.telegram.replace('@', '')}</div>}
                </TD>
                <TD>
                  {e.city}
                  {e.district && <div className="text-xs text-muted-foreground">{e.district}</div>}
                </TD>
                <TD className="whitespace-nowrap">
                  {e.experience_years} y
                  <div className="text-xs text-muted-foreground">
                    {e.price_from ?? '…'}–{e.price_to ?? '…'} UZS
                  </div>
                </TD>
                <TD>
                  {Number(e.rating_avg).toFixed(1)} ★ ({e.rating_count})
                </TD>
                <TD>
                  <Badge variant={VARIANT[e.status]}>{e.status}</Badge>
                  <div className="text-xs text-muted-foreground">{fmtDate(e.updated_at)}</div>
                  {e.admin_note && <div className="text-xs italic">{e.admin_note}</div>}
                </TD>
                <TD className="text-right whitespace-nowrap">
                  {e.status !== 'approved' && (
                    <Button size="sm" variant="ghost" className="text-success" onClick={() => setAction({ e, to: 'approved' })}>
                      <Check /> Approve
                    </Button>
                  )}
                  {e.status === 'pending' && (
                    <Button size="sm" variant="ghost" onClick={() => setAction({ e, to: 'rejected' })}>
                      <X /> Reject
                    </Button>
                  )}
                  {e.status !== 'blocked' && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setAction({ e, to: 'blocked' })}>
                      <Lock /> Block
                    </Button>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <Dialog open={!!action} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action?.to} — {action?.e.name}
            </DialogTitle>
          </DialogHeader>
          <Field label="Note (shown in the audit log; optional)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button variant={action?.to === 'approved' ? 'default' : 'destructive'} onClick={apply}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
