import { describe, expect, it } from 'vitest'
import {
  currentWindow,
  makeQrToken,
  msUntilNextWindow,
  verifyQrToken,
} from '@/lib/attendance-token'

const secret = 'test-secret-which-is-long-enough'
const sid = '00000000-0000-0000-0000-0000000005a1'
const W = 45
const t0 = 1_800_000_000_000

describe('QR davomat tokeni', () => {
  it('shu oynada yaroqli', () => {
    const tok = makeQrToken(secret, sid, t0, W)
    expect(verifyQrToken(secret, sid, tok, t0, W)).toBe(true)
    expect(verifyQrToken(secret, sid, tok, t0 + 10_000, W)).toBe(true)
  })
  it('keyingi oynada ham (chegarada skanerlagan talaba jazolanmasin), undan keyin — yo‘q', () => {
    const tok = makeQrToken(secret, sid, t0, W)
    expect(verifyQrToken(secret, sid, tok, t0 + W * 1000, W)).toBe(true)
    expect(verifyQrToken(secret, sid, tok, t0 + W * 2000 + 1000, W)).toBe(false)
  })
  it('kelajakdagi (oldindan yasalgan) token yaroqsiz', () => {
    const future = makeQrToken(secret, sid, t0 + W * 3000, W)
    expect(verifyQrToken(secret, sid, future, t0, W)).toBe(false)
  })
  it('boshqa sessiya, boshqa sir, buzilgan imzo — yaroqsiz', () => {
    const tok = makeQrToken(secret, sid, t0, W)
    expect(verifyQrToken(secret, '00000000-0000-0000-0000-0000000005a2', tok, t0, W)).toBe(false)
    expect(verifyQrToken('boshqa-sir-boshqa-sir-boshqa', sid, tok, t0, W)).toBe(false)
    const [win, sig] = tok.split('.') as [string, string]
    expect(verifyQrToken(secret, sid, `${win}.${sig.slice(0, -1)}A`, t0, W)).toBe(false)
    expect(verifyQrToken(secret, sid, `${Number(win) - 1}.${sig}`, t0, W)).toBe(false)
  })
  it('axlat/yaroqsiz format va sir yo‘q (fail-closed)', () => {
    for (const bad of ['', 'abc', '1.2', '../..', `${currentWindow(t0, W)}.`])
      expect(verifyQrToken(secret, sid, bad, t0, W)).toBe(false)
    const tok = makeQrToken(secret, sid, t0, W)
    expect(verifyQrToken('', sid, tok, t0, W)).toBe(false)
    expect(verifyQrToken('short', sid, tok, t0, W)).toBe(false)
  })
  it('keyingi oynagacha qolgan vaqt', () => {
    expect(msUntilNextWindow(0, 45)).toBe(45_000)
    expect(msUntilNextWindow(44_000, 45)).toBe(1_000)
  })
})
