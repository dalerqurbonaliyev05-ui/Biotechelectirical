'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'

const L = t.live

export function StartSession({
  lectureId,
  groups,
  rooms,
}: {
  lectureId: string
  groups: { id: string; name: string }[]
  rooms: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [group, setGroup] = useState('')
  const [room, setRoom] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function start(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const s = await apiJson<{ id: string }>('/api/sessions', {
        method: 'POST',
        json: { lecture_id: lectureId, group_id: group || null, room_id: room || null },
      })
      router.push(`/teacher/sessions/${s.id}`)
    } catch (err) {
      setError(errorText(err instanceof ClientApiError ? err.code : undefined))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={start} className="card grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <div>
        <label className="label" htmlFor="st-group">
          {L.startGroup}
        </label>
        <select
          id="st-group"
          className="input"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          <option value="">{L.startAnyGroup}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="st-room">
          {L.startRoom}
        </label>
        <select
          id="st-room"
          className="input"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        >
          <option value="">{L.startNoRoom}</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? t.app.loading : L.startNow}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600 sm:col-span-3">
          {error}
        </p>
      )}
    </form>
  )
}
