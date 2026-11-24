import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PersonName {
  full_name: string
  student_code: string | null
  isGuest: boolean
}

/**
 * Sessiya ishtirokchilari ismlari: ro'yxatdagi talaba — profiles'dan, mehmon — `guest_name` dan.
 * (session_participants → profiles embed'i ISHLATILMAYDI: `student_id` endi auth.users'ga ishora qiladi.)
 * Uzun `in(...)` ro'yxati URL'ni buzmasin: 80 tadan bo'laklab so'raladi.
 */
export async function participantNames(
  db: SupabaseClient,
  sessionId: string,
  userIds?: string[],
): Promise<Map<string, PersonName>> {
  const out = new Map<string, PersonName>()
  const { data: parts } = await db
    .from('session_participants')
    .select('student_id, is_guest, guest_name')
    .eq('session_id', sessionId)
    .limit(2000)
  const ids = new Set(userIds ?? (parts ?? []).map((p) => p.student_id as string))
  const guests = new Map(
    (parts ?? [])
      .filter((p) => p.is_guest)
      .map((p) => [p.student_id as string, String(p.guest_name ?? '')]),
  )
  const real = [...ids].filter((id) => !guests.has(id))
  for (let i = 0; i < real.length; i += 80) {
    const { data } = await db
      .from('profiles')
      .select('id, full_name, student_code')
      .in('id', real.slice(i, i + 80))
    for (const p of data ?? [])
      out.set(p.id as string, {
        full_name: String(p.full_name),
        student_code: (p.student_code as string | null) ?? null,
        isGuest: false,
      })
  }
  for (const id of ids)
    if (guests.has(id))
      out.set(id, { full_name: guests.get(id) as string, student_code: null, isGuest: true })
  return out
}
