import { isValidStudentCode } from '@/lib/auth/identifier'

export interface StudentRow {
  student_code: string
  full_name: string
  group: string
  password?: string
}
export interface RowIssue {
  row: number
  message: string
}

// Fayl sarlavhalari turlicha yozilishi mumkin — bir xil kalitga keltiramiz.
const ALIASES: Record<string, keyof StudentRow> = {
  student_code: 'student_code',
  studentcode: 'student_code',
  code: 'student_code',
  kod: 'student_code',
  'talaba kodi': 'student_code',
  talaba_kodi: 'student_code',
  login: 'student_code',
  id: 'student_code',
  full_name: 'full_name',
  fullname: 'full_name',
  name: 'full_name',
  fio: 'full_name',
  'f.i.o.': 'full_name',
  'f.i.o': 'full_name',
  fish: 'full_name',
  ism: 'full_name',
  'ism familiya': 'full_name',
  'ism, familiya': 'full_name',
  group: 'group',
  guruh: 'group',
  password: 'password',
  parol: 'password',
}

export function normalizeHeader(h: string): string {
  return h
    .replace(/^﻿/, '')
    .toLowerCase()
    .replace(/[’'`ʻʼ]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export const MAX_IMPORT_ROWS = 2000

/** Xom yozuvlarni (fayldan) tekshiradi. Qator raqami fayldagi (1-qator = sarlavha) bilan mos. */
export function normalizeStudentRecords(records: Record<string, unknown>[]): {
  rows: StudentRow[]
  issues: RowIssue[]
} {
  const rows: StudentRow[] = []
  const issues: RowIssue[] = []
  const seen = new Set<string>()

  records.slice(0, MAX_IMPORT_ROWS).forEach((rec, i) => {
    const rowNo = i + 2
    const mapped: Partial<Record<keyof StudentRow, string>> = {}
    for (const [k, v] of Object.entries(rec)) {
      const key = ALIASES[normalizeHeader(k)]
      if (key && v != null) mapped[key] = String(v).trim()
    }
    // Butunlay bo'sh qatorni jimgina o'tkazib yuboramiz
    if (!mapped.student_code && !mapped.full_name && !mapped.group) return

    const code = mapped.student_code ?? ''
    if (!isValidStudentCode(code)) {
      issues.push({ row: rowNo, message: 'invalid_code' })
      return
    }
    if (!mapped.full_name || mapped.full_name.length < 3) {
      issues.push({ row: rowNo, message: 'invalid_name' })
      return
    }
    if (!mapped.group) {
      issues.push({ row: rowNo, message: 'missing_group' })
      return
    }
    const lower = code.toLowerCase()
    if (seen.has(lower)) {
      issues.push({ row: rowNo, message: 'duplicate_in_file' })
      return
    }
    seen.add(lower)
    const row: StudentRow = { student_code: code, full_name: mapped.full_name, group: mapped.group }
    if (mapped.password) row.password = mapped.password
    rows.push(row)
  })

  if (records.length > MAX_IMPORT_ROWS)
    issues.push({ row: MAX_IMPORT_ROWS + 2, message: 'too_many_rows' })
  return { rows, issues }
}
