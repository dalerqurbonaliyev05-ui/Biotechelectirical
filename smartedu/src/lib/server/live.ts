import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/lib/server/api'

export interface Participant {
  id: string
  session_id: string
  student_id: string
  join_token: string
  mode: 'auditorium' | 'remote'
}

/**
 * Talaba shu sessiyaning ishtirokchisimi va tokeni hozirgi (oxirgi qo'shilgan qurilma)mi?
 * Token mos kelmasa — talaba boshqa qurilmadan qayta qo'shilgan: eski qurilma `token_replaced` oladi.
 */
export async function requireParticipant(
  admin: SupabaseClient,
  studentId: string,
  sessionId: string,
  token: string | null,
): Promise<Participant> {
  const { data } = await admin
    .from('session_participants')
    .select('id, session_id, student_id, join_token, mode')
    .eq('session_id', sessionId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (!data) throw new ApiError(404, 'not_joined')
  if (!token || data.join_token !== token) throw new ApiError(409, 'token_replaced')
  return data as Participant
}
