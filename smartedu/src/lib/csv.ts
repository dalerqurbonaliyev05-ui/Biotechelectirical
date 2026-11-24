/**
 * CSV yaratish. Excel formula inyeksiyasidan himoya: =, +, -, @ bilan boshlangan matn oldiga `'` qo'yiladi.
 * UTF-8 BOM qo'shiladi — Excel o'zbekcha harflarni to'g'ri ochadi.
 */
export type Cell = string | number | boolean | null | undefined

function esc(v: Cell): string {
  if (v === null || v === undefined) return ''
  let s = String(v)
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: Cell[][], opts: { bom?: boolean } = {}): string {
  const body = rows.map((r) => r.map(esc).join(',')).join('\r\n')
  return (opts.bom === false ? '' : '﻿') + body + '\r\n'
}
