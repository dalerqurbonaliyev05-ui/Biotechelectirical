import { describe, expect, it } from 'vitest'
import { evaluate, identifiersIn } from '@/lib/assessment/expr'
import { hashSeed, mulberry32, rngFor, seededShuffle } from '@/lib/assessment/prng'
import { parseUnit, unitChoices } from '@/lib/assessment/units'

describe('prng', () => {
  it('bir xil urug‘ → bir xil ketma-ketlik; boshqa urug‘ → boshqa', () => {
    const a = mulberry32(hashSeed('x')),
      b = mulberry32(hashSeed('x')),
      c = mulberry32(hashSeed('y'))
    const sa = [a(), a(), a()],
      sb = [b(), b(), b()],
      sc = [c(), c(), c()]
    expect(sa).toEqual(sb)
    expect(sa).not.toEqual(sc)
    for (const v of sa) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  it('shuffle: ruxsat etilgan almashtirish, deterministik, asl massivni o‘zgartirmaydi', () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8]
    const s1 = seededShuffle(src, rngFor('k'))
    expect([...s1].sort()).toEqual(src)
    expect(seededShuffle(src, rngFor('k'))).toEqual(s1)
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})

describe('expr (xavfsiz hisoblagich)', () => {
  it('amallar ustuvorligi va qavslar', () => {
    expect(evaluate('2 + 3 * 4')).toBe(14)
    expect(evaluate('(2 + 3) * 4')).toBe(20)
    expect(evaluate('10 / 4')).toBe(2.5)
    expect(evaluate('-2^2')).toBe(-4)
    expect(evaluate('2^3^2')).toBe(512)
    expect(evaluate('2 * -3')).toBe(-6)
    expect(evaluate('1e3 + .5')).toBe(1000.5)
  })
  it('o‘zgaruvchilar, funksiyalar, konstantalar (elektr misollari)', () => {
    expect(evaluate('U / R', { U: 12, R: 4 })).toBe(3)
    expect(evaluate('sqrt(P * R)', { P: 100, R: 4 })).toBe(20)
    expect(evaluate('U^2 / (R1 + R2)', { U: 10, R1: 2, R2: 3 })).toBe(20)
    expect(evaluate('max(a, b) - min(a, b)', { a: 7, b: 3 })).toBe(4)
    expect(evaluate('2 * pi')).toBeCloseTo(6.283185, 5)
  })
  it('xatolarni rad etadi', () => {
    expect(() => evaluate('U / 0', { U: 1 })).toThrow('expr_not_finite')
    expect(() => evaluate('X + 1')).toThrow('expr_unknown_name')
    expect(() => evaluate('2 +')).toThrow()
    expect(() => evaluate('(2 + 3')).toThrow('expr_paren')
    expect(() => evaluate('2 3')).toThrow('expr_unexpected')
    expect(() => evaluate('1'.repeat(400))).toThrow('expr_too_long')
  })
  it('kod bajarishga urinishlar ishlamaydi', () => {
    for (const evil of [
      'constructor',
      '__proto__',
      'process.exit()',
      'a.b',
      'toString',
      'hasOwnProperty',
      '"x"',
      'alert(1)',
      'import("fs")',
    ]) {
      expect(() => evaluate(evil, {})).toThrow()
    }
    // prototip nomlari o'zgaruvchi sifatida topilmasligi kerak
    expect(() => evaluate('constructor + 1', {})).toThrow('expr_unknown_name')
  })
  it('identifiersIn funksiya/konstantalarsiz nomlarni qaytaradi', () => {
    expect(identifiersIn('sqrt(P * R) + pi * x').sort()).toEqual(['P', 'R', 'x'])
  })
})

describe('units', () => {
  it('qo‘shimchali birliklar', () => {
    expect(parseUnit('A')).toEqual({ base: 'A', factor: 1 })
    expect(parseUnit('mA')).toEqual({ base: 'A', factor: 1e-3 })
    expect(parseUnit('kV')).toEqual({ base: 'V', factor: 1e3 })
    expect(parseUnit('MW')).toEqual({ base: 'W', factor: 1e6 })
    expect(parseUnit('mW')).toEqual({ base: 'W', factor: 1e-3 })
    expect(parseUnit('kVA')).toEqual({ base: 'VA', factor: 1e3 })
    expect(parseUnit('kvar')).toEqual({ base: 'var', factor: 1e3 })
    expect(parseUnit('Ω')).toEqual({ base: 'Ω', factor: 1 })
    expect(parseUnit('kOhm')?.factor).toBe(1e3)
    expect(parseUnit('ohm')).toEqual({ base: 'Ω', factor: 1 })
    expect(parseUnit('µF')).toEqual({ base: 'F', factor: 1e-6 })
  })
  it('noma’lum birlik rad etiladi', () => {
    expect(parseUnit('xyz')).toBeNull()
    expect(parseUnit('qA')).toBeNull()
    expect(parseUnit('')).toBeNull()
  })
  it('tanlov ro‘yxati kichikdan kattagacha', () => {
    expect(unitChoices('A')).toEqual(['µA', 'mA', 'A', 'kA', 'MA'])
  })
})
