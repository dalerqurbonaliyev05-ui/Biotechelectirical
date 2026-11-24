'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'

/** `next` faqat sayt ichidagi yo'l bo'lsin (open redirect'ga qarshi). */
export function safeNext(next: string | undefined): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')
    ? next
    : null
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await apiJson<{ redirect: string }>('/api/auth/login', {
        method: 'POST',
        json: { identifier, password },
      })
      const target =
        res.redirect === '/change-password' ? res.redirect : (safeNext(next) ?? res.redirect)
      router.replace(target)
      router.refresh()
    } catch (err) {
      setError(errorText(err instanceof ClientApiError ? err.code : undefined))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div>
        <label className="label" htmlFor="identifier">
          {t.auth.identifier}
        </label>
        <input
          id="identifier"
          className="input"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <p className="mt-1 text-xs text-slate-500">{t.auth.identifierHint}</p>
      </div>
      <div>
        <label className="label" htmlFor="password">
          {t.auth.password}
        </label>
        <input
          id="password"
          type="password"
          className="input"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? t.app.loading : t.auth.submit}
      </button>
    </form>
  )
}
