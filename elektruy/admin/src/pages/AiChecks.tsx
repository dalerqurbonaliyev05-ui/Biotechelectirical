import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Empty, Loading, PageHeader } from '@/components/Layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, NativeSelect, Textarea } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { BUCKETS, must, supabase } from '@/lib/supabase'
import { downloadCsv, fmtDate } from '@/lib/utils'

type Issue = { title: string; detail: string; severity: string; lesson_slug: string; location_hint: string }
type Check = {
  id: string
  user_id: string
  project_id: string | null
  image_paths: string[]
  lang: string
  overall: string | null
  result: { summary?: string; image_quality?: string; issues?: Issue[]; positives?: string[]; call_electrician?: boolean }
  flagged_wrong: boolean
  user_feedback: string | null
  admin_status: 'none' | 'reviewed' | 'wrong' | 'confirmed'
  admin_note: string | null
  created_at: string
}
type Call = { id: number; user_id: string | null; fn: string; ok: boolean; duration_ms: number | null; input_tokens: number | null; output_tokens: number | null; error: string | null; created_at: string }

const OVERALL = { ok: 'success', warning: 'warning', critical: 'destructive', unclear: 'muted' } as const

export function AiChecks() {
  const [filter, setFilter] = useState<'flagged' | 'all' | 'critical'>('flagged')
  const [rows, setRows] = useState<Check[] | null>(null)
  const [calls, setCalls] = useState<Call[] | null>(null)
  const [open, setOpen] = useState<Check | null>(null)

  const load = () => {
    setRows(null)
    let q = supabase.from('ew_work_checks').select('*').order('created_at', { ascending: false }).limit(300)
    if (filter === 'flagged') q = q.eq('flagged_wrong', true)
    if (filter === 'critical') q = q.eq('overall', 'critical')
    q.then((r) => setRows(must(r)))
  }
  useEffect(load, [filter])
  useEffect(() => {
    supabase.from('ew_ai_calls').select('*').order('created_at', { ascending: false }).limit(500).then((r) => setCalls(must(r)))
  }, [])

  return (
    <>
      <PageHeader title="AI checks" description="Results of “Check my work” and every Claude call made by the Edge Functions. AI results are advisory, never an inspection." />
      <Tabs defaultValue="checks">
        <TabsList>
          <TabsTrigger value="checks">Work checks</TabsTrigger>
          <TabsTrigger value="calls">AI calls log</TabsTrigger>
        </TabsList>
        <TabsContent value="checks">
          <div className="mb-3 flex gap-2">
            <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="w-56">
              <option value="flagged">Flagged as wrong by users</option>
              <option value="critical">Critical results</option>
              <option value="all">All</option>
            </NativeSelect>
            <Button variant="outline" onClick={() => rows && downloadCsv('elektruy-work-checks.csv', rows.map((r) => ({ ...r, summary: r.result.summary, issues: r.result.issues?.length ?? 0 })))}>
              <Download /> CSV
            </Button>
          </div>
          {!rows ? (
            <Loading />
          ) : rows.length === 0 ? (
            <Empty />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Result</TH>
                  <TH>Summary</TH>
                  <TH>Photos</TH>
                  <TH>User flag</TH>
                  <TH>Admin</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id} className="cursor-pointer" onClick={() => setOpen(r)}>
                    <TD className="whitespace-nowrap">{fmtDate(r.created_at)}</TD>
                    <TD>
                      <Badge variant={OVERALL[(r.overall ?? 'unclear') as keyof typeof OVERALL]}>{r.overall ?? '—'}</Badge>
                      {r.result.call_electrician && <div className="text-xs text-destructive">call electrician</div>}
                    </TD>
                    <TD className="max-w-md">
                      <div className="line-clamp-2">{r.result.summary}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.result.issues?.length ?? 0} issues · {r.lang}
                      </div>
                    </TD>
                    <TD>{r.image_paths.length}</TD>
                    <TD>{r.flagged_wrong ? <Badge variant="destructive">wrong?</Badge> : '—'}</TD>
                    <TD>
                      <Badge variant="muted">{r.admin_status}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </TabsContent>
        <TabsContent value="calls">
          <div className="mb-3">
            <Button variant="outline" onClick={() => calls && downloadCsv('elektruy-ai-calls.csv', calls)}>
              <Download /> CSV
            </Button>
          </div>
          {!calls ? (
            <Loading />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Function</TH>
                  <TH>OK</TH>
                  <TH>Duration</TH>
                  <TH>Tokens in / out</TH>
                  <TH>Error</TH>
                </TR>
              </THead>
              <TBody>
                {calls.map((c) => (
                  <TR key={c.id}>
                    <TD className="whitespace-nowrap">{fmtDate(c.created_at)}</TD>
                    <TD>{c.fn}</TD>
                    <TD>{c.ok ? <Badge variant="success">ok</Badge> : <Badge variant="destructive">fail</Badge>}</TD>
                    <TD>{c.duration_ms ? `${(c.duration_ms / 1000).toFixed(1)} s` : '—'}</TD>
                    <TD className="tabular-nums">
                      {c.input_tokens ?? '—'} / {c.output_tokens ?? '—'}
                    </TD>
                    <TD className="max-w-sm truncate text-xs text-destructive" title={c.error ?? ''}>
                      {c.error}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
      {open && <CheckDialog check={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load() }} />}
    </>
  )
}

function CheckDialog({ check, onClose, onSaved }: { check: Check; onClose: () => void; onSaved: () => void }) {
  const [urls, setUrls] = useState<string[]>([])
  const [status, setStatus] = useState(check.admin_status)
  const [note, setNote] = useState(check.admin_note ?? '')

  useEffect(() => {
    // Storage RLS lets admins read the photos only of results a user flagged.
    if (!check.flagged_wrong) return
    supabase.storage
      .from(BUCKETS.workChecks)
      .createSignedUrls(check.image_paths, 600)
      .then(({ data }) => setUrls((data ?? []).map((d) => d.signedUrl).filter((u): u is string => !!u)))
  }, [check])

  async function save() {
    const { error } = await supabase.from('ew_work_checks').update({ admin_status: status, admin_note: note.trim() || null }).eq('id', check.id)
    if (error) return toast.error(error.message)
    toast.success('Saved')
    onSaved()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Work check · {fmtDate(check.created_at)} · <Badge variant={OVERALL[(check.overall ?? 'unclear') as keyof typeof OVERALL]}>{check.overall}</Badge>
          </DialogTitle>
        </DialogHeader>
        {check.flagged_wrong ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {urls.map((u) => (
              <a key={u} href={u} target="_blank" rel="noreferrer">
                <img src={u} alt="" className="aspect-square w-full rounded object-cover" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Photos are private: they are visible to admins only after the user flags the result.</p>
        )}
        {check.user_feedback && (
          <p className="rounded bg-muted p-2 text-sm">
            <b>User:</b> {check.user_feedback}
          </p>
        )}
        <div className="grid gap-2 text-sm">
          <p>{check.result.summary}</p>
          <p className="text-xs text-muted-foreground">Image quality: {check.result.image_quality}</p>
          {check.result.issues?.map((i, k) => (
            <div key={k} className="rounded border border-border p-2">
              <Badge variant={i.severity === 'critical' ? 'destructive' : i.severity === 'warning' ? 'warning' : 'muted'}>{i.severity}</Badge> <b>{i.title}</b>
              <div>{i.detail}</div>
              <div className="text-xs text-muted-foreground">
                {i.location_hint} · lesson: {i.lesson_slug}
              </div>
            </div>
          ))}
          {!!check.result.positives?.length && <p className="text-success">✓ {check.result.positives.join(' · ')}</p>}
        </div>
        <div className="grid gap-3 md:grid-cols-[200px_1fr]">
          <Field label="Admin verdict">
            <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as Check['admin_status'])}>
              <option value="none">not reviewed</option>
              <option value="reviewed">reviewed</option>
              <option value="confirmed">AI was right</option>
              <option value="wrong">AI was wrong</option>
            </NativeSelect>
          </Field>
          <Field label="Note">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
