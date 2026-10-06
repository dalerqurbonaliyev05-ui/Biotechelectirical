import { ArrowDown, ArrowLeft, ArrowUp, ImagePlus, Plus, Save, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Loading, PageHeader } from '@/components/Layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BUCKETS, must, publicMediaUrl, supabase } from '@/lib/supabase'
import { ILLUSTRATIONS, type LessonDraft, type QuizDraft, type StepDraft, type Tr } from '@/lib/types'
import { LANGS, type Lang } from '@/lib/utils'

const emptyTr = <T,>(make: () => T): Tr<T> => ({ uz: make(), ru: make(), en: make() })

const newStep = (): StepDraft => ({
  id: crypto.randomUUID(),
  image_path: null,
  illustration: 'tools',
  tools: [],
  t: emptyTr(() => ({ text: '', warning: '' })),
})

const newQuestion = (): QuizDraft => ({
  id: crypto.randomUUID(),
  correct_index: 0,
  t: emptyTr(() => ({ question: '', options: ['', '', ''], explanation: '' })),
})

type Row = Record<string, unknown> & { lang: Lang }

function byLang<T>(rows: Row[], pick: (r: Row) => T, fallback: () => T): Tr<T> {
  const out = emptyTr(fallback)
  for (const r of rows) out[r.lang] = pick(r)
  return out
}

async function loadLesson(id: string): Promise<LessonDraft> {
  const l = must(
    await supabase
      .from('ew_lessons')
      .select('*, ew_lesson_translations(*), ew_lesson_steps(*, ew_lesson_step_translations(*)), ew_quiz_questions(*, ew_quiz_question_translations(*))')
      .eq('id', id)
      .single(),
  ) as Record<string, unknown> & {
    ew_lesson_translations: Row[]
    ew_lesson_steps: (Record<string, unknown> & { ew_lesson_step_translations: Row[] })[]
    ew_quiz_questions: (Record<string, unknown> & { ew_quiz_question_translations: Row[] })[]
  }
  const sorted = <T extends Record<string, unknown>>(xs: T[]) => [...xs].sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
  return {
    id,
    slug: l.slug as string,
    sort_order: l.sort_order as number,
    difficulty: l.difficulty as number,
    est_minutes: l.est_minutes as number,
    icon: (l.icon as string) ?? null,
    published: l.published as boolean,
    t: byLang(l.ew_lesson_translations, (r) => ({ title: r.title as string, summary: r.summary as string }), () => ({ title: '', summary: '' })),
    steps: sorted(l.ew_lesson_steps).map((s) => ({
      id: s.id as string,
      image_path: (s.image_path as string) ?? null,
      illustration: (s.illustration as string) ?? null,
      tools: (s.tools as string[]) ?? [],
      t: byLang(s.ew_lesson_step_translations, (r) => ({ text: r.text as string, warning: r.warning as string }), () => ({ text: '', warning: '' })),
    })),
    quiz: sorted(l.ew_quiz_questions).map((q) => ({
      id: q.id as string,
      correct_index: q.correct_index as number,
      t: byLang(
        q.ew_quiz_question_translations,
        (r) => ({ question: r.question as string, options: r.options as string[], explanation: r.explanation as string }),
        () => ({ question: '', options: ['', '', ''], explanation: '' }),
      ),
    })),
  }
}

/** Problems that must be fixed before the lesson can be published. */
function problems(d: LessonDraft): string[] {
  const out: string[] = []
  if (!/^[a-z0-9-]+$/.test(d.slug)) out.push('Slug: lowercase letters, digits and dashes only')
  for (const lang of LANGS) {
    if (!d.t[lang].title.trim()) out.push(`Title missing (${lang})`)
    d.steps.forEach((s, i) => !s.t[lang].text.trim() && out.push(`Step ${i + 1}: text missing (${lang})`))
    d.quiz.forEach((q, i) => {
      if (!q.t[lang].question.trim()) out.push(`Question ${i + 1}: text missing (${lang})`)
      if (q.t[lang].options.some((o) => !o.trim())) out.push(`Question ${i + 1}: empty option (${lang})`)
    })
  }
  if (d.steps.length === 0) out.push('Add at least one step')
  return out
}

