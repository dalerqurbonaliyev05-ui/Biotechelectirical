import { describe, expect, it } from 'vitest'
import { identifierToEmail, isValidStudentCode } from '@/lib/auth/identifier'
import { generateTempPassword, validateNewPassword } from '@/lib/auth/password'

describe('identifierToEmail', () => {
  const d = 'students.smartedu.example'
  it('talaba kodini sintetik emailga aylantiradi (katta-kichik harfsiz)', () => {
    expect(identifierToEmail('S001', d)).toBe('s001@students.smartedu.example')
    expect(identifierToEmail('  s001 ', d)).toBe('s001@students.smartedu.example')
  })
  it('oddiy emailni o‘zgartirmaydi', () => {
    expect(identifierToEmail('Ali@Mail.uz', d)).toBe('ali@mail.uz')
  })
  it('noto‘g‘ri kirishni rad etadi', () => {
    expect(identifierToEmail('', d)).toBeNull()
    expect(identifierToEmail('ab', d)).toBeNull()
    expect(identifierToEmail('bad@', d)).toBeNull()
    expect(identifierToEmail('a b c', d)).toBeNull()
    expect(identifierToEmail('../x', d)).toBeNull()
  })
  it('kod qoidasi', () => {
    expect(isValidStudentCode('S001')).toBe(true)
    expect(isValidStudentCode('12.34-ab_c')).toBe(true)
    expect(isValidStudentCode('x'.repeat(33))).toBe(false)
  })
})

describe('parol', () => {
  it('vaqtinchalik parol: uzunlik, harf+raqam, har safar boshqa', () => {
    const set = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const p = generateTempPassword()
      expect(p).toHaveLength(10)
      expect(p).toMatch(/[A-Za-z]/)
      expect(p).toMatch(/\d/)
      expect(p).not.toMatch(/[0OIl1]/)
      set.add(p)
    }
    expect(set.size).toBeGreaterThan(190)
  })
  it('yangi parol qoidalari', () => {
    expect(validateNewPassword('abc123')).toEqual({ ok: false, error: 'short' })
    expect(validateNewPassword('abcdefgh')).toEqual({ ok: false, error: 'weak' })
    expect(validateNewPassword('12345678')).toEqual({ ok: false, error: 'weak' })
    expect(validateNewPassword('x'.repeat(80) + '1')).toEqual({ ok: false, error: 'long' })
    expect(validateNewPassword('S0010000', 's0010000')).toEqual({ ok: false, error: 'sameAsCode' })
    expect(validateNewPassword('Yaxshi2026')).toEqual({ ok: true })
  })
})
