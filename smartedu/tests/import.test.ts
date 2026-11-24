import { describe, expect, it } from 'vitest'
import { toCsv } from '@/lib/csv'
import { normalizeStudentRecords } from '@/lib/import/students'

describe('normalizeStudentRecords', () => {
  it('turli sarlavhalarni taniydi', () => {
    const { rows, issues } = normalizeStudentRecords([
      { Kod: 'S001', 'F.I.O.': 'Aliyev Anvar', Guruh: 'EE-21' },
      { 'talaba kodi': 'S002', fio: 'Boboyev Sardor', group: 'EE-21', parol: 'Yaxshi2026' },
    ])
    expect(issues).toEqual([])
    expect(rows).toEqual([
      { student_code: 'S001', full_name: 'Aliyev Anvar', group: 'EE-21' },
      { student_code: 'S002', full_name: 'Boboyev Sardor', group: 'EE-21', password: 'Yaxshi2026' },
    ])
  })
  it('xatolarni qator raqami bilan qaytaradi', () => {
    const { rows, issues } = normalizeStudentRecords([
      { code: 'S001', name: 'Aliyev Anvar', group: 'A' },
      { code: 'S001', name: 'Takror Kod', group: 'A' },
      { code: 'x', name: 'Qisqa Kod', group: 'A' },
      { code: 'S003', name: 'Ab', group: 'A' },
      { code: 'S004', name: 'Guruhsiz Talaba', group: '' },
      { code: '', name: '', group: '' },
    ])
    expect(rows).toHaveLength(1)
    expect(issues.map((i) => [i.row, i.message])).toEqual([
      [3, 'duplicate_in_file'],
      [4, 'invalid_code'],
      [5, 'invalid_name'],
      [6, 'missing_group'],
    ])
  })
  it('kodlar katta-kichik harfga qaramay takror hisoblanadi', () => {
    const { issues } = normalizeStudentRecords([
      { code: 'S001', name: 'Aliyev Anvar', group: 'A' },
      { code: 's001', name: 'Boboyev Sardor', group: 'A' },
    ])
    expect(issues).toHaveLength(1)
  })
})

describe('toCsv', () => {
  it('maxsus belgilarni qochiradi va BOM qo‘shadi', () => {
    const csv = toCsv([
      ['a', 'b,c', 'd"e'],
      [1, null, true],
    ])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('a,"b,c","d""e"')
    expect(csv).toContain('1,,true')
  })
  it('formula inyeksiyasidan himoya qiladi', () => {
    const csv = toCsv([['=HYPERLINK("x")', '+1', '-2', '@x', 'oddiy']], { bom: false })
    expect(csv).toBe(`"'=HYPERLINK(""x"")",'+1,'-2,'@x,oddiy\r\n`)
  })
})
