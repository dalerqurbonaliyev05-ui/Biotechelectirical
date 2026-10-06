import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Empty, Loading, PageHeader } from '@/components/Layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { must, supabase } from '@/lib/supabase'
import { fmtDate } from '@/lib/utils'

type Row = {
  id: string
  slug: string
  sort_order: number
  difficulty: number
  est_minutes: number
  published: boolean
  updated_at: string
  ew_lesson_translations: { lang: string; title: string }[]
  ew_lesson_steps: { count: number }[]
  ew_quiz_questions: { count: number }[]
}

export function Lessons() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const navigate = useNavigate()

  const load = () =>
    supabase
      .from('ew_lessons')
      .select('id, slug, sort_order, difficulty, est_minutes, published, updated_at, ew_lesson_translations(lang, title), ew_lesson_steps(count), ew_quiz_questions(count)')
      .order('sort_order')
      .then((r) => setRows(must(r) as unknown as Row[]))

  useEffect(() => {
    load()
  }, [])

  async function togglePublished(r: Row, published: boolean) {
    const { error } = await supabase.from('ew_lessons').update({ published }).eq('id', r.id)
    if (error) return toast.error(error.message)
    load()
  }

  return (
    <>
      <PageHeader
        title="Lessons"
        description="Changes reach the app on its next sync. Unpublished lessons are hidden from users; the APK still ships its built-in copy."
        actions={
          <Button onClick={() => navigate('/lessons/new')}>
            <Plus /> New lesson
          </Button>
        }
      />
      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>#</TH>
              <TH>Title (uz / ru / en)</TH>
              <TH>Slug</TH>
              <TH>Steps</TH>
              <TH>Quiz</TH>
              <TH>Level</TH>
              <TH>Updated</TH>
              <TH>Published</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => {
              const t = (lang: string) => r.ew_lesson_translations.find((x) => x.lang === lang)?.title
              return (
                <TR key={r.id}>
                  <TD>{r.sort_order}</TD>
                  <TD>
                    <Link to={`/lessons/${r.id}`} className="font-medium text-primary hover:underline">
                      {t('uz') ?? r.slug}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {t('ru') ?? <Badge variant="destructive">ru missing</Badge>} · {t('en') ?? <Badge variant="destructive">en missing</Badge>}
                    </div>
                  </TD>
                  <TD className="font-mono text-xs">{r.slug}</TD>
                  <TD>{r.ew_lesson_steps[0]?.count ?? 0}</TD>
                  <TD>{r.ew_quiz_questions[0]?.count ?? 0}</TD>
                  <TD>{['', 'easy', 'medium', 'hard'][r.difficulty]}</TD>
                  <TD className="whitespace-nowrap">{fmtDate(r.updated_at)}</TD>
                  <TD>
                    <Switch checked={r.published} onCheckedChange={(v) => togglePublished(r, v)} />
                  </TD>
                </TR>
              )
            })}
          </TBody>
        </Table>
      )}
    </>
  )
}
