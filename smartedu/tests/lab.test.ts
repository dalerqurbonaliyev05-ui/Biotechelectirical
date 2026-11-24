import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { LAB_MAX_SKEW_MS, signLabBody, verifyLabRequest } from '@/lib/lab'

const secret = 'lab-shared-secret-at-least-16'
const now = Date.parse('2026-03-01T10:00:00Z')
const payload = {
  student_code: 'S001',
  lab_id: 'motor-01',
  score: 8,
  max_score: 10,
  passed: true,
  time: '2026-03-01T09:59:30Z',
  nonce: 'abcDEF123456',
}
const body = JSON.stringify(payload)
const sign = (b: string, s = secret) => signLabBody(s, b)
const verify = (over: Partial<Parameters<typeof verifyLabRequest>[0]> = {}) =>
  verifyLabRequest({ rawBody: body, signature: sign(body), secret, now, ...over })

describe('verifyLabRequest', () => {
  it('to‘g‘ri imzolangan so‘rov qabul qilinadi', () => {
    const r = verify()
    expect(r.ok).toBe(true)
    if (r.ok)
      expect(r.payload).toMatchObject({
        student_code: 'S001',
        lab_id: 'motor-01',
        score: 8,
        max_score: 10,
      })
  })
  it('imzo mustaqil hisoblangan HMAC-SHA256 (hex) bilan mos (test vektori)', () => {
    const independent = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
    expect(sign(body)).toBe(independent)
    expect(independent).toMatch(/^sha256=[0-9a-f]{64}$/)
  })
  it('imzosiz / noto‘g‘ri imzo / boshqa kalit — 401', () => {
    for (const signature of [
      null,
      '',
      'sha256=' + '0'.repeat(64),
      sign(body, 'boshqa-kalit-boshqa-kalit'),
      sign(body).slice(0, -2) + 'zz',
      sign(body).replace('sha256=', ''),
    ]) {
      expect(verify({ signature })).toMatchObject({ ok: false, status: 401, code: 'bad_signature' })
    }
  })
  it('tana o‘zgartirilsa (ballni oshirish) imzo mos kelmaydi', () => {
    const tampered = body.replace('"score":8', '"score":10')
    expect(verify({ rawBody: tampered, signature: sign(body) })).toMatchObject({
      ok: false,
      status: 401,
    })
  })
  it('bo‘shliq/tartib farqi ham imzoni buzadi (aynan bir xil baytlar kerak)', () => {
    expect(verify({ rawBody: body + ' ', signature: sign(body) })).toMatchObject({
      ok: false,
      status: 401,
    })
  })
  it('sir sozlanmagan yoki qisqa — 503 (fail-closed)', () => {
    expect(verify({ secret: '' })).toMatchObject({ ok: false, status: 503, code: 'not_configured' })
    expect(verify({ secret: 'short' })).toMatchObject({ ok: false, status: 503 })
  })
  it('vaqt oynasi: ±5 daqiqa', () => {
    const at = (ms: number) => {
      const b = JSON.stringify({ ...payload, time: now + ms })
      return verify({ rawBody: b, signature: sign(b) })
    }
    expect(at(0).ok).toBe(true)
    expect(at(-LAB_MAX_SKEW_MS).ok).toBe(true)
    expect(at(LAB_MAX_SKEW_MS).ok).toBe(true)
    expect(at(-LAB_MAX_SKEW_MS - 1)).toMatchObject({ ok: false, code: 'stale' })
    expect(at(LAB_MAX_SKEW_MS + 1)).toMatchObject({ ok: false, code: 'stale' })
  })
  it.each([
    ['score > max_score', { score: 11 }],
    ['manfiy ball', { score: -1 }],
    ['max_score = 0', { max_score: 0 }],
    ['NaN o‘rniga satr', { score: 'x' }],
    ['lab_id traversal', { lab_id: '../etc' }],
    ['qisqa nonce', { nonce: 'abc' }],
    ['nonce belgilar', { nonce: 'abc def ghi!!' }],
    ['talaba kodi yo‘q', { student_code: '' }],
    ['vaqt formati', { time: 'kecha' }],
  ])('validatsiya: %s', (_n, patch) => {
    const b = JSON.stringify({ ...payload, ...patch })
    expect(verify({ rawBody: b, signature: sign(b) })).toMatchObject({
      ok: false,
      status: 400,
      code: 'validation',
    })
  })
  it('imzolangan, lekin JSON emas — bad_json', () => {
    const b = 'not json'
    expect(verify({ rawBody: b, signature: sign(b) })).toMatchObject({
      ok: false,
      code: 'bad_json',
    })
  })
  it('juda katta tana — 413 (imzodan oldin)', () => {
    const b = JSON.stringify({ ...payload, details: { x: 'a'.repeat(9000) } })
    expect(verify({ rawBody: b, signature: sign(b) })).toMatchObject({ ok: false, status: 413 })
  })
  it('epoch millisekund vaqt ham qabul qilinadi', () => {
    const b = JSON.stringify({ ...payload, time: now - 1000 })
    expect(verify({ rawBody: b, signature: sign(b) }).ok).toBe(true)
  })
})
