/**
 * Talaba "talaba kodi + parol" bilan kiradi; ichkarida sintetik email ishlatiladi
 * (Supabase Auth email talab qiladi). O'qituvchi/admin oddiy email bilan kiradi.
 */
const STUDENT_CODE_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/

export function normalizeStudentCode(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isValidStudentCode(raw: string): boolean {
  return STUDENT_CODE_RE.test(normalizeStudentCode(raw))
}

export function studentEmail(code: string, domain: string): string {
  return `${normalizeStudentCode(code)}@${domain.toLowerCase()}`
}

/** "S001" → s001@domain;  "ali@mail.uz" → o'zgarishsiz (kichik harf). */
export function identifierToEmail(identifier: string, domain: string): string | null {
  const v = identifier.trim()
  if (!v) return null
  if (v.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v.toLowerCase() : null
  return isValidStudentCode(v) ? studentEmail(v, domain) : null
}
