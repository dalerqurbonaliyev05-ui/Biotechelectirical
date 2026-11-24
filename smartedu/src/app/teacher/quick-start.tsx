'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'

const L = t.live

/** O'qituvchi profilidan darsni boshlash (yoki davom etayotgan darsga qaytish). Guruh/auditoriya — ma'ruza sahifasida. */
export function QuickStart({
  lectures,
  active,
}: {
  lectures: { id: string; title: string }[]
  active: { id: string; code: string; title: string }[]
}) {
  const router = useRouter()
  const [lecture, setLecture] = useState(lectures[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setBusy(true)
    setError(null)
    try {
      const s = await apiJson<{ id: string }>('/api/sessions', {
        method: 'POST',
        json: { lecture_id: lecture },
      })
      router.push(`/teacher/sessions/${s.id}`)
    } catch (err) {
      setError(errorText(err instanceof ClientApiError ? err.code : undefined))
      setBusy(false)
    }
  }

  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">{L.startTitle}</h2>
      {active.length > 0 && (
        <ul className="space-y-1 text-sm">
          {active.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2">
              <span className="badge font-mono">{a.code}</span>
              <span className="flex-1">{a.title}</span>
              <Link href={`/teacher/sessions/${a.id}`} className="btn-secondary">
                {L.control}
              </Link>
              <Link href={`/board/${a.id}`} target="_blank" className="btn-primary">
                {L.openBoard}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {lectures.length === 0 ? (
        <p className="text-sm text-slate-500">{t.lectures.empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <select
            className="input max-w-sm flex-1"
            value={lecture}
            onChange={(e) => setLecture(e.target.value)}
            aria-label={t.lectures.fields.title}
          >
            {lectures.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
          <button className="btn-primary" disabled={busy || !lecture} onClick={start}>
            {busy ? t.app.loading : L.startNow}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  )
}
