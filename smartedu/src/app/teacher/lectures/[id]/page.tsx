import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/server/session'
import { createClient } from '@/lib/supabase/server'
import { LectureEditor } from './lecture-editor'

export default async function LecturePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('teacher', 'admin')
  const { id } = await params
  const supabase = await createClient()
  const { data: lec } = await supabase
    .from('lectures')
    .select('id, title, subject_id, page_count, subjects(name)')
    .eq('id', id)
    .maybeSingle()
  if (!lec) notFound()

  const [{ data: lq }, { data: qs }, { data: groups }, { data: rooms }] = await Promise.all([
    supabase
      .from('lecture_questions')
      .select('id, slide_no, time_limit_sec, question_id, questions(type, body)')
      .eq('lecture_id', id)
      .order('slide_no'),
    supabase
      .from('questions')
      .select('id, type, body, topic')
      .eq('subject_id', lec.subject_id)
      .in('type', ['mcq', 'numeric'])
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('groups').select('id, name').order('name'),
    supabase.from('rooms').select('id, name').order('name'),
  ])
  const attached = (lq ?? []).map((r) => {
    const q = r.questions as unknown as { type: string; body: { text?: string } } | null
    return {
      id: String(r.id),
      slide_no: Number(r.slide_no),
      time_limit_sec: r.time_limit_sec as number | null,
      type: q?.type ?? '',
      text: String(q?.body.text ?? ''),
    }
  })
  const bank = (qs ?? []).map((q) => ({
    id: String(q.id),
    type: String(q.type),
    topic: (q.topic as string | null) ?? null,
    text: String((q.body as { text?: string }).text ?? ''),
  }))
  const subjectName = (lec.subjects as unknown as { name: string } | null)?.name ?? ''

  return (
    <LectureEditor
      lecture={{
        id: lec.id,
        title: lec.title,
        subject: subjectName,
        pageCount: Number(lec.page_count),
      }}
      attached={attached}
      bank={bank}
      groups={(groups ?? []).map((g) => ({ id: String(g.id), name: String(g.name) }))}
      rooms={(rooms ?? []).map((r) => ({ id: String(r.id), name: String(r.name) }))}
    />
  )
}
