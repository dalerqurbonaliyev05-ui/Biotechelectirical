'use client'

import type { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiJson } from '@/lib/api-client'
import { parseReactionEvent, type ReactionKind } from '@/lib/reactions'
import { parseStateEvent, sessionChannel, type SessionState } from '@/lib/session-state'
import { createClient } from '@/lib/supabase/browser'

/**
 * Doska va boshqaruv uchun umumiy hook.
 *  - Holat manbai: DB (GET /state). Realtime xabari faqat "yangilanish bor" signali (soxta xabar zarar qilmaydi).
 *  - Bitta kanal (`session:<id>`), xabar hajmi bir necha bayt. Aloqa uzilsa har 10 s da so'rov bilan tiklanadi.
 */
export function useLiveSession(
  initial: SessionState,
  pollMs = 10_000,
  onReaction?: (kind: ReactionKind) => void,
) {
  const [state, setState] = useState(initial)
  const [connected, setConnected] = useState(false)
  const revRef = useRef(initial.rev)
  const channel = useRef<RealtimeChannel | null>(null)
  const reactionRef = useRef(onReaction)
  reactionRef.current = onReaction

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
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        // Ishonchsiz signal: faqat animatsiya; hisob DB'dan olinadi
        const kind = parseReactionEvent(payload)
        if (kind) reactionRef.current?.(kind)
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
      // q: talabalar telefoni savol ochilgani/yopilganini shu belgidan biladi va savolni serverdan so'raydi
      payload: { rev: s.rev, slide: s.slide, status: s.status, q: s.question?.status ?? null },
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

  /** "Keyingi" (nuqta oqimi) yoki skip=true: nuqtani o'tkazib yuborish */
  const next = useCallback(
    async (skip = false) => {
      const s = await apiJson<SessionState>(`/api/sessions/${initial.id}/next`, {
        method: 'POST',
        json: { skip },
      })
      apply(s)
      broadcast(s)
    },
    [apply, broadcast, initial.id],
  )

  const openQuestion = useCallback(
    async (lectureQuestionId: string) => {
      const s = await apiJson<SessionState>(`/api/sessions/${initial.id}/question`, {
        method: 'POST',
        json: { action: 'open', lecture_question_id: lectureQuestionId },
      })
      apply(s)
      broadcast(s)
    },
    [apply, broadcast, initial.id],
  )

  const closeQuestion = useCallback(async () => {
    const s = await apiJson<SessionState>(`/api/sessions/${initial.id}/question`, {
      method: 'POST',
      json: { action: 'close' },
    })
    apply(s)
    broadcast(s)
  }, [apply, broadcast, initial.id])

  /** Talabalarga "hozir yangilang" signali (Realtime ishonchsiz; haqiqiy holat DB'dan olinadi) */
  const signalRefresh = useCallback(() => {
    void channel.current?.send({ type: 'broadcast', event: 'focus', payload: {} })
  }, [])

  const signalAnnot = useCallback((slide: number) => {
    void channel.current?.send({ type: 'broadcast', event: 'annot', payload: { slide } })
  }, [])

  const focusCall = useCallback(async () => {
    const s = await apiJson<SessionState>(`/api/sessions/${initial.id}/focus`, { method: 'POST' })
    apply(s)
    broadcast(s)
    signalRefresh()
  }, [apply, broadcast, signalRefresh, initial.id])

  const setBreak = useCallback(
    async (action: 'start' | 'end') => {
      const s = await apiJson<SessionState>(`/api/sessions/${initial.id}/break`, {
        method: 'POST',
        json: { action },
      })
      apply(s)
      broadcast(s)
      signalRefresh()
    },
    [apply, broadcast, signalRefresh, initial.id],
  )

  const end = useCallback(async () => {
    const s = await apiJson<SessionState>(`/api/sessions/${initial.id}/end`, { method: 'POST' })
    apply(s)
    broadcast(s)
  }, [apply, broadcast, initial.id])

  return {
    state,
    connected,
    setSlide,
    end,
    refresh,
    openQuestion,
    closeQuestion,
    applyState: apply,
    next,
    focusCall,
    setBreak,
    signalAnnot,
  }
}
