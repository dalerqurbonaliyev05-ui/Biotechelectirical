'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FieldDef } from '@/lib/admin/resources'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/browser'

type Row = { id: string } & Record<string, unknown>
export type OptionsMap = Record<string, { value: string; label: string }[]>

function dbError(err: { code?: string }): string {
  if (err.code === '23505') return t.admin.crud.duplicate
  if (err.code === '23503') return t.admin.crud.deleteBlocked
  return t.app.error
}

/**
 * Admin uchun umumiy CRUD. Yozuvlar brauzer mijozi orqali, RLS ostida (faqat admin yoza oladi).
 */
export function CrudManager({
  table,
  title,
  singular,
  fields,
  rows,
  options,
}: {
  table: string
  title: string
  singular: string
  fields: FieldDef[]
  rows: Row[]
  options: OptionsMap
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<Row | 'new' | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function open(row: Row | 'new') {
    setError(null)
    setEditing(row)
    const v: Record<string, string> = {}
    for (const f of fields) v[f.key] = row === 'new' ? '' : String((row as Row)[f.key] ?? '')
    setValues(v)
  }

  function optionLabel(f: FieldDef, value: unknown): string {
    if (value === null || value === undefined || value === '') return '—'
    if (f.type !== 'select') return String(value)
    return options[f.key]?.find((o) => o.value === value)?.label ?? '—'
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string, string | number | null> = {}
    for (const f of fields) {
      const raw = (values[f.key] ?? '').trim()
      if (!raw) {
        if (f.required) return setError(`${t.admin.crud.required} ${f.label}`)
        payload[f.key] = null
      } else {
        payload[f.key] = f.type === 'number' ? Number(raw) : raw
      }
    }
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: err } =
      editing === 'new'
        ? await supabase.from(table).insert(payload)
        : await supabase
            .from(table)
            .update(payload)
            .eq('id', (editing as Row).id)
    setBusy(false)
    if (err) return setError(dbError(err))
    setEditing(null)
    router.refresh()
  }

  async function remove(row: Row) {
    if (!confirm(t.app.confirmDelete)) return
    setError(null)
    const { error: err } = await createClient().from(table).delete().eq('id', row.id)
    if (err) return setError(dbError(err))
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        <button className="btn-primary" onClick={() => open('new')}>
          + {singular}
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {editing && (
        <form onSubmit={save} className="card grid gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="label" htmlFor={`f-${f.key}`}>
                {f.label}
                {f.required && ' *'}
              </label>
              {f.type === 'select' ? (
                <select
                  id={`f-${f.key}`}
                  className="input"
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                >
                  <option value="">{t.admin.crud.choose}</option>
                  {(options[f.key] ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`f-${f.key}`}
                  className="input"
                  type={f.type === 'number' ? 'number' : 'text'}
                  min={f.min}
                  max={f.max}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary" disabled={busy}>
              {t.app.save}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
              {t.app.cancel}
            </button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="card text-slate-500">{t.app.empty}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {fields.map((f) => (
                  <th key={f.key}>{f.label}</th>
                ))}
                <th className="w-40">{t.app.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {fields.map((f) => (
                    <td key={f.key}>{optionLabel(f, r[f.key])}</td>
                  ))}
                  <td className="space-x-2 whitespace-nowrap">
                    <button className="text-brand-600 hover:underline" onClick={() => open(r)}>
                      {t.app.edit}
                    </button>
                    <button className="text-red-600 hover:underline" onClick={() => remove(r)}>
                      {t.app.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
