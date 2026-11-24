'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readPdfPageCount, renderThumbnails } from '@/components/pdf-viewer'
import { ClientApiError, apiJson, errorText } from '@/lib/api-client'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/browser'

const L = t.lectures
const MAX = 50 * 1024 * 1024

export function LectureUpload({
  userId,
  subjects,
}: {
  userId: string
  subjects: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState(subjects[0]?.id ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError(null)
    if (file.size > MAX) return setError(L.tooBig)
    setBusy(true)
    let path: string | null = null
    try {
      // 1) Haqiqiy PDF ekanini va betlar sonini tekshirish (PPTX/boshqa fayl shu yerda to'xtaydi)
      let pages: number
      let buf: ArrayBuffer
      try {
        buf = await file.arrayBuffer()
        pages = await readPdfPageCount(buf.slice(0))
      } catch {
        throw new Error('not_pdf')
      }
      // 2) Storage'ga yuklash (RLS: faqat o'z papkasiga)
      const base = crypto.randomUUID()
      path = `${userId}/${base}.pdf`
      const { error: upErr } = await createClient()
        .storage.from('lectures')
        .upload(path, file, { contentType: 'application/pdf', upsert: false })
      if (upErr) throw new Error('upload')
      // 3) Slayd miniatyuralari (xato bo'lsa ma'ruza baribir yaratiladi — raqamli plitkalar bilan)
      const thumbs: (string | null)[] = []
      try {
        const blobs = await renderThumbnails(buf, {
          onProgress: (d, t) => setProgress(`${d}/${t}`),
        })
        const sb = createClient()
        for (const [i, blob] of blobs.entries()) {
          const tp = `${userId}/${base}/${i + 1}.jpg`
          const ok = blob
            ? !(
                await sb.storage
                  .from('lectures')
                  .upload(tp, blob, { contentType: 'image/jpeg', upsert: false })
              ).error
            : false
          thumbs.push(ok ? tp : null)
        }
      } catch {
        /* miniatyurasiz davom etamiz */
      }
      // 4) Ma'ruza yozuvi
      const { id } = await apiJson<{ id: string }>('/api/lectures', {
        method: 'POST',
        json: { title, subject_id: subject, pdf_path: path, page_count: pages, thumbs },
      })
      router.push(`/teacher/lectures/${id}`)
    } catch (err) {
      if (path)
        await createClient()
          .storage.from('lectures')
          .remove([path])
          .catch(() => undefined)
      if (err instanceof ClientApiError)
        setError(
          L.errors[(err as ClientApiError & { detail?: string }).detail ?? ''] ??
            errorText(err.code),
        )
      else setError(err instanceof Error && err.message === 'not_pdf' ? L.notPdf : L.uploadFailed)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label className="label" htmlFor="l-title">
          {L.fields.title}
        </label>
        <input
          id="l-title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
        />
      </div>
      <div>
        <label className="label" htmlFor="l-subject">
          {L.fields.subject}
        </label>
        <select
          id="l-subject"
          className="input"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="l-file">
          {L.fields.file}
        </label>
        <input
          id="l-file"
          type="file"
          accept="application/pdf,.pdf"
          className="input"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
        <p className="mt-1 text-xs text-slate-500">{L.maxSize}</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button className="btn-primary" disabled={busy || !file}>
        {busy ? `${L.uploading} ${progress}` : t.app.save}
      </button>
    </form>
  )
}
