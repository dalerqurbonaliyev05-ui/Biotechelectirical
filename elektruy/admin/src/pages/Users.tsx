import { Ban, Download, Search, Trash2, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Empty, Loading, PageHeader } from '@/components/Layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { must, supabase } from '@/lib/supabase'
import { downloadCsv, fmtDate } from '@/lib/utils'

type UserRow = {
  id: string
  email: string
  display_name: string | null
  language: string
  region: string
  is_banned: boolean
  created_at: string
  last_sign_in_at: string | null
  projects: number
  work_checks: number
}

const PAGE = 50

export function Users() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<UserRow[] | null>(null)
  const [deleting, setDeleting] = useState<UserRow | null>(null)
  const [confirm, setConfirm] = useState('')

  const load = useCallback(async () => {
    setRows(null)
    try {
      setRows(must(await supabase.rpc('ew_admin_list_users', { p_search: search || null, p_limit: PAGE, p_offset: page * PAGE })) as UserRow[])
    } catch (e) {
      toast.error((e as Error).message)
      setRows([])
    }
  }, [search, page])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  async function setBanned(u: UserRow, banned: boolean) {
    const { error } = await supabase.from('ew_profiles').update({ is_banned: banned }).eq('id', u.id)
    if (error) return toast.error(error.message)
    toast.success(banned ? 'User banned' : 'Ban lifted')
    load()
  }

  async function deleteData() {
    if (!deleting) return
    const { error } = await supabase.functions.invoke('delete-account', { body: { confirm: 'DELETE', user_id: deleting.id } })
    if (error) return toast.error(error.message)
    toast.success(`All ElektrUy data of ${deleting.email} was deleted`)
    setDeleting(null)
    setConfirm('')
    load()
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="ElektrUy profiles. Banned users keep read access to lessons but cannot write data or use AI."
        actions={
          <Button variant="outline" onClick={() => rows && downloadCsv('elektruy-users.csv', rows)}>
            <Download /> CSV
          </Button>
        }
      />
      <div className="relative mb-3 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search email or name" value={search} onChange={(e) => { setPage(0); setSearch(e.target.value) }} />
      </div>
      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty text="No users found." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Email</TH>
              <TH>Name</TH>
              <TH>Lang / region</TH>
              <TH>Projects</TH>
              <TH>AI checks</TH>
              <TH>Joined</TH>
              <TH>Last sign-in</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {rows.map((u) => (
              <TR key={u.id}>
                <TD className="font-medium">
                  {u.email} {u.is_banned && <Badge variant="destructive">banned</Badge>}
                </TD>
                <TD>{u.display_name ?? '—'}</TD>
                <TD>
                  {u.language} · {u.region}
                </TD>
                <TD>{u.projects}</TD>
                <TD>{u.work_checks}</TD>
                <TD>{fmtDate(u.created_at)}</TD>
                <TD>{fmtDate(u.last_sign_in_at)}</TD>
                <TD className="text-right whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => setBanned(u, !u.is_banned)}>
                    {u.is_banned ? <><Undo2 /> Unban</> : <><Ban /> Ban</>}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleting(u)}>
                    <Trash2 /> Delete data
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={(rows?.length ?? 0) < PAGE} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete all ElektrUy data?</DialogTitle>
            <DialogDescription>
              Removes projects, photos, progress, reviews, AI checks and reports of {deleting?.email}. The login account is shared with other apps and is kept.
              Type DELETE to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={confirm !== 'DELETE'} onClick={deleteData}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
