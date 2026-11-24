'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'

export function DeleteLecture({ id }: { id: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  async function remove() {
    if (!confirm(t.lectures.deleteConfirm)) return
    try {
      await apiJson(`/api/lectures/${id}`, { method: 'DELETE' })
      router.refresh()
    } catch (err) {
      setError(
        err instanceof ClientApiError && err.code === 'in_use'
          ? t.questions.inUse
          : errorText(err instanceof ClientApiError ? err.code : undefined),
      )
    }
  }
  return (
    <div className="text-right">
      <button className="text-sm text-red-600 hover:underline" onClick={remove}>
        {t.app.delete}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
