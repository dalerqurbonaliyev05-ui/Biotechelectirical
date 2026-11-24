import { z } from 'zod'
import { handle, limit, ok, readJson, requireUser } from '@/lib/server/api'
import { importStudents } from '@/lib/server/accounts'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  // Vercel funksiya vaqti cheklangan: mijoz qatorlarni 20 tadan bo'laklab yuboradi.
  rows: z
    .array(
      z.object({
        student_code: z.string().min(3).max(32),
        full_name: z.string().min(3).max(200),
        group: z.string().min(1).max(100),
        password: z.string().min(8).max(72).optional(),
      }),
    )
    .min(1)
    .max(50),
  createMissingGroups: z.boolean().default(true),
  startRow: z.number().int().min(2).default(2),
})

export const POST = handle(async (req) => {
  const { profile } = await requireUser(['admin'])
  limit(`import:${profile.id}`, 120, 60_000)
  const body = await readJson(req, schema)
  const results = await importStudents(createAdminClient(), body.rows, {
    createMissingGroups: body.createMissingGroups,
    startRow: body.startRow,
  })
  return ok({ results })
})
