import { Download, Plus, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loading, PageHeader } from '@/components/Layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, Input, NativeSelect } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { must, supabase } from '@/lib/supabase'
import { downloadCsv, LANGS, type Lang } from '@/lib/utils'

type Material = {
  id: string
  key: string
  category: string
  unit: 'm' | 'pcs' | 'kg'
  default_price: number
  currency: string
  sort_order: number
  active: boolean
  names: Record<Lang, string>
}
type Region = { code: string; name_en: string; name_uz: string }

const CATEGORIES = ['cable', 'device', 'box', 'conduit', 'fastener', 'connector', 'protection', 'lighting', 'consumable', 'tool', 'safety', 'other']

export function Materials() {
  const [items, setItems] = useState<Material[] | null>(null)
  const [regions, setRegions] = useState<Region[]>([])
  const [region, setRegion] = useState('tashkent_city')
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Material | null>(null)
  const [filter, setFilter] = useState('')

  async function load() {
    const rows = must(
      await supabase.from('ew_materials').select('*, ew_material_translations(lang, name)').order('sort_order'),
    ) as unknown as (Omit<Material, 'names'> & { ew_material_translations: { lang: Lang; name: string }[] })[]
    setItems(
      rows.map(({ ew_material_translations: tr, ...m }) => ({
        ...m,
        names: { uz: '', ru: '', en: '', ...Object.fromEntries(tr.map((t) => [t.lang, t.name])) },
      })),
    )
  }

  useEffect(() => {
    load().catch((e: Error) => toast.error(e.message))
    supabase.from('ew_regions').select('code, name_en, name_uz').order('sort_order').then((r) => setRegions(must(r)))
  }, [])

  useEffect(() => {
    supabase
      .from('ew_material_prices')
      .select('material_id, price')
      .eq('region', region)
      .then((r) => {
        setPrices(Object.fromEntries(must(r).map((p) => [p.material_id, String(p.price)])))
        setDirty(new Set())
      })
  }, [region])

  const shown = useMemo(
    () => (items ?? []).filter((m) => !filter || m.key.includes(filter) || Object.values(m.names).some((n) => n.toLowerCase().includes(filter.toLowerCase()))),
    [items, filter],
  )

  async function savePrices() {
    const upserts = [...dirty]
      .filter((id) => prices[id] !== '' && prices[id] != null)
      .map((id) => ({ material_id: id, region, price: Number(prices[id]), currency: 'UZS' }))
    if (upserts.some((u) => !Number.isFinite(u.price) || u.price < 0)) return toast.error('Prices must be non-negative numbers')
    const cleared = [...dirty].filter((id) => prices[id] === '')
    try {
      if (upserts.length) must(await supabase.from('ew_material_prices').upsert(upserts))
      if (cleared.length) must(await supabase.from('ew_material_prices').delete().eq('region', region).in('material_id', cleared))
      toast.success(`Saved ${upserts.length + cleared.length} prices`)
      setDirty(new Set())
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function saveMaterial(m: Material, isNew: boolean) {
    try {
      const row = { key: m.key, category: m.category, unit: m.unit, default_price: m.default_price, currency: 'UZS', sort_order: m.sort_order, active: m.active }
      const saved = must(
        isNew
          ? await supabase.from('ew_materials').insert(row).select('id').single()
          : await supabase.from('ew_materials').update(row).eq('id', m.id).select('id').single(),
      ) as { id: string }
      must(await supabase.from('ew_material_translations').upsert(LANGS.map((lang) => ({ material_id: saved.id, lang, name: m.names[lang].trim() || m.key }))))
      toast.success('Material saved')
      setEditing(null)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <>
      <PageHeader
        title="Materials & prices"
        description="Default prices apply everywhere; a regional price overrides it for that region. Prices are in UZS."
        actions={
          <>
            <Button variant="outline" onClick={() => items && downloadCsv(`elektruy-prices-${region}.csv`, items.map((m) => ({ key: m.key, name_uz: m.names.uz, unit: m.unit, default_price: m.default_price, [`price_${region}`]: prices[m.id] ?? '' })))}>
              <Download /> CSV
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setEditing({ id: '', key: '', category: 'other', unit: 'pcs', default_price: 0, currency: 'UZS', sort_order: 1000, active: true, names: { uz: '', ru: '', en: '' } })
              }
            >
              <Plus /> New material
            </Button>
            <Button onClick={savePrices} disabled={dirty.size === 0}>
              <Save /> Save prices {dirty.size > 0 && `(${dirty.size})`}
            </Button>
          </>
        }
      />
      <div className="mb-3 flex max-w-2xl gap-2">
        <NativeSelect value={region} onChange={(e) => setRegion(e.target.value)}>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name_en} / {r.name_uz}
            </option>
          ))}
        </NativeSelect>
        <Input placeholder="Filter" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      {!items ? (
        <Loading />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Material</TH>
              <TH>Category</TH>
              <TH>Unit</TH>
              <TH className="text-right">Default</TH>
              <TH className="w-40">Price in region</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {shown.map((m) => (
              <TR key={m.id} className={m.active ? '' : 'opacity-50'}>
                <TD>
                  <div className="font-medium">{m.names.uz || m.key}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.names.ru} · {m.names.en} · <span className="font-mono">{m.key}</span>
                  </div>
                </TD>
                <TD>
                  <Badge variant="muted">{m.category}</Badge>
                </TD>
                <TD>{m.unit}</TD>
                <TD className="text-right tabular-nums">{Number(m.default_price).toLocaleString()}</TD>
                <TD>
                  <Input
                    type="number"
                    min={0}
                    placeholder="default"
                    value={prices[m.id] ?? ''}
                    className={dirty.has(m.id) ? 'border-primary' : ''}
                    onChange={(e) => {
                      setPrices({ ...prices, [m.id]: e.target.value })
                      setDirty(new Set(dirty).add(m.id))
                    }}
                  />
                </TD>
                <TD className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(m)}>
                    Edit
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      {editing && <MaterialDialog material={editing} onClose={() => setEditing(null)} onSave={saveMaterial} />}
    </>
  )
}

function MaterialDialog({ material, onClose, onSave }: { material: Material; onClose: () => void; onSave: (m: Material, isNew: boolean) => void }) {
  const [m, setM] = useState(material)
  const isNew = !material.id
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? 'New material' : m.key}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Key (used by the calculator)">
            <Input value={m.key} disabled={!isNew} onChange={(e) => setM({ ...m, key: e.target.value.toLowerCase() })} placeholder="cable_3x2_5" />
          </Field>
          <Field label="Category">
            <NativeSelect value={m.category} onChange={(e) => setM({ ...m, category: e.target.value })}>
              {[...new Set([...CATEGORIES, m.category])].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          </Field>
          {LANGS.map((l) => (
            <Field key={l} label={`Name (${l})`}>
              <Input value={m.names[l]} onChange={(e) => setM({ ...m, names: { ...m.names, [l]: e.target.value } })} />
            </Field>
          ))}
          <Field label="Unit">
            <NativeSelect value={m.unit} onChange={(e) => setM({ ...m, unit: e.target.value as Material['unit'] })}>
              <option value="m">m</option>
              <option value="pcs">pcs</option>
              <option value="kg">kg</option>
            </NativeSelect>
          </Field>
          <Field label="Default price, UZS">
            <Input type="number" min={0} value={m.default_price} onChange={(e) => setM({ ...m, default_price: Number(e.target.value) })} />
          </Field>
          <Field label="Order">
            <Input type="number" value={m.sort_order} onChange={(e) => setM({ ...m, sort_order: Number(e.target.value) })} />
          </Field>
          <Field label="Active">
            <div className="flex h-9 items-center">
              <Switch checked={m.active} onCheckedChange={(v) => setM({ ...m, active: v })} />
            </div>
          </Field>
        </div>
        {isNew && <p className="text-xs text-muted-foreground">New keys appear in lists, but the calculator only uses keys it knows (cables, boxes, devices…).</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!/^[a-z0-9_]+$/.test(m.key)} onClick={() => onSave(m, isNew)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
