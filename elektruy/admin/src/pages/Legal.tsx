import { CheckCircle2, CopyPlus, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loading, PageHeader } from '@/components/Layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Textarea } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { must, supabase } from '@/lib/supabase'
import { fmtDate, LANGS, type Lang } from '@/lib/utils'

type Kind = 'disclaimer' | 'disclaimer_short' | 'privacy'
type Text = { id: number; kind: Kind; version: number; lang: Lang; body: string; published: boolean; created_at: string }

const KINDS: { kind: Kind; label: string; reconsent: boolean }[] = [
  { kind: 'disclaimer', label: 'Safety disclaimer', reconsent: true },
  { kind: 'privacy', label: 'Privacy policy', reconsent: true },
  { kind: 'disclaimer_short', label: 'Short banner', reconsent: false },
]

export function Legal() {
  const [kind, setKind] = useState<Kind>('disclaimer')
  const [rows, setRows] = useState<Text[] | null>(null)
  const [version, setVersion] = useState<number | null>(null)
  const [edits, setEdits] = useState<Partial<Record<Lang, string>>>({})

  const load = () =>
    supabase
      .from('ew_legal_texts')
      .select('*')
      .eq('kind', kind)
      .order('version', { ascending: false })
      .then((r) => {
        const data = must(r) as Text[]
        setRows(data)
        setVersion((v) => (v && data.some((t) => t.version === v) ? v : data[0]?.version ?? null))
        setEdits({})
      })
  useEffect(() => {
    setVersion(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  const versions = useMemo(() => [...new Set((rows ?? []).map((r) => r.version))], [rows])
  const current = (rows ?? []).filter((r) => r.version === version)
  const published = current.length > 0 && current.every((r) => r.published)
  const latestPublished = Math.max(0, ...(rows ?? []).filter((r) => r.published).map((r) => r.version))
  const meta = KINDS.find((k) => k.kind === kind)!

  async function newVersion() {
    const base = Math.max(0, ...versions)
    const from = (rows ?? []).filter((r) => r.version === base)
    const next = base + 1
    const { error } = await supabase
      .from('ew_legal_texts')
      .insert(LANGS.map((lang) => ({ kind, version: next, lang, body: from.find((r) => r.lang === lang)?.body ?? '', published: false })))
    if (error) return toast.error(error.message)
    toast.success(`Draft v${next} created`)
    setVersion(next)
    load()
  }

  async function saveDraft() {
    for (const [lang, body] of Object.entries(edits)) {
      const row = current.find((r) => r.lang === lang)
      if (!row) continue
      const { error } = await supabase.from('ew_legal_texts').update({ body }).eq('id', row.id)
      if (error) return toast.error(error.message)
    }
    toast.success('Draft saved')
    load()
  }

  async function publish() {
    if (Object.keys(edits).length) return toast.error('Save the draft first')
    if (current.length < 3 || current.some((r) => !r.body.trim())) return toast.error('All three languages need a text')
    const msg = meta.reconsent
      ? `Publish v${version}? Every user will have to read and accept it again the next time they open the app.`
      : `Publish v${version}?`
    if (!confirm(msg)) return
    const { error } = await supabase.from('ew_legal_texts').update({ published: true }).eq('kind', kind).eq('version', version!)
    if (error) return toast.error(error.message)
    toast.success(`v${version} published`)
    load()
  }

  return (
    <>
      <PageHeader title="Legal texts" description="Versioned texts in three languages. Publishing a new disclaimer or privacy version makes every user re-accept it." />
      <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)} className="mb-4">
        <TabsList>
          {KINDS.map((k) => (
            <TabsTrigger key={k.kind} value={k.kind}>
              {k.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {!rows ? (
        <Loading />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
          <div className="flex flex-col gap-1">
            {versions.map((v) => {
              const pub = rows.filter((r) => r.version === v).every((r) => r.published)
              return (
                <button
                  key={v}
                  onClick={() => {
                    setVersion(v)
                    setEdits({})
                  }}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${version === v ? 'bg-primary/10 font-semibold text-primary' : ''}`}
                >
                  v{v}
                  {pub ? <Badge variant={v === latestPublished ? 'success' : 'muted'}>{v === latestPublished ? 'live' : 'old'}</Badge> : <Badge variant="warning">draft</Badge>}
                </button>
              )
            })}
            <Button variant="outline" size="sm" className="mt-2" onClick={newVersion}>
              <CopyPlus /> New version
            </Button>
          </div>
          {version != null && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>
                  {meta.label} v{version} {published ? <Badge variant="success">published</Badge> : <Badge variant="warning">draft</Badge>}
                </CardTitle>
                {!published && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={saveDraft} disabled={!Object.keys(edits).length}>
                      <Save /> Save draft
                    </Button>
                    <Button onClick={publish}>
                      <CheckCircle2 /> Publish
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="grid gap-4">
                {published && <p className="text-xs text-muted-foreground">Published versions are read-only. Create a new version to change the text.</p>}
                {LANGS.map((lang) => {
                  const row = current.find((r) => r.lang === lang)
                  return (
                    <Field key={lang} label={`${lang.toUpperCase()} · ${row ? fmtDate(row.created_at) : 'missing'}`}>
                      <Textarea
                        rows={kind === 'disclaimer_short' ? 3 : 12}
                        readOnly={published}
                        value={edits[lang] ?? row?.body ?? ''}
                        onChange={(e) => setEdits({ ...edits, [lang]: e.target.value })}
                      />
                    </Field>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
