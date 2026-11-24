'use client'

import type { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiJson } from '@/lib/api-client'
import { parseStateEvent, sessionChannel, type SessionState } from '@/lib/session-state'
import { createClient } from '@/lib/supabase/browser'

/**
 * Doska va boshqaruv uchun umumiy hook.
 *  - Holat manbai: DB (GET /state). Realtime xabari faqat "yangilanish bor" signali (soxta xabar zarar qilmaydi).
 *  - Bitta kanal (`session:<id>`), xabar hajmi bir necha bayt. Aloqa uzilsa har 10 s da so'rov bilan tiklanadi.
 */
export function useLiveSession(initial: SessionState, pollMs = 10_000) {
  const [state, setState] = useState(initial)
  const [connected, setConnected] = useState(false)
  const revRef = useRef(initial.rev)
  const channel = useRef<RealtimeChannel | null>(null)

  const apply = useCallback((s: SessionState) => {
    if (s.rev >= revRef.current) {
      revRef.current = s.rev
      setState(s)
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      apply(await apiJson<SessionState>(`/api/sessions/${initial.id}/state`))
    } catch {
      /* keyingi urinishda */
    }
  }, [apply, initial.id])

  useEffect(() => {
    const sb = createClient()
    const ch = sb
      .channel(sessionChannel(initial.id), { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        const ev = parseStateEvent(payload)
        if (ev && ev.rev > revRef.current) void refresh() // ishonchsiz hodisa → haqiqiy holatni DB'dan olamiz
      })
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))
    channel.current = ch
    const poll = setInterval(() => void refresh(), pollMs)
    return () => {
      clearInterval(poll)
      void sb.removeChannel(ch)
    }
  }, [initial.id, refresh, pollMs])

  const broadcast = useCallback((s: SessionState) => {
    void channel.current?.send({
      type: 'broadcast',
      event: 'state',
      payload: { rev: s.rev, slide: s.slide, status: s.status },
    })
  }, [])

  const setSlide = useCallback(
    async (slide: number) => {
      const s = await apiJson<SessionState>(`/api/sessions/${initial.id}/slide`, {
        method: 'POST',
        json: { slide },
      })
      apply(s)
      broadcast(s)
    },
    [apply, broadcast, initial.id],
  )

  const end = useCallback(async () => {
    const s = await apiJson<SessionState>(`/api/sessions/${initial.id}/end`, { method: 'POST' })
    apply(s)
    broadcast(s)
  }, [apply, broadcast, initial.id])

  return { state, connected, setSlide, end, refresh }
}
