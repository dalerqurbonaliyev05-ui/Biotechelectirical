import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loading, PageHeader } from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { useAuth } from '@/lib/auth'
import { must, supabase } from '@/lib/supabase'
import { fmtDate } from '@/lib/utils'

type Admin = { email: string; user_id: string | null; note: string | null; created_at: string }

export function Admins() {
  const { session } = useAuth()
  const [rows, setRows] = useState<Admin[] | null>(null)
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')

  const load = () => supabase.from('ew_admins').select('*').order('created_at').then((r) => setRows(must(r)))
  useEffect(() => {
    load()
  }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('ew_admins').insert({ email: email.trim().toLowerCase(), note: note.trim() || null })
    if (error) return toast.error(error.message)
    setEmail('')
    setNote('')
    load()
  }

  async function remove(a: Admin) {
    if (a.email === session?.user.email?.toLowerCase()) return toast.error('You cannot remove yourself.')
    if (!confirm(`Remove admin ${a.email}?`)) return
    const { error } = await supabase.from('ew_admins').delete().eq('email', a.email)
    if (error) return toast.error(error.message)
    load()
  }

  return (
    <>
      <PageHeader title="Admins" description="Accounts with a verified email listed here can open this panel and edit content." />
      <form onSubmit={add} className="mb-4 flex max-w-2xl flex-wrap gap-2">
        <Input type="email" required placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
        <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="flex-1" />
        <Button type="submit">
          <Plus /> Add
        </Button>
      </form>
      {!rows ? (
        <Loading />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Email</TH>
              <TH>Linked user</TH>
              <TH>Note</TH>
              <TH>Added</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {rows.map((a) => (
              <TR key={a.email}>
                <TD className="font-medium">{a.email}</TD>
                <TD className="font-mono text-xs">{a.user_id ?? '—'}</TD>
                <TD>{a.note ?? ''}</TD>
                <TD>{fmtDate(a.created_at)}</TD>
                <TD className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => remove(a)} aria-label="Remove">
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
