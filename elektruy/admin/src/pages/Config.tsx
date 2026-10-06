import { History, RotateCcw, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loading, PageHeader } from '@/components/Layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { must, supabase } from '@/lib/supabase'
import { cn, fmtDate } from '@/lib/utils'

type ConfigRow = { key: string; value: unknown; version: number; updated_at: string }
type HistoryRow = { id: number; key: string; value: unknown; version: number; changed_at: string }

const HELP: Record<string, string> = {
  calc: 'Electrical constants: voltage, cos φ, copper resistivity, voltage-drop limits, breakers, cross-section table, group limits, reserve %.',
  heights: 'Mounting heights and offsets in metres (sockets, switches, ceiling band, corner offset).',
  appliances: 'Appliance presets: key, power_w, cosphi, out_of_scope, names per language.',
  out_of_scope_rules: 'Scope guard rules: code, severity (block | warn) and the text shown to the user.',
  safety_checklist: 'Items the user must tick before every lesson or job.',
  ai_limits: 'Per-user AI quotas (per hour / per day) and image limits used by the Edge Functions.',
  feature_flags: 'Turn app features on or off remotely (ai_estimate, ai_check, ar_measure, voice_guide, marketplace).',
  currency: 'Default currency and exchange rates to UZS (USD rate is entered manually).',
  wire_colors: 'Wire colours used in diagrams and the 3D view.',
}

/** Minimal structural checks so a typo cannot break the calculator in every app. */
function validate(key: string, v: unknown): string | null {
  const isObj = (x: unknown) => typeof x === 'object' && x !== null && !Array.isArray(x)
  if (['calc', 'heights', 'ai_limits', 'feature_flags', 'currency', 'wire_colors'].includes(key) && !isObj(v)) return 'Must be a JSON object'
  if (['appliances', 'out_of_scope_rules', 'safety_checklist'].includes(key) && !Array.isArray(v)) return 'Must be a JSON array'
  if (key === 'calc') {
    const c = v as Record<string, unknown>
    for (const f of ['voltage_v', 'rho_copper', 'vdrop_max_pct']) if (typeof c[f] !== 'number' || (c[f] as number) <= 0) return `calc.${f} must be a positive number`
    if (!Array.isArray(c.cross_sections) || c.cross_sections.length === 0) return 'calc.cross_sections must be a non-empty array'
  }
  if (key === 'out_of_scope_rules') {
    for (const r of v as Record<string, unknown>[]) if (!r.code || !['block', 'warn'].includes(String(r.severity))) return 'Every rule needs code and severity block|warn'
  }
  if (key === 'safety_checklist' && (v as unknown[]).length === 0) return 'The safety checklist cannot be empty'
  return null
}

export function Config() {
  const [rows, setRows] = useState<ConfigRow[] | null>(null)
  const [selected, setSelected] = useState('calc')
  const [text, setText] = useState('')
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = () => supabase.from('ew_app_config').select('*').order('key').then((r) => setRows(must(r)))
  useEffect(() => {
    load()
  }, [])

  const current = rows?.find((r) => r.key === selected)
  useEffect(() => {
    if (!current) return
    setText(JSON.stringify(current.value, null, 2))
    setError(null)
    supabase
      .from('ew_app_config_history')
      .select('*')
      .eq('key', selected)
      .order('version', { ascending: false })
      .limit(20)
      .then((r) => setHistory(must(r)))
  }, [current, selected])

  function onChange(t: string) {
    setText(t)
    try {
      setError(validate(selected, JSON.parse(t)))
    } catch (e) {
      setError(`Invalid JSON: ${(e as Error).message}`)
    }
  }

  async function save(value: unknown) {
    const problem = validate(selected, value)
    if (problem) return toast.error(problem)
    const { error } = await supabase.from('ew_app_config').update({ value }).eq('key', selected)
    if (error) return toast.error(error.message)
    toast.success(`${selected} saved — apps pick it up on next sync`)
    load()
  }

  if (!rows) return <Loading />
  return (
    <>
      <PageHeader title="Calculation config" description="Versioned settings read by the app (calculator, scope guard, safety gate) and by the Edge Functions." />
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="flex flex-col gap-1">
          {rows.map((r) => (
            <button
              key={r.key}
              onClick={() => setSelected(r.key)}
              className={cn('flex items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted', selected === r.key && 'bg-primary/10 font-semibold text-primary')}
            >
              {r.key} <Badge variant="muted">v{r.version}</Badge>
            </button>
          ))}
        </div>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{selected}</CardTitle>
              <CardDescription>
                {HELP[selected]} Last change {fmtDate(current?.updated_at)}.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Textarea value={text} onChange={(e) => onChange(e.target.value)} rows={24} spellCheck={false} className="font-mono text-xs" />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end">
                <Button disabled={!!error || text === JSON.stringify(current?.value, null, 2)} onClick={() => save(JSON.parse(text))}>
                  <Save /> Save as v{(current?.version ?? 0) + 1}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-4" /> History
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-muted">
                  <span>
                    v{h.version} · {fmtDate(h.changed_at)}
                  </span>
                  {h.version !== current?.version && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Restore v${h.version}? It is saved as a new version.`)) save(h.value)
                      }}
                    >
                      <RotateCcw /> Restore
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
