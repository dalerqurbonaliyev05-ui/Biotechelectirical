import { t } from '@/lib/i18n'

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  required?: boolean
  min?: number
  max?: number
  /** `select` uchun: qaysi jadvaldan (id, name) variantlar olinadi */
  optionsFrom?: 'faculties' | 'departments'
}

export interface ResourceDef {
  table: string
  title: string
  singular: string
  fields: FieldDef[]
}

const R = t.admin.resources

function label(res: string, key: string): string {
  return R[res]?.fields[key] ?? key
}

/** Oddiy ma'lumotnomalar (faqat admin tahrirlaydi, RLS himoyasida). */
export const RESOURCES: Record<string, ResourceDef> = {
  faculties: {
    table: 'faculties',
    title: R.faculties?.title ?? '',
    singular: R.faculties?.singular ?? '',
    fields: [{ key: 'name', label: label('faculties', 'name'), type: 'text', required: true }],
  },
  departments: {
    table: 'departments',
    title: R.departments?.title ?? '',
    singular: R.departments?.singular ?? '',
    fields: [
      { key: 'name', label: label('departments', 'name'), type: 'text', required: true },
      {
        key: 'faculty_id',
        label: label('departments', 'faculty_id'),
        type: 'select',
        required: true,
        optionsFrom: 'faculties',
      },
    ],
  },
  groups: {
    table: 'groups',
    title: R.groups?.title ?? '',
    singular: R.groups?.singular ?? '',
    fields: [
      { key: 'name', label: label('groups', 'name'), type: 'text', required: true },
      {
        key: 'department_id',
        label: label('groups', 'department_id'),
        type: 'select',
        optionsFrom: 'departments',
      },
      { key: 'course_year', label: label('groups', 'course_year'), type: 'number', min: 1, max: 8 },
    ],
  },
  subjects: {
    table: 'subjects',
    title: R.subjects?.title ?? '',
    singular: R.subjects?.singular ?? '',
    fields: [
      { key: 'name', label: label('subjects', 'name'), type: 'text', required: true },
      { key: 'code', label: label('subjects', 'code'), type: 'text' },
      {
        key: 'department_id',
        label: label('subjects', 'department_id'),
        type: 'select',
        optionsFrom: 'departments',
      },
    ],
  },
  rooms: {
    table: 'rooms',
    title: R.rooms?.title ?? '',
    singular: R.rooms?.singular ?? '',
    fields: [
      { key: 'name', label: label('rooms', 'name'), type: 'text', required: true },
      { key: 'building', label: label('rooms', 'building'), type: 'text' },
      { key: 'capacity', label: label('rooms', 'capacity'), type: 'number', min: 1, max: 5000 },
    ],
  },
}
