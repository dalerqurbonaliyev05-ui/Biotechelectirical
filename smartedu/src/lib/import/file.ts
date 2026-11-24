import 'server-only'
import ExcelJS from 'exceljs'
import Papa from 'papaparse'

export const MAX_FILE_BYTES = 2 * 1024 * 1024

/** CSV yoki XLSX faylni "sarlavha → qiymat" yozuvlariga aylantiradi. */
export async function parseTabularFile(
  buf: Buffer,
  filename: string,
): Promise<Record<string, string>[]> {
  if (buf.byteLength > MAX_FILE_BYTES) throw new Error('file_too_large')
  const name = filename.toLowerCase()

  if (name.endsWith('.xlsx')) {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf as unknown as ArrayBuffer)
    const ws = wb.worksheets[0]
    if (!ws) return []
    const headers: string[] = []
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = cell.text?.trim() ?? ''
    })
    const out: Record<string, string>[] = []
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const rec: Record<string, string> = {}
      headers.forEach((h, idx) => {
        if (h) rec[h] = row.getCell(idx + 1).text?.trim() ?? ''
      })
      out.push(rec)
    })
    return out
  }

  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = buf.toString('utf8').replace(/^﻿/, '')
    const res = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      delimitersToGuess: [',', ';', '\t'],
    })
    return res.data
  }

  throw new Error('unsupported_format')
}
