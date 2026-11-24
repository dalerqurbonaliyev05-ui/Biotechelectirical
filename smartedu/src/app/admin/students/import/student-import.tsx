'use client'

import { useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { toCsv } from '@/lib/csv'
import { t } from '@/lib/i18n'
import type { RowIssue, StudentRow } from '@/lib/import/students'
import type { ImportResult } from '@/lib/server/accounts'

const CHUNK = 20
const L = t.importStudents

export function StudentImport() {
  const [createGroups, setCreateGroups] = useState(true)
  const [parsed, setParsed] = useState<{ rows: StudentRow[]; issues: RowIssue[] } | null>(null)
  const [results, setResults] = useState<ImportResult[]>([])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setParsed(null)
    setResults([])
    setError(null)
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      setParsed(await apiJson('/api/admin/students/parse', { method: 'POST', body: form }))
    } catch (err) {
      setError(errorText(err instanceof ClientApiError ? err.code : undefined))
    }
  }

  async function start() {
    if (!parsed) return
    setBusy(true)
    setError(null)
    setResults([])
    setDone(0)
    try {
      for (let i = 0; i < parsed.rows.length; i += CHUNK) {
        const rows = parsed.rows.slice(i, i + CHUNK)
        const res = await apiJson<{ results: ImportResult[] }>('/api/admin/students/import', {
          method: 'POST',
          json: { rows, createMissingGroups: createGroups, startRow: i + 2 },
        })
        setResults((prev) => [...prev, ...res.results])
        setDone(i + rows.length)
      }
    } catch (err) {
      setError(errorText(err instanceof ClientApiError ? err.code : undefined))
    } finally {
      setBusy(false)
    }
  }

  function download() {
    const csv = toCsv([
      ['student_code', 'full_name', 'group', 'status', 'temp_password'],
      ...results.map((r) => [
        r.student_code,
        r.full_name,
        r.group,
        r.status,
        r.temp_password ?? '',
      ]),
    ])
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'talabalar-parollar.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <label className="label" htmlFor="file">
          {L.chooseFile}
        </label>
        <input
          id="file"
          type="file"
          accept=".csv,.xlsx,.txt"
          onChange={onFile}
          className="input"
          disabled={busy}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={createGroups}
            onChange={(e) => setCreateGroups(e.target.checked)}
          />
          {L.createGroups}
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {parsed && (
        <div className="card space-y-3">
          <p className="text-sm">
            <b>{parsed.rows.length}</b> {L.rowsOk} · <b>{parsed.issues.length}</b> {L.rowsBad}
          </p>
          {parsed.issues.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-red-600">
              {parsed.issues.slice(0, 20).map((i) => (
                <li key={`${i.row}-${i.message}`}>
                  {L.columns.row} {i.row}: {L.issues[i.message] ?? i.message}
                </li>
              ))}
            </ul>
          )}
          <button
            className="btn-primary"
            onClick={start}
            disabled={busy || parsed.rows.length === 0}
          >
            {busy ? `${L.working} ${done}/${parsed.rows.length}` : L.start}
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{L.resultTitle}</h2>
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{L.warnPasswords}</p>
          <button className="btn-secondary" onClick={download}>
            {L.downloadResult}
          </button>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{L.columns.code}</th>
                  <th>{L.columns.name}</th>
                  <th>{L.columns.group}</th>
                  <th>{L.columns.status}</th>
                  <th>{L.columns.password}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.student_code}>
                    <td className="font-mono">{r.student_code}</td>
                    <td>{r.full_name}</td>
                    <td>{r.group}</td>
                    <td>
                      {r.status === 'error'
                        ? `${L.error}: ${L.issues[r.message ?? ''] ?? r.message}`
                        : L[r.status]}
                    </td>
                    <td className="font-mono">{r.temp_password ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
