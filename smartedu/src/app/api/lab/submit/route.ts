import { LAB_SIGNATURE_HEADER, verifyLabRequest } from '@/lib/lab'
import { serverEnv } from '@/lib/env'
import { ApiError, clientIp, handle, limit, ok } from '@/lib/server/api'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Tashqi laboratoriya saytidan natija qabul qilish (JAMOAT yo'li: tokensiz, lekin HMAC imzosi shart).
 * Kontrakt va namunalar: docs/lab-integration.md
 */
export const POST = handle(async (req) => {
  limit(`lab:ip:${clientIp(req)}`, 120, 60_000)
  const rawBody = await req.text() // imzo tananing AYNAN baytlariga qo'yiladi
  const v = verifyLabRequest({
    rawBody,
    signature: req.headers.get(LAB_SIGNATURE_HEADER),
    secret: serverEnv().labSharedSecret,
    now: Date.now(),
  })
  if (!v.ok) throw new ApiError(v.status, v.code)
  const p = v.payload
  limit(`lab:student:${p.student_code.toLowerCase()}`, 60, 60_000)

  const admin = createAdminClient()
  const { data: student, error: findErr } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'student')
    .eq('is_active', true)
    .ilike(
      'student_code',
      p.student_code.replace(/[%_\\]/g, (c) => `\\${c}`),
    )
    .maybeSingle()
  // DB xatosi "topilmadi" emas: laboratoriya serveri 5xx'da qayta uriniladi (nonce tufayli xavfsiz)
  if (findErr) throw findErr
  if (!student) throw new ApiError(404, 'student_not_found')

  const { data, error } = await admin
    .from('lab_results')
    .insert({
      student_id: student.id,
      lab_id: p.lab_id,
      score: p.score,
      max_score: p.max_score,
      passed: p.passed ?? null,
      details: p.details ?? null,
      lab_time: v.labTime.toISOString(),
      nonce: p.nonce,
    })
    .select('id')
    .single()
  if (error) {
    // Bir xil nonce qayta yuborilsa (tarmoq qayta urinishi): xato emas, idempotent javob
    if (error.code === '23505') return ok({ ok: true, duplicate: true })
    throw error
  }
  return ok({ ok: true, duplicate: false, id: data.id })
})