async function saveLesson(d: LessonDraft, isNew: boolean) {
  const lesson = {
    id: d.id,
    slug: d.slug.trim(),
    sort_order: d.sort_order,
    difficulty: d.difficulty,
    est_minutes: d.est_minutes,
    icon: d.icon || null,
    published: d.published,
  }
  must(isNew ? await supabase.from('ew_lessons').insert(lesson) : await supabase.from('ew_lessons').update(lesson).eq('id', d.id))
  must(
    await supabase
      .from('ew_lesson_translations')
      .upsert(LANGS.map((lang) => ({ lesson_id: d.id, lang, title: d.t[lang].title.trim() || d.slug, summary: d.t[lang].summary.trim() }))),
  )

  // Steps: upsert the current list, then remove the ones that were deleted in the editor.
  if (d.steps.length) {
    must(
      await supabase
        .from('ew_lesson_steps')
        .upsert(d.steps.map((s, i) => ({ id: s.id, lesson_id: d.id, sort_order: i + 1, image_path: s.image_path, illustration: s.illustration, tools: s.tools }))),
    )
    must(
      await supabase
        .from('ew_lesson_step_translations')
        .upsert(d.steps.flatMap((s) => LANGS.map((lang) => ({ step_id: s.id, lang, text: s.t[lang].text.trim() || '…', warning: s.t[lang].warning.trim() })))),
    )
  }
  let del = supabase.from('ew_lesson_steps').delete().eq('lesson_id', d.id)
  if (d.steps.length) del = del.not('id', 'in', `(${d.steps.map((s) => s.id).join(',')})`)
  must(await del)

  if (d.quiz.length) {
    must(await supabase.from('ew_quiz_questions').upsert(d.quiz.map((q, i) => ({ id: q.id, lesson_id: d.id, sort_order: i + 1, correct_index: q.correct_index }))))
    must(
      await supabase.from('ew_quiz_question_translations').upsert(
        d.quiz.flatMap((q) =>
          LANGS.map((lang) => ({
            question_id: q.id,
            lang,
            question: q.t[lang].question.trim() || '…',
            options: q.t[lang].options.map((o) => o.trim()),
            explanation: q.t[lang].explanation.trim(),
          })),
        ),
      ),
    )
  }
  let delQ = supabase.from('ew_quiz_questions').delete().eq('lesson_id', d.id)
  if (d.quiz.length) delQ = delQ.not('id', 'in', `(${d.quiz.map((q) => q.id).join(',')})`)
  must(await delQ)
}

