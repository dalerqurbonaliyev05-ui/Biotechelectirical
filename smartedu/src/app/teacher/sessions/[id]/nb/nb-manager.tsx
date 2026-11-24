'use client'

import { useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'

const P = t.presence

export interface NbRow {
  studentId: string
  name: string
  code: string | null
  status: 'present' | 'nb'
  auto: 'present' | 'nb'
  overridden: boolean
  reason: string | null
  ratio: number | null
  minutes: number | null
}

/** NB ro'yxati va qo'lda tuzatish (sabab majburiy; server audit_log'ga yozadi). */
export function NbManager({ sessionId, rows: initial }: { sessionId: string; rows: NbRow[] }) {
  const [rows, setRows] = useState(initial)
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const nb = rows.filter((r) => r.status === 'nb')

  async function change(row: NbRow, status: 'present' | 'nb') {
    const reason = (reasons[row.studentId] ?? '').trim()
    if (reason.length < 3) return setMsg(P.reasonPlaceholder)
    setBusy(row.studentId)
    setMsg(null)
    try {
      await apiJson(`/api/sessions/${sessionId}/attendance/override`, {
        method: 'POST',
        json: { student_id: row.studentId, status, reason },
      })
      setRows((rs) =>
        rs.map((r) =>
          r.studentId === row.studentId ? { ...r, status, overridden: true, reason } : r,
        ),
      )
      setMsg(P.saved)
    } catch (err) {
      setMsg(errorText(err instanceof ClientApiError ? err.code : undefined))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        NB: {nb.length} / {rows.length}
      </p>
      {msg && (
        <p role="status" className="text-sm text-amber-800">
          {msg}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="card text-sm text-slate-500">{P.nbEmpty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-slate-500">
                <th className="p-2">{P.student}</th>
                <th className="p-2">{P.ratio}</th>
                <th className="p-2" />
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.studentId} className="border-b align-top">
                  <td className="p-2">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-slate-500">{r.code}</p>
                  </td>
                  <td className="p-2 text-xs text-slate-600">
                    <span
                      className={`badge ${r.status === 'nb' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}
                    >
                      {P.status[r.status]} ({r.overridden ? P.manual : P.auto})
                    </span>
                    <br />
                    {r.ratio !== null && `${Math.round(r.ratio * 100)}%`}
                    {r.minutes !== null && ` · ${r.minutes} ${P.minutes}`}
                    {r.overridden && r.reason && <span className="block italic">{r.reason}</span>}
                  </td>
                  <td className="p-2">
                    <input
                      className="input w-56 text-xs"
                      placeholder={P.reasonPlaceholder}
                      value={reasons[r.studentId] ?? ''}
                      onChange={(e) => setReasons({ ...reasons, [r.studentId]: e.target.value })}
                    />
                  </td>
                  <td className="p-2">
                    <button
                      className="btn-secondary text-xs"
                      disabled={busy === r.studentId}
                      onClick={() => change(r, r.status === 'nb' ? 'present' : 'nb')}
                    >
                      {r.status === 'nb' ? P.makePresent : P.makeNb}
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
