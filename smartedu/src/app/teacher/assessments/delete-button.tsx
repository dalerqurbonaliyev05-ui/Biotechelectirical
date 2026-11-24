'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'

export function DeleteAssessment({ id }: { id: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  async function remove() {
    if (!confirm(t.app.confirmDelete)) return
    try {
      await apiJson(`/api/assessments/${id}`, { method: 'DELETE' })
      router.refresh()
    } catch (err) {
      setError(
        err instanceof ClientApiError && err.code === 'has_attempts'
          ? t.assessments.deleteBlocked
          : errorText(err instanceof ClientApiError ? err.code : undefined),
      )
    }
  }
  return (
    <>
      <button className="text-red-600 hover:underline" onClick={remove}>
        {t.app.delete}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </>
  )
}
