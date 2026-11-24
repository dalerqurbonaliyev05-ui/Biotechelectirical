import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/server/session'
import { createClient } from '@/lib/supabase/server'
import { LectureEditor, type Book, type CheckpointItem } from './lecture-editor'

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

  const [{ data: lq }, { data: qs }, { data: groups }, { data: rooms }, { data: books }] =
    await Promise.all([
      supabase
        .from('lecture_questions')
        .select(
          'id, slide_no, position, time_limit_sec, is_bonus, question_id, questions(type, body)',
        )
        .eq('lecture_id', id)
        .order('slide_no')
        .order('position'),
      supabase
        .from('questions')
        .select('id, type, body, topic')
        .eq('subject_id', lec.subject_id)
        .in('type', ['mcq', 'numeric'])
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('groups').select('id, name').order('name'),
      supabase.from('rooms').select('id, name').order('name'),
      supabase
        .from('slide_books')
        .select('id, slide_no, title, slug, page')
        .eq('lecture_id', id)
        .order('slide_no'),
    ])
  const items: CheckpointItem[] = (lq ?? []).map((r) => {
    const q = r.questions as unknown as { type: string; body: { text?: string } } | null
    return {
      id: String(r.id),
      slide: Number(r.slide_no),
      position: Number(r.position),
      questionId: String(r.question_id),
      timeLimit: (r.time_limit_sec as number | null) ?? 30,
      isBonus: Boolean(r.is_bonus),
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
  const bookRows: Book[] = (books ?? []).map((b) => ({
    id: String(b.id),
    slide: Number(b.slide_no),
    title: String(b.title),
    slug: String(b.slug),
    page: (b.page as number | null) ?? null,
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
      items={items}
      books={bookRows}
      bank={bank}
      groups={(groups ?? []).map((g) => ({ id: String(g.id), name: String(g.name) }))}
      rooms={(rooms ?? []).map((r) => ({ id: String(r.id), name: String(r.name) }))}
    />
  )
}
