import { handle, idParam, limit, ok, requireUser } from '@/lib/server/api'
import { getControlledSession } from '@/lib/server/sessions'
import { createClient } from '@/lib/supabase/server'

/** Mehmonni bog'lash uchun talaba qidirish (RLS: o'qituvchi faqat o'z guruhlaridagilarni ko'radi). */
export const GET = handle<{ id: string }>(async (req, { params }) => {
  const { profile } = await requireUser(['teacher', 'admin'])
  limit(`student-search:${profile.id}`, 60, 60_000)
  const supabase = await createClient()
  await getControlledSession(supabase, profile, idParam((await params).id))
  const term = (req.nextUrl.searchParams.get('q') ?? '')
    .replace(/[,()%*\\]/g, ' ')
    .trim()
    .slice(0, 40)
  if (term.length < 2) return ok({ students: [] })
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, student_code')
    .eq('role', 'student')
    .eq('is_active', true)
    .or(`full_name.ilike.%${term}%,student_code.ilike.%${term}%`)
    .order('full_name')
    .limit(15)
  return ok({
    students: (data ?? []).map((s) => ({
      id: s.id as string,
      name: s.full_name as string,
      code: (s.student_code as string | null) ?? null,
    })),
  })
})
