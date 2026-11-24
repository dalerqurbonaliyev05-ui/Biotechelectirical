'use client'

import { useEffect, useRef, useState } from 'react'

interface Timed {
  id: string
  openedAt: string
  timeLimitSec: number
  serverNow: string
}

/**
 * Savol uchun qolgan vaqt (ms; muddat o'tgach manfiy). Mijoz soatiga emas, serverdan kelgan "hozir"ga tayanadi
 * (monoton `performance.now()` bilan ilgari suriladi) — telefon soati noto'g'ri bo'lsa ham taymer to'g'ri.
 */
export function useCountdown(q: Timed | null): number | null {
  const anchor = useRef({ server: 0, perf: 0, key: '' })
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!q) {
      setLeft(null)
      return
    }
    const key = `${q.id}:${q.serverNow}`
    if (anchor.current.key !== key)
      anchor.current = { server: Date.parse(q.serverNow), perf: performance.now(), key }
    const end = Date.parse(q.openedAt) + q.timeLimitSec * 1000
    const tick = () =>
      setLeft(end - (anchor.current.server + (performance.now() - anchor.current.perf)))
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [q])

  return left
}

/** "29" ko'rinishidagi soniyalar (butun, yuqoriga yaxlitlangan; 0 dan past bo'lmaydi). */
export const secondsLeft = (ms: number | null): number =>
  ms === null ? 0 : Math.max(0, Math.ceil(ms / 1000))
