import { Eye, EyeOff, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Empty, Loading, PageHeader } from '@/components/Layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { must, supabase } from '@/lib/supabase'
import { fmtDate } from '@/lib/utils'

type Review = {
  id: string
  rating: number
  text: string | null
  hidden: boolean
  created_at: string
  user_id: string
  ew_electricians: { name: string } | null
}

export function Reviews() {
  const [rows, setRows] = useState<Review[] | null>(null)
  const [show, setShow] = useState<'all' | 'hidden' | 'low'>('all')

  const load = () => {
    let q = supabase.from('ew_reviews').select('id, rating, text, hidden, created_at, user_id, ew_electricians(name)').order('created_at', { ascending: false }).limit(300)
    if (show === 'hidden') q = q.eq('hidden', true)
    if (show === 'low') q = q.lte('rating', 2)
    q.then((r) => setRows(must(r) as unknown as Review[]))
  }
  useEffect(load, [show])

  async function setHidden(r: Review, hidden: boolean) {
    const { error } = await supabase.from('ew_reviews').update({ hidden }).eq('id', r.id)
    if (error) return toast.error(error.message)
    load()
  }

  async function remove(r: Review) {
    if (!confirm('Delete this review permanently? The rating is recalculated.')) return
    const { error } = await supabase.from('ew_reviews').delete().eq('id', r.id)
    if (error) return toast.error(error.message)
    load()
  }

  return (
    <>
      <PageHeader title="Reviews" description="Hidden reviews are not shown in the app and do not count in the rating." />
      <NativeSelect value={show} onChange={(e) => setShow(e.target.value as typeof show)} className="mb-3 w-48">
        <option value="all">All reviews</option>
        <option value="low">Rating ≤ 2</option>
        <option value="hidden">Hidden</option>
      </NativeSelect>
      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Electrician</TH>
              <TH>Rating</TH>
              <TH>Text</TH>
              <TH>Date</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id} className={r.hidden ? 'opacity-50' : ''}>
                <TD className="font-medium">{r.ew_electricians?.name ?? '—'}</TD>
                <TD className="whitespace-nowrap text-amber-500">{'★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)}</TD>
                <TD className="max-w-md">
                  {r.text ?? <span className="text-muted-foreground">—</span>} {r.hidden && <Badge variant="muted">hidden</Badge>}
                  <div className="font-mono text-[10px] text-muted-foreground">id {r.id}</div>
                </TD>
                <TD className="whitespace-nowrap">{fmtDate(r.created_at)}</TD>
                <TD className="text-right whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => setHidden(r, !r.hidden)}>
                    {r.hidden ? <><Eye /> Show</> : <><EyeOff /> Hide</>}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r)} aria-label="Delete">
                    <Trash2 />
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  )
}
