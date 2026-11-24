'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'

export function QuestionRowActions({ id }: { id: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    if (!confirm(t.app.confirmDelete)) return
    try {
      await apiJson(`/api/questions/${id}`, { method: 'DELETE' })
      router.refresh()
    } catch (err) {
      setError(
        err instanceof ClientApiError && (err.code === 'in_use' || err.code === 'duplicate')
          ? t.questions.inUse
          : errorText(err instanceof ClientApiError ? err.code : undefined),
      )
    }
  }

  return (
    <div className="space-x-3 whitespace-nowrap">
      <Link href={`/teacher/questions/${id}`} className="text-brand-600 hover:underline">
        {t.app.edit}
      </Link>
      <Link href={`/teacher/questions/new?from=${id}`} className="text-brand-600 hover:underline">
        {t.questions.duplicate}
      </Link>
      <button className="text-red-600 hover:underline" onClick={remove}>
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
