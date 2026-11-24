'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { t } from '@/lib/i18n'

/** 6 xonali dars kodini kiritish (QR bo'lmasa). */
export function CodeEntry({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const clean = code.replace(/\D/g, '').slice(0, 6)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (clean.length === 6) router.push(`/live/${clean}`)
      }}
      className={compact ? 'flex gap-2' : 'space-y-3'}
    >
      <label className="sr-only" htmlFor="live-code">
        {t.liveStudent.code}
      </label>
      <input
        id="live-code"
        className="input text-center font-mono text-2xl tracking-[0.3em]"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        maxLength={7}
        value={clean}
        onChange={(e) => setCode(e.target.value)}
      />
      <button className="btn-primary" disabled={clean.length !== 6}>
        {t.liveStudent.join}
      </button>
    </form>
  )
}
