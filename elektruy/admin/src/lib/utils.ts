import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const LANGS = ['uz', 'ru', 'en'] as const
export type Lang = (typeof LANGS)[number]

export function fmtDate(v: string | null | undefined) {
  if (!v) return '—'
  return new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** RFC 4180 CSV with a BOM so Excel opens Cyrillic / Uzbek text correctly. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))))
  const cell = (v: unknown) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
