import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { BACKUP_EXCLUDED, BACKUP_TABLES, findBackupTable } from '@/lib/backup-tables'

const dir = path.resolve(__dirname, '../supabase/migrations')
const sql = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(path.join(dir, f), 'utf8'))
  .join('\n')
const created = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1] as string)

describe('zaxira eksporti', () => {
  it('migratsiyalardagi HAR BIR jadval eksportda yoki sababi bilan istisnoda', () => {
    expect(created.length).toBeGreaterThan(15)
    const missing = created.filter((t) => !findBackupTable(t) && !(t in BACKUP_EXCLUDED))
    expect(missing).toEqual([])
  })
  it('ro‘yxatda mavjud bo‘lmagan jadval yo‘q va takror yo‘q', () => {
    const names = BACKUP_TABLES.map((t) => t.table)
    expect(new Set(names).size).toBe(names.length)
    expect(names.filter((n) => !created.includes(n))).toEqual([])
  })
  it('maxfiy ustunlar chiqarilmaydi', () => {
    expect(findBackupTable('session_participants')?.omit).toContain('join_token')
  })
  it('har bir jadval uchun barqaror tartib ko‘rsatilgan', () => {
    for (const t of BACKUP_TABLES) expect(t.order.length).toBeGreaterThan(0)
  })
  it('ruxsat etilmagan jadval nomi topilmaydi (kirish whitelist orqali)', () => {
    expect(findBackupTable('auth.users')).toBeUndefined()
    expect(findBackupTable('profiles; drop table x')).toBeUndefined()
  })
})
