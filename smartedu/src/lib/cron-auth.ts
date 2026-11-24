import { timingSafeEqual } from 'node:crypto'

/**
 * Cron so'rovi tekshiruvi: `Authorization: Bearer <CRON_SECRET>` (Vercel Cron buni avtomatik yuboradi;
 * GitHub Actions'da qo'lda qo'yiladi). Sir yo'q/qisqa bo'lsa HECH KIM o'ta olmaydi (fail-closed).
 */
export function verifyCronAuth(header: string | null, secret: string): boolean {
  if (secret.length < 16 || !header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const got = Buffer.from(header)
  return expected.length === got.length && timingSafeEqual(expected, got)
}
