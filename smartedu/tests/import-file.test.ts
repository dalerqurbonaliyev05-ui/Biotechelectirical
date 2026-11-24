import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { parseTabularFile } from '@/lib/import/file'
import { normalizeStudentRecords } from '@/lib/import/students'

describe('parseTabularFile', () => {
  it('CSV (BOM, nuqtali vergul) ni o‘qiydi', async () => {
    const csv = '﻿kod;F.I.O.;guruh\nS001;Aliyev Anvar;EE-21\nS002;Boboyev Sardor;EE-21\n'
    const rec = await parseTabularFile(Buffer.from(csv, 'utf8'), 'talabalar.csv')
    const { rows, issues } = normalizeStudentRecords(rec)
    expect(issues).toEqual([])
    expect(rows.map((r) => r.student_code)).toEqual(['S001', 'S002'])
  })

  it('XLSX ni o‘qiydi', async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Talabalar')
    ws.addRow(['student_code', 'full_name', 'group'])
    ws.addRow(['S010', 'Karimova Malika', 'EE-21'])
    const buf = Buffer.from(await wb.xlsx.writeBuffer())
    const { rows } = normalizeStudentRecords(await parseTabularFile(buf, 'a.xlsx'))
    expect(rows).toEqual([{ student_code: 'S010', full_name: 'Karimova Malika', group: 'EE-21' }])
  })

  it('noma’lum format va katta faylni rad etadi', async () => {
    await expect(parseTabularFile(Buffer.from('x'), 'a.pdf')).rejects.toThrow('unsupported_format')
    await expect(parseTabularFile(Buffer.alloc(3 * 1024 * 1024), 'a.csv')).rejects.toThrow(
      'file_too_large',
    )
  })
})
