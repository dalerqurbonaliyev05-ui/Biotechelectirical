import { normalizeStudentRecords } from '@/lib/import/students'
import { parseTabularFile } from '@/lib/import/file'
import { ApiError, handle, limit, ok, requireUser } from '@/lib/server/api'

/** Faylni (CSV/XLSX) o'qib, tekshirilgan qatorlarni qaytaradi. Hech narsa saqlanmaydi. */
export const POST = handle(async (req) => {
  const { profile } = await requireUser(['admin'])
  limit(`import-parse:${profile.id}`, 20, 60_000)

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) throw new ApiError(400, 'validation')

  let records
  try {
    records = await parseTabularFile(Buffer.from(await file.arrayBuffer()), file.name)
  } catch (err) {
    const code =
      err instanceof Error && ['file_too_large', 'unsupported_format'].includes(err.message)
        ? err.message
        : 'validation'
    throw new ApiError(400, code)
  }
  return ok(normalizeStudentRecords(records))
})
