'use client'

import { useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'

const Q = t.questions

interface Result {
  imported: number
  count: number
  issues: { row: number; message: string }[]
  preview: { type: string; text: string }[]
}

export function QuestionImport({ subjects }: { subjects: { id: string; name: string }[] }) {
  const [subject, setSubject] = useState(subjects[0]?.id ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [res, setRes] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(dry: boolean) {
    if (!file || !subject) return
    setBusy(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    form.append('subject_id', subject)
    form.append('dry_run', dry ? '1' : '0')
    try {
      setRes(await apiJson<Result>('/api/questions/import', { method: 'POST', body: form }))
    } catch (err) {
      setError(errorText(err instanceof ClientApiError ? err.code : undefined))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div>
          <label className="label" htmlFor="imp-subject">
            {Q.fields.subject}
          </label>
          <select
            id="imp-subject"
            className="input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <input
          type="file"
          accept=".csv,.xlsx,.txt"
          className="input"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            setRes(null)
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" disabled={!file || busy} onClick={() => run(true)}>
            {Q.check}
          </button>
          {/* Fayl yuklab olish: sahifa navigatsiyasi emas */}
          <a className="btn-secondary" href="/api/questions/template" download>
            {Q.template}
          </a>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {res && (
        <div className="card space-y-3">
          {res.imported > 0 ? (
            <p className="text-green-700">
              <b>{res.imported}</b> {Q.imported}
            </p>
          ) : (
            <>
              <p>
                <b>{res.count}</b> {Q.okRows} · <b>{res.issues.length}</b>{' '}
                {t.importStudents.rowsBad}
              </p>
              {res.issues.length > 0 && (
                <ul className="list-disc pl-5 text-sm text-red-600">
                  {res.issues.slice(0, 30).map((i) => (
                    <li key={`${i.row}-${i.message}`}>
                      {t.importStudents.columns.row} {i.row}: {Q.issues[i.message] ?? i.message}
                    </li>
                  ))}
                </ul>
              )}
              {res.issues.length === 0 && res.count > 0 && (
                <>
                  <ul className="list-disc pl-5 text-sm text-slate-600">
                    {res.preview.map((p, i) => (
                      <li key={i}>
                        [{Q.types[p.type]}] {p.text}
                      </li>
                    ))}
                  </ul>
                  <button className="btn-primary" disabled={busy} onClick={() => run(false)}>
                    {Q.importNow}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
