import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * QR davomat tokeni: `<oyna>.<imzo>`. Oyna = floor(vaqt / oyna_uzunligi). Imzo — HMAC-SHA256(sir, sessiya.oyna).
 * Token joriy yoki oldingi oynada amal qiladi (ya'ni ~1–2 oyna). Doskadagi QR har oynada yangilanadi, shuning uchun
 * QR rasmini keyinroq/boshqa joyda ishlatib bo'lmaydi.
 *
 * ESLATMA: bu faqat EHTIMOLIY signal. Auditoriyadagi do'stga rasm yuborib, shu zahoti skanerlatish mumkin.
 */
const sign = (secret: string, sessionId: string, win: number) =>
  createHmac('sha256', secret).update(`${sessionId}.${win}`).digest('base64url').slice(0, 22)

export function currentWindow(now: number, windowSec: number): number {
  return Math.floor(now / (windowSec * 1000))
}

export function makeQrToken(
  secret: string,
  sessionId: string,
  now: number,
  windowSec: number,
): string {
  const win = currentWindow(now, windowSec)
  return `${win}.${sign(secret, sessionId, win)}`
}

/** Joriy oynagacha qancha ms qolgani (doska shunga qarab yangilaydi). */
export function msUntilNextWindow(now: number, windowSec: number): number {
  const w = windowSec * 1000
  return w - (now % w)
}

export function verifyQrToken(
  secret: string,
  sessionId: string,
  token: string,
  now: number,
  windowSec: number,
): boolean {
  if (!secret || secret.length < 16) return false
  const m = /^(\d{1,12})\.([A-Za-z0-9_-]{22})$/.exec(token)
  if (!m) return false
  const win = Number(m[1])
  const cur = currentWindow(now, windowSec)
  if (win !== cur && win !== cur - 1) return false
  const expected = Buffer.from(sign(secret, sessionId, win))
  const got = Buffer.from(m[2] as string)
  return expected.length === got.length && timingSafeEqual(expected, got)
}
