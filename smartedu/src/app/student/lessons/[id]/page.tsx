import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AnnotationLayer } from '@/components/annotation-layer'
import { describeCorrect } from '@/lib/assessment/result-view'
import { parseItems, type AnnotationItem } from '@/lib/annotations'
import { bookUrl } from '@/lib/books'
import { serverEnv } from '@/lib/env'
import { t } from '@/lib/i18n'
import type { LiveQ, SqRow } from '@/lib/server/live-questions'
import { requireRole } from '@/lib/server/session'
import { createAdminClient } from '@/lib/supabase/admin'

const X = t.extras
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Dars xulosasi (talaba): dars tugagach slaydlar, o'qituvchi izohlari (faqat ruxsat berilgan bo'lsa), dars savollari
 * (to'g'ri javob bilan) va kitob havolalari. Faqat shu darsda QATNASHGAN talabaga (mehmon bog'langan bo'lsa u ham) ko'rinadi.
 */
export default async function LessonSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('student')
  const { id } = await params
  if (!GUID.test(id)) notFound()
  const admin = createAdminClient()

  const { data: part } = await admin
    .from('session_participants')
    .select('id')
    .eq('session_id', id)
    .eq('student_id', me.id)
    .maybeSingle()
  const { data: s } = await admin
    .from('lecture_sessions')
    .select('id, lecture_id, status, share_annotations, started_at, lectures(title, page_count)')
    .eq('id', id)
    .maybeSingle()
  if (!part || !s || s.status !== 'ended') notFound()
  const lec = s.lectures as unknown as { title: string; page_count: number } | null

  const [{ data: slides }, { data: books }, { data: ann }, { data: sqs }, { data: mine }] =
    await Promise.all([
      admin
        .from('lecture_slides')
        .select('slide_no, thumb_path')
        .eq('lecture_id', s.lecture_id)
        .order('slide_no')
        .limit(300),
      admin
        .from('slide_books')
        .select('slide_no, title, slug, page')
        .eq('lecture_id', s.lecture_id)
        .order('slide_no'),
      s.share_annotations
        ? admin.from('session_annotations').select('slide_no, items').eq('session_id', id)
        : Promise.resolve({ data: [] as { slide_no: number; items: unknown }[] }),
      admin
        .from('session_questions')
        .select(
          'id, question_id, slide_no, variant, closed_at, opened_at, time_limit_sec, session_id, lecture_question_id, audience, target_ids, questions(type, body, params)',
        )
        .eq('session_id', id)
        .not('closed_at', 'is', null)
        .order('opened_at'),
      admin
        .from('session_answers')
        .select('session_question_id, is_correct')
        .eq('session_id', id)
        .eq('student_id', me.id),
    ])

  const paths = (slides ?? [])
    .map((x) => x.thumb_path as string | null)
    .filter((p): p is string => Boolean(p))
  const signed = paths.length
    ? await admin.storage.from('lectures').createSignedUrls(paths, 3600)
    : { data: [] }
  const urlByPath = new Map(
    (signed.data ?? []).map((u) => [u.path as string, u.signedUrl as string]),
  )
  const annBySlide = new Map<number, AnnotationItem[]>(
    (ann ?? []).map((a) => [Number(a.slide_no), parseItems(a.items) ?? []]),
  )
  const booksBySlide = new Map<number, { title: string; url: string }[]>()
  for (const b of books ?? []) {
    const arr = booksBySlide.get(Number(b.slide_no)) ?? []
    arr.push({
      title: String(b.title),
      url: bookUrl(serverEnv().booksBaseUrl, String(b.slug), (b.page as number | null) ?? null),
    })
    booksBySlide.set(Number(b.slide_no), arr)
  }
  const myAns = new Map(
    (mine ?? []).map((a) => [a.session_question_id as string, a.is_correct as boolean]),
  )

  const qIds = [...new Set((sqs ?? []).map((q) => q.question_id as string))]
  const keys = new Map<string, { correct: unknown }>()
  if (qIds.length) {
    const { data: ks } = await admin
      .from('question_keys')
      .select('question_id, correct')
      .in('question_id', qIds.slice(0, 80))
    for (const k of ks ?? []) keys.set(k.question_id as string, { correct: k.correct })
  }
  const questions = (sqs ?? []).flatMap((sq) => {
    const q = sq.questions as unknown as LiveQ | null
    if (!q) return []
    return [
      {
        id: sq.id as string,
        slide: Number(sq.slide_no),
        text: String(q.body.text ?? ''),
        correct: describeCorrect(
          q,
          keys.get(sq.question_id as string) ?? null,
          (sq as unknown as SqRow).variant,
        ),
        mine: myAns.has(sq.id as string) ? myAns.get(sq.id as string)! : null,
      },
    ]
  })
  const slideRows = (slides ?? []).filter((x) => x.thumb_path)

  return (
    <div className="space-y-5">
      <Link href="/student" className="text-sm text-brand-600 hover:underline">
        {t.results.back}
      </Link>
      <h1 className="text-2xl font-bold">{lec?.title}</h1>

      {slideRows.length === 0 && questions.length === 0 && (
        <p className="card text-slate-500">{X.summaryNone}</p>
      )}

      {slideRows.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{X.summarySlides}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {slideRows.map((sl) => {
              const url = urlByPath.get(sl.thumb_path as string)
              const n = Number(sl.slide_no)
              const bks = booksBySlide.get(n) ?? []
              return (
                <figure key={n} className="card space-y-2">
                  <div className="relative overflow-hidden rounded-lg bg-slate-100 leading-[0]">
                    {url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={`${t.lectures.slide} ${n}`}
                        className="w-full"
                        loading="lazy"
                      />
                    )}
                    <AnnotationLayer items={annBySlide.get(n) ?? []} />
                  </div>
                  <figcaption className="text-xs text-slate-500">
                    {t.lectures.slide} {n}
                  </figcaption>
                  {bks.length > 0 && (
                    <ul className="text-sm">
                      {bks.map((b) => (
                        <li key={b.url}>
                          📖{' '}
                          <a
                            className="text-brand-600 underline"
                            href={b.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {b.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </figure>
              )
            })}
          </div>
        </section>
      )}

      {questions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{X.summaryQuestions}</h2>
          <ul className="space-y-2">
            {questions.map((q) => (
              <li key={q.id} className="card space-y-1 text-sm">
                <p className="font-medium whitespace-pre-wrap">
                  {t.lectures.slide} {q.slide}: {q.text}
                </p>
                <p className="text-slate-600">
                  {X.summaryCorrect}: <b>{q.correct}</b>{' '}
                  {q.mine !== null && <span>{q.mine ? '✅' : '❌'}</span>}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
