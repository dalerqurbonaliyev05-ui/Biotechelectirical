import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface BestLab {
  score: number
  max_score: number
  received_at: string
}

/**
 * Talabaning laboratoriya natijalari (lab_id bo'yicha ENG YAXSHISI — ball/maks nisbati). Faqat `since`dan keyin
 * (nazorat ochilganidan beri) kelganlari hisobga olinadi: oldingi (eski) natijadan qayta foydalanib bo'lmasin.
 */
export async function bestLabResults(
  admin: SupabaseClient,
  studentId: string,
  labIds: string[],
  since: Date,
): Promise<Map<string, BestLab>> {
  const out = new Map<string, BestLab>()
  if (labIds.length === 0) return out
  const { data } = await admin
    .from('lab_results')
    .select('lab_id, score, max_score, received_at')
    .eq('student_id', studentId)
    .in('lab_id', labIds)
    .gte('received_at', since.toISOString())
  for (const r of data ?? []) {
    const cur = out.get(r.lab_id as string)
    const ratio = Number(r.score) / Number(r.max_score)
    if (!cur || ratio > cur.score / cur.max_score)
      out.set(r.lab_id as string, {
        score: Number(r.score),
        max_score: Number(r.max_score),
        received_at: r.received_at as string,
      })
  }
  return out
}
