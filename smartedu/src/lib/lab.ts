import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

/**
 * Tashqi laboratoriya sayti bilan kontrakt (docs/lab-integration.md).
 *  - So'rov: POST /api/lab/submit, JSON tana + sarlavha `X-Signature: sha256=<hex>`.
 *  - Imzo: HMAC-SHA256(LAB_SHARED_SECRET, TANANING AYNAN BAYTLARI) — shuning uchun server tanani xom matn sifatida o'qiydi.
 *  - Replay himoyasi: `time` ±5 daqiqa ichida bo'lishi shart + `nonce` bir marta (DB unique).
 */
export const LAB_SIGNATURE_HEADER = 'x-signature'
export const LAB_MAX_SKEW_MS = 5 * 60 * 1000
export const LAB_MAX_BODY_BYTES = 8 * 1024

export const labPayloadSchema = z
  .object({
    student_code: z.string().trim().min(3).max(32),
    lab_id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/),
    score: z.number().finite().min(0).max(100_000),
    max_score: z.number().finite().positive().max(100_000),
    passed: z.boolean().optional(),
    /** ISO 8601 (zona bilan) yoki epoch millisekund */
    time: z.union([z.iso.datetime({ offset: true }), z.number().int().positive()]),
    nonce: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((p) => p.score <= p.max_score, { message: 'score_gt_max' })

export type LabPayload = z.infer<typeof labPayloadSchema>

export function signLabBody(secret: string, rawBody: string): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`
}

export type LabVerify =
  | { ok: true; payload: LabPayload; labTime: Date }
  | {
      ok: false
      status: number
      code: 'not_configured' | 'too_large' | 'bad_signature' | 'bad_json' | 'validation' | 'stale'
    }

export function verifyLabRequest(input: {
  rawBody: string
  signature: string | null
  secret: string
  now: number
}): LabVerify {
  if (input.secret.length < 16) return { ok: false, status: 503, code: 'not_configured' } // fail-closed
  if (Buffer.byteLength(input.rawBody, 'utf8') > LAB_MAX_BODY_BYTES)
    return { ok: false, status: 413, code: 'too_large' }

  const expected = Buffer.from(signLabBody(input.secret, input.rawBody))
  const got = Buffer.from(input.signature ?? '')
  // Imzo JSON tahlilidan OLDIN tekshiriladi: imzosiz tana hech qachon ishlanmaydi
  if (expected.length !== got.length || !timingSafeEqual(expected, got))
    return { ok: false, status: 401, code: 'bad_signature' }

  let json: unknown
  try {
    json = JSON.parse(input.rawBody)
  } catch {
    return { ok: false, status: 400, code: 'bad_json' }
  }
  const parsed = labPayloadSchema.safeParse(json)
  if (!parsed.success) return { ok: false, status: 400, code: 'validation' }

  const labTime = new Date(parsed.data.time)
  if (Number.isNaN(labTime.getTime()) || Math.abs(input.now - labTime.getTime()) > LAB_MAX_SKEW_MS)
    return { ok: false, status: 400, code: 'stale' }
  return { ok: true, payload: parsed.data, labTime }
}