function move<T>(xs: T[], i: number, by: number): T[] {
  const j = i + by
  if (j < 0 || j >= xs.length) return xs
  const out = [...xs]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

export function LessonEditor() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const [draft, setDraft] = useState<LessonDraft | null>(null)
  const [tools, setTools] = useState<{ key: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [lang, setLang] = useState<Lang>('uz')

  useEffect(() => {
    supabase
      .from('ew_materials')
      .select('key, ew_material_translations(lang, name)')
      .like('key', 'tool_%')
      .order('sort_order')
      .then((r) =>
        setTools(
          (must(r) as unknown as { key: string; ew_material_translations: { lang: string; name: string }[] }[]).map((m) => ({
            key: m.key,
            name: m.ew_material_translations.find((x) => x.lang === 'en')?.name ?? m.key,
          })),
        ),
      )
    if (isNew) {
      setDraft({
        id: crypto.randomUUID(),
        slug: '',
        sort_order: 100,
        difficulty: 1,
        est_minutes: 10,
        icon: null,
        published: false,
        t: emptyTr(() => ({ title: '', summary: '' })),
        steps: [newStep()],
        quiz: [],
      })
    } else if (id) {
      loadLesson(id).then(setDraft, (e: Error) => toast.error(e.message))
    }
  }, [id, isNew])

  if (!draft) return <Loading />
  const d = draft
  const set = (patch: Partial<LessonDraft>) => setDraft({ ...d, ...patch })
  const setStep = (i: number, s: StepDraft) => set({ steps: d.steps.map((x, k) => (k === i ? s : x)) })
  const setQ = (i: number, q: QuizDraft) => set({ quiz: d.quiz.map((x, k) => (k === i ? q : x)) })
  const issues = problems(d)

  async function save() {
    if (d.published && issues.length) {
      toast.error('Fix the problems below or unpublish before saving.')
      return
    }
    setSaving(true)
    try {
      await saveLesson(d, isNew)
      toast.success('Lesson saved')
      if (isNew) navigate(`/lessons/${d.id}`, { replace: true })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm('Delete this lesson with all steps, quiz and user progress?')) return
    const { error } = await supabase.from('ew_lessons').delete().eq('id', d.id)
    if (error) return toast.error(error.message)
    toast.success('Lesson deleted')
    navigate('/lessons')
  }

  async function upload(i: number, file: File) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `lessons/${d.id}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from(BUCKETS.lessonMedia).upload(path, file, { contentType: file.type, upsert: false })
    if (error) return toast.error(error.message)
    setStep(i, { ...d.steps[i], image_path: path })
    toast.success('Picture uploaded — save the lesson to apply it')
  }

  return (
    <>
      <PageHeader
        title={isNew ? 'New lesson' : d.t.uz.title || d.slug}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/lessons">
                <ArrowLeft /> Back
              </Link>
            </Button>
            {!isNew && (
              <Button variant="outline" className="text-destructive" onClick={remove}>
                <Trash2 /> Delete
              </Button>
            )}
            <Button onClick={save} disabled={saving}>
              <Save /> {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      />

      {issues.length > 0 && (
        <div className="mb-4 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">
          <b>{d.published ? 'Cannot publish yet:' : 'Before publishing:'}</b>
          <ul className="ml-5 list-disc">
            {issues.slice(0, 8).map((p) => (
              <li key={p}>{p}</li>
            ))}
            {issues.length > 8 && <li>…and {issues.length - 8} more</li>}
          </ul>
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="grid gap-4 pt-4 md:grid-cols-6">
          <Field label="Slug" className="md:col-span-2">
            <Input value={d.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} placeholder="install-socket" />
          </Field>
          <Field label="Order">
            <Input type="number" value={d.sort_order} onChange={(e) => set({ sort_order: Number(e.target.value) })} />
          </Field>
          <Field label="Difficulty">
            <NativeSelect value={d.difficulty} onChange={(e) => set({ difficulty: Number(e.target.value) })}>
              <option value={1}>Easy</option>
              <option value={2}>Medium</option>
              <option value={3}>Hard</option>
            </NativeSelect>
          </Field>
          <Field label="Minutes">
            <Input type="number" min={1} max={600} value={d.est_minutes} onChange={(e) => set({ est_minutes: Number(e.target.value) })} />
          </Field>
          <Field label="Published">
            <div className="flex h-9 items-center">
              <Switch checked={d.published} onCheckedChange={(v) => set({ published: v })} />
            </div>
          </Field>
        </CardContent>
      </Card>

      <Tabs value={lang} onValueChange={(v) => setLang(v as Lang)}>
        <div className="sticky top-0 z-10 -mx-1 mb-2 bg-background/90 px-1 py-2 backdrop-blur">
          <TabsList>
            {LANGS.map((l) => (
              <TabsTrigger key={l} value={l}>
                {l.toUpperCase()}
                {issues.some((p) => p.endsWith(`(${l})`)) && <span className="ml-1 text-destructive">•</span>}
              </TabsTrigger>
            ))}
          </TabsList>
          <span className="ml-3 text-xs text-muted-foreground">Texts are edited per language; pictures, tools and order are shared.</span>
        </div>
        {LANGS.map((l) => (
          <TabsContent key={l} value={l} className="grid gap-4">
            <Card>
              <CardContent className="grid gap-3 pt-4">
                <Field label={`Title (${l})`}>
                  <Input value={d.t[l].title} onChange={(e) => set({ t: { ...d.t, [l]: { ...d.t[l], title: e.target.value } } })} />
                </Field>
                <Field label={`Summary (${l})`}>
                  <Textarea rows={2} value={d.t[l].summary} onChange={(e) => set({ t: { ...d.t, [l]: { ...d.t[l], summary: e.target.value } } })} />
                </Field>
              </CardContent>
            </Card>

            <h2 className="mt-2 text-lg font-semibold">Steps</h2>
            {d.steps.map((s, i) => (
              <Card key={s.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Step {i + 1}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => set({ steps: move(d.steps, i, -1) })} aria-label="Up">
                      <ArrowUp />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => set({ steps: move(d.steps, i, 1) })} aria-label="Down">
                      <ArrowDown />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => set({ steps: d.steps.filter((_, k) => k !== i) })} aria-label="Delete step">
                      <Trash2 />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-[180px_1fr]">
                  <div className="grid content-start gap-2">
                    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                      {s.image_path ? (
                        <img src={publicMediaUrl(s.image_path)} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="p-2 text-center text-xs text-muted-foreground">Built-in: {s.illustration ?? 'none'}</span>
                      )}
                    </div>
                    <label className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                      <ImagePlus className="size-3" /> Upload picture
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => e.target.files?.[0] && upload(i, e.target.files[0])} />
                    </label>
                    {s.image_path && (
                      <Button variant="ghost" size="sm" onClick={() => setStep(i, { ...s, image_path: null })}>
                        <X /> Use built-in
                      </Button>
                    )}
                    <NativeSelect value={s.illustration ?? ''} onChange={(e) => setStep(i, { ...s, illustration: e.target.value || null })}>
                      <option value="">— no illustration —</option>
                      {ILLUSTRATIONS.map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="grid content-start gap-3">
                    <Field label={`Instruction (${l})`}>
                      <Textarea rows={4} value={s.t[l].text} onChange={(e) => setStep(i, { ...s, t: { ...s.t, [l]: { ...s.t[l], text: e.target.value } } })} />
                    </Field>
                    <Field label={`Warning (${l}, optional)`}>
                      <Textarea rows={2} className="border-destructive/40" value={s.t[l].warning} onChange={(e) => setStep(i, { ...s, t: { ...s.t, [l]: { ...s.t[l], warning: e.target.value } } })} />
                    </Field>
                    <div>
                      <div className="mb-1 text-sm font-medium">Tools</div>
                      <div className="flex flex-wrap gap-1">
                        {tools.map((t) => {
                          const on = s.tools.includes(t.key)
                          return (
                            <button
                              key={t.key}
                              type="button"
                              onClick={() => setStep(i, { ...s, tools: on ? s.tools.filter((x) => x !== t.key) : [...s.tools, t.key] })}
                              className={`rounded-full border px-2 py-0.5 text-xs ${on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                            >
                              {t.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={() => set({ steps: [...d.steps, newStep()] })}>
              <Plus /> Add step
            </Button>

            <h2 className="mt-4 text-lg font-semibold">Quiz</h2>
            {d.quiz.map((q, i) => (
              <Card key={q.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Question {i + 1}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => set({ quiz: move(d.quiz, i, -1) })} aria-label="Up">
                      <ArrowUp />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => set({ quiz: move(d.quiz, i, 1) })} aria-label="Down">
                      <ArrowDown />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => set({ quiz: d.quiz.filter((_, k) => k !== i) })} aria-label="Delete question">
                      <Trash2 />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <Field label={`Question (${l})`}>
                    <Input value={q.t[l].question} onChange={(e) => setQ(i, { ...q, t: { ...q.t, [l]: { ...q.t[l], question: e.target.value } } })} />
                  </Field>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Options — select the correct one (shared by all languages)</div>
                    {q.t[l].options.map((o, k) => (
                      <div key={k} className="flex items-center gap-2">
                        <input type="radio" name={`correct-${q.id}-${l}`} checked={q.correct_index === k} onChange={() => setQ(i, { ...q, correct_index: k })} />
                        <Input
                          value={o}
                          onChange={(e) => {
                            const opts = [...q.t[l].options]
                            opts[k] = e.target.value
                            setQ(i, { ...q, t: { ...q.t, [l]: { ...q.t[l], options: opts } } })
                          }}
                        />
                        {q.correct_index === k && <Badge variant="success">correct</Badge>}
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={q.t[l].options.length <= 2}
                          aria-label="Remove option"
                          onClick={() => {
                            const t = { ...q.t }
                            for (const x of LANGS) t[x] = { ...t[x], options: t[x].options.filter((_, m) => m !== k) }
                            setQ(i, { ...q, t, correct_index: Math.min(q.correct_index > k ? q.correct_index - 1 : q.correct_index, t[l].options.length - 1) })
                          }}
                        >
                          <X />
                        </Button>
                      </div>
                    ))}
                    {q.t[l].options.length < 6 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start"
                        onClick={() => {
                          const t = { ...q.t }
                          for (const x of LANGS) t[x] = { ...t[x], options: [...t[x].options, ''] }
                          setQ(i, { ...q, t })
                        }}
                      >
                        <Plus /> Add option
                      </Button>
                    )}
                  </div>
                  <Field label={`Explanation (${l})`}>
                    <Textarea rows={2} value={q.t[l].explanation} onChange={(e) => setQ(i, { ...q, t: { ...q.t, [l]: { ...q.t[l], explanation: e.target.value } } })} />
                  </Field>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={() => set({ quiz: [...d.quiz, newQuestion()] })}>
              <Plus /> Add question
            </Button>
          </TabsContent>
        ))}
      </Tabs>
    </>
  )
}
