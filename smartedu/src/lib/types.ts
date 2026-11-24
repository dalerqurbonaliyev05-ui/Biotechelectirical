export type Role = 'admin' | 'teacher' | 'student'

export interface SessionProfile {
  id: string
  role: Role
  full_name: string
  student_code: string | null
  group_id: string | null
  must_change_password: boolean
  is_active: boolean
}

export const ROLE_HOME: Record<Role, string> = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
}
