'use client'

import { useEffect, useState } from 'react'
import { apiJson } from '@/lib/api-client'
import type { RatingRow } from '@/lib/live-rating'
import type { QuestionStats } from '@/lib/server/live-questions'
import type { LiveQuestionView } from '@/lib/live-question'

/** Joriy savol statistikasi: ochiq paytda har 2 s, yopilgach bir marta (to'g'ri javob bilan). */
export function useQuestionStats(
  sessionId: string,
  question: LiveQuestionView | null,
  pollMs = 2000,
): QuestionStats | null {
  const [stats, setStats] = useState<QuestionStats | null>(null)
  const qid = question?.id
  const status = question?.status

  useEffect(() => {
    if (!qid) {
      setStats(null)
      return
    }
    let live = true
    const load = () =>
      apiJson<{ stats: QuestionStats | null }>(`/api/sessions/${sessionId}/question-stats`)
        .then((r) => live && setStats(r.stats))
        .catch(() => undefined)
    void load()
    if (status !== 'open')
      return () => {
        live = false
      }
    const t = setInterval(load, pollMs)
    return () => {
      live = false
      clearInterval(t)
    }
  }, [sessionId, qid, status, pollMs])

  return stats
}

/** Reyting: savol yopilganda va dars tugaganda yangilanadi. */
export function useRating(
  sessionId: string,
  trigger: string,
): { top: RatingRow[]; total: number } | null {
  const [data, setData] = useState<{ top: RatingRow[]; total: number } | null>(null)
  useEffect(() => {
    let live = true
    apiJson<{ top: RatingRow[]; total: number }>(`/api/sessions/${sessionId}/rating`)
      .then((r) => live && setData(r))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [sessionId, trigger])
  return data
}

export interface ReactionsView {
  slide: number
  understood: number
  confused: number
  reactors: number
  leaders: { count: number; names: string[] }
  confusedEnabled: boolean
}

/** Joriy slayd reaksiyalari (DB'dan, har 4 s da) — doska va boshqaruv uchun. */
export function useReactions(
  sessionId: string,
  slide: number,
  active: boolean,
): ReactionsView | null {
  const [data, setData] = useState<ReactionsView | null>(null)
  useEffect(() => {
    if (!active) return
    let live = true
    const load = () =>
      apiJson<ReactionsView>(`/api/sessions/${sessionId}/reactions`)
        .then((r) => live && setData(r))
        .catch(() => undefined)
    void load()
    const t = setInterval(load, 4000)
    return () => {
      live = false
      clearInterval(t)
    }
  }, [sessionId, slide, active])
  return data && data.slide === slide ? data : null
}
