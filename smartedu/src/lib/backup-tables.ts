/**
 * Zaxira/eksport (admin): asosiy jadvallarni CSV ga yuklab olish. Har bir public jadval YOKI shu yerda,
 * YOKI `BACKUP_EXCLUDED` da sababi bilan turishi shart (tests/backup.test.ts migratsiyalarni o'qib tekshiradi —
 * yangi jadval qo'shilsa va bu yerga yozilmasa, test yiqiladi).
 */
export interface BackupTable {
  table: string
  /** Barqaror tartib (sahifalash uchun) */
  order: string[]
  /** Eksportga CHIQARILMAYDIGAN ustunlar (maxfiy) */
  omit?: string[]
}

export const BACKUP_TABLES: BackupTable[] = [
  { table: 'faculties', order: ['id'] },
  { table: 'departments', order: ['id'] },
  { table: 'groups', order: ['id'] },
  { table: 'subjects', order: ['id'] },
  { table: 'rooms', order: ['id'] },
  { table: 'profiles', order: ['id'] },
  { table: 'teacher_subjects', order: ['teacher_id', 'subject_id', 'group_id'] },
  { table: 'app_settings', order: ['key'] },
  { table: 'questions', order: ['id'] },
  { table: 'question_keys', order: ['question_id'] },
  { table: 'assessments', order: ['id'] },
  { table: 'assessment_questions', order: ['assessment_id', 'question_id'] },
  { table: 'attempts', order: ['id'] },
  { table: 'answers', order: ['id'] },
  { table: 'audit_log', order: ['id'] },
  { table: 'lectures', order: ['id'] },
  { table: 'lecture_questions', order: ['id'] },
  { table: 'lecture_slides', order: ['lecture_id', 'slide_no'] },
  { table: 'lecture_checkpoints', order: ['id'] },
  { table: 'slide_books', order: ['id'] },
  { table: 'lecture_sessions', order: ['id'] },
  // join_token — faol qurilma sirli tokeni: zaxiraga CHIQMAYDI
  { table: 'session_participants', order: ['id'], omit: ['join_token'] },
  { table: 'attendance', order: ['session_id', 'student_id'] },
  { table: 'session_reactions', order: ['session_id', 'student_id', 'slide_no', 'kind'] },
  { table: 'session_questions', order: ['id'] },
  { table: 'session_answers', order: ['id'] },
  { table: 'scores', order: ['session_id', 'student_id'] },
  { table: 'lab_results', order: ['id'] },
]

/** Eksport qilinmaydigan jadvallar (sababi bilan). Hozircha bo'sh: hammasi eksport qilinadi. */
export const BACKUP_EXCLUDED: Record<string, string> = {}

export function findBackupTable(name: string): BackupTable | undefined {
  return BACKUP_TABLES.find((t) => t.table === name)
}
