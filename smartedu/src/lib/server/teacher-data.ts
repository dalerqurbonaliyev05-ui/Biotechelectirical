import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { SessionProfile } from '@/lib/types'

/** Foydalanuvchi ishlata oladigan fanlar: o'qituvchi — biriktirilganlari, admin — hammasi (RLS ostida). */
export async function listMySubjects(
  profile: SessionProfile,
): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient()
  if (profile.role === 'admin') {
    const { data } = await supabase.from('subjects').select('id, name').order('name')
    return (data ?? []).map((s) => ({ id: String(s.id), name: String(s.name) }))
  }
  const { data } = await supabase
    .from('teacher_subjects')
    .select('subjects(id, name)')
    .eq('teacher_id', profile.id)
  const map = new Map<string, string>()
  for (const r of data ?? []) {
    const s = r.subjects as unknown as { id: string; name: string } | null
    if (s) map.set(s.id, s.name)
  }
  return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
}

/** (fan, guruh) juftliklari — nazorat yaratish uchun. Admin uchun null (cheklovsiz). */
export async function listMyPairs(
  profile: SessionProfile,
): Promise<{ subject_id: string; group_id: string }[] | null> {
  if (profile.role === 'admin') return null
  const { data } = await (
    await createClient()
  )
    .from('teacher_subjects')
    .select('subject_id, group_id')
    .eq('teacher_id', profile.id)
  return (data ?? []).map((r) => ({
    subject_id: String(r.subject_id),
    group_id: String(r.group_id),
  }))
}

/** Nazorat formasi uchun: fanlar, juftliklar, guruhlar, savollar banki. */
export async function loadAssessmentFormData(me: SessionProfile) {
  const supabase = await createClient()
  const [subjects, pairs, { data: groups }, { data: qs }] = await Promise.all([
    listMySubjects(me),
    listMyPairs(me),
    supabase.from('groups').select('id, name').order('name'),
    supabase
      .from('questions')
      .select('id, subject_id, type, topic, body')
      .order('created_at', { ascending: false })
      .limit(1000),
  ])
  const questionBank: {
    id: string
    subject_id: string
    type: string
    text: string
    topic: string | null
  }[] = (qs ?? []).map((q) => ({
    id: String(q.id),
    subject_id: String(q.subject_id),
    type: String(q.type),
    topic: (q.topic as string | null) ?? null,
    text: String((q.body as { text?: string }).text ?? ''),
  }))
  return {
    subjects,
    pairs,
    groups: (groups ?? []).map((g) => ({ id: String(g.id), name: String(g.name) })),
    questionBank,
  }
}
