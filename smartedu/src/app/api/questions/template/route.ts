import { questionCsvTemplate } from '@/lib/assessment/csv-import'
import { handle, requireUser } from '@/lib/server/api'

export const GET = handle(async () => {
  await requireUser(['teacher', 'admin'])
  return new Response(questionCsvTemplate(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="savollar-namuna.csv"',
    },
  })
})
