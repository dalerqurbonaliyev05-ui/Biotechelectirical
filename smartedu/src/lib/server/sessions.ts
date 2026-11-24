import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/lib/server/api'
import type { SessionState } from '@/lib/session-state'
import type { SessionProfile } from '@/lib/types'

export interface SessionRow {
  id: string
  lecture_id: string
  created_by: string
  group_id: string | null
  code: string
  status: 'active' | 'ended'
  current_slide: number
  rev: number
}

/**
 * Sessiyani boshqarish huquqi: yaratuvchi o'qituvchi yoki admin. `userClient` — RLS ostida,
 * shuning uchun boshqa o'qituvchining sessiyasi umuman ko'rinmaydi (404).
 */
export async function findControlledSession(
  userClient: SupabaseClient,
  profile: SessionProfile,
  id: string,
): Promise<SessionRow | null> {
  const { data } = await userClient
    .from('lecture_sessions')
    .select('id, lecture_id, created_by, group_id, code, status, current_slide, rev')
    .eq('id', id)
    .maybeSingle()
  const row = data as SessionRow | null
  if (!row || (profile.role !== 'admin' && row.created_by !== profile.id)) return null
  return row
}

export async function getControlledSession(
  userClient: SupabaseClient,
  profile: SessionProfile,
  id: string,
): Promise<SessionRow> {
  const row = await findControlledSession(userClient, profile, id)
  if (!row) throw new ApiError(404, 'not_found')
  return row
}

/** Shaxsiy bucket'dagi PDF uchun 2 soatlik imzolangan havola (faqat server chaqiradi). */
export async function signedPdfUrl(
  admin: SupabaseClient,
  lectureId: string,
): Promise<string | null> {
  const { data: lec } = await admin
    .from('lectures')
    .select('pdf_path')
    .eq('id', lectureId)
    .maybeSingle()
  if (!lec) return null
  const { data } = await admin.storage
    .from('lectures')
    .createSignedUrl(lec.pdf_path as string, 7200)
  return data?.signedUrl ?? null
}

export async function buildSessionState(
  admin: SupabaseClient,
  s: SessionRow,
): Promise<SessionState> {
  const [{ data: lec }, { count }] = await Promise.all([
    admin.from('lectures').select('title, page_count').eq('id', s.lecture_id).single(),
    admin
      .from('session_participants')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', s.id),
  ])
  return {
    id: s.id,
    rev: s.rev,
    slide: s.current_slide,
    pageCount: Number(lec?.page_count ?? 1),
    status: s.status,
    code: s.code,
    participants: count ?? 0,
    title: String(lec?.title ?? ''),
  }
}
