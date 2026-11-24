'use client'

import type { ReactNode } from 'react'

/**
 * Doskaning pastki INGICHKA paneli (slayd ustini hech qachon yopmaydi: u slayd maydonidan TASHQARIDA, alohida qator).
 * Chapda — slayd ostidagi kitob belgisi (12-bosqich), o'rtada — reaksiyalar (9-bosqich), o'ngda — hisoblagichlar.
 */
export function BoardStrip({
  left,
  center,
  right,
}: {
  left?: ReactNode
  center?: ReactNode
  right?: ReactNode
}) {
  return (
    <div
      className="flex h-14 shrink-0 items-center gap-6 overflow-hidden border-t border-white/10 bg-slate-950 px-6 text-xl"
      data-testid="board-strip"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">{left}</div>
      <div className="relative flex h-full min-w-0 flex-[2] items-center justify-center">
        {center}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-4">{right}</div>
    </div>
  )
}
