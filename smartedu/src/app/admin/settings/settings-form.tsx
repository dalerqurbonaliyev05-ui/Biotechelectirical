'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/browser'
import { SETTING_BOUNDS } from '@/lib/settings-bounds'

export function SettingsForm({ initial }: { initial: Record<string, number> }) {
  const router = useRouter()
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.keys(SETTING_BOUNDS).map((k) => [
        k,
        String(initial[k] ?? SETTING_BOUNDS[k]?.def ?? ''),
      ]),
    ),
  )
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    const rows = []
    for (const [key, b] of Object.entries(SETTING_BOUNDS)) {
      const n = Number(vals[key])
      if (!Number.isFinite(n) || n < b.min || n > b.max)
        return setErr(`${t.admin.settings.items[key]?.label}: ${b.min}…${b.max}`)
      rows.push({ key, value: n })
    }
    const { error } = await createClient().from('app_settings').upsert(rows)
    if (error) return setErr(t.app.error)
    setMsg(t.admin.settings.saved)
    router.refresh()
  }

  return (
    <form onSubmit={save} className="card max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">{t.admin.settings.title}</h1>
      <p className="text-sm text-slate-600">{t.admin.settings.lead}</p>
      {Object.keys(SETTING_BOUNDS).map((key) => (
        <div key={key}>
          <label className="label" htmlFor={key}>
            {t.admin.settings.items[key]?.label}
          </label>
          <input
            id={key}
            type="number"
            className="input"
            value={vals[key] ?? ''}
            onChange={(e) => setVals({ ...vals, [key]: e.target.value })}
          />
          <p className="mt-1 text-xs text-slate-500">{t.admin.settings.items[key]?.hint}</p>
        </div>
      ))}
      {err && (
        <p role="alert" className="text-sm text-red-600">
          {err}
        </p>
      )}
      {msg && (
        <p role="status" className="text-sm text-green-700">
          {msg}
        </p>
      )}
      <button className="btn-primary">{t.app.save}</button>
    </form>
  )
}
