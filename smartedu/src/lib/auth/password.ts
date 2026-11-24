import { randomInt } from 'node:crypto'

// O'xshash belgilar (0/O, 1/l/I) olib tashlangan — vaqtinchalik parol qog'ozda uzatiladi.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

export function generateTempPassword(length = 10): string {
  let out = ''
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  // Kamida bitta raqam va harf bo'lsin
  return /\d/.test(out) && /[A-Za-z]/.test(out) ? out : generateTempPassword(length)
}

export interface PasswordCheck {
  ok: boolean
  /** uz.ts dagi `auth.passwordErrors` kaliti */
  error?: 'short' | 'long' | 'weak' | 'sameAsCode'
}

export function validateNewPassword(password: string, studentCode?: string | null): PasswordCheck {
  if (password.length < 8) return { ok: false, error: 'short' }
  if (password.length > 72) return { ok: false, error: 'long' } // bcrypt chegarasi
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return { ok: false, error: 'weak' }
  if (studentCode && password.toLowerCase() === studentCode.toLowerCase()) {
    return { ok: false, error: 'sameAsCode' }
  }
  return { ok: true }
}
