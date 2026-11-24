'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'

export function ChangePasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) return setError(t.auth.mismatch)
    setBusy(true)
    setError(null)
    try {
      const res = await apiJson<{ redirect: string }>('/api/auth/change-password', {
        method: 'POST',
        json: { password },
      })
      router.replace(res.redirect)
      router.refresh()
    } catch (err) {
      if (err instanceof ClientApiError && err.code === 'validation') {
        const detail = (err as ClientApiError & { detail?: string }).detail ?? ''
        setError(t.auth.passwordErrors[detail] ?? errorText(err.code))
      } else {
        setError(errorText(err instanceof ClientApiError ? err.code : undefined))
      }
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div>
        <label className="label" htmlFor="np">
          {t.auth.newPassword}
        </label>
        <input
          id="np"
          type="password"
          className="input"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="cp">
          {t.auth.confirmPassword}
        </label>
        <input
          id="cp"
          type="password"
          className="input"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? t.app.loading : t.auth.changeSubmit}
      </button>
    </form>
  )
}
