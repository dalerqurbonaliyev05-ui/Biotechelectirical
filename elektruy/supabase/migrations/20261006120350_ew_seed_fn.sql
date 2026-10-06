-- Idempotent lesson importer used by the seed (and safe to re-run): inserts lessons,
-- translations, steps and quizzes from the bundle JSON format, never overwriting rows.
create or replace function ew_private.seed_lessons(j jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  insert into public.ew_lessons (id, slug, sort_order, difficulty, est_minutes, icon, published)
  select (l ->> 'id')::uuid, l ->> 'slug', (l ->> 'sort_order')::int, (l ->> 'difficulty')::smallint,
         (l ->> 'est_minutes')::int, l ->> 'icon', true
  from jsonb_array_elements(j) l
  on conflict (slug) do nothing;
  get diagnostics n = row_count;

  insert into public.ew_lesson_translations (lesson_id, lang, title, summary)
  select (l ->> 'id')::uuid, t.key, t.value ->> 'title', coalesce(t.value ->> 'summary', '')
  from jsonb_array_elements(j) l, jsonb_each(l -> 't') t
  where exists (select 1 from public.ew_lessons x where x.id = (l ->> 'id')::uuid)
  on conflict do nothing;

  insert into public.ew_lesson_steps (id, lesson_id, sort_order, illustration, tools)
  select (s ->> 'id')::uuid, (l ->> 'id')::uuid, (s ->> 'sort_order')::int, s ->> 'illustration', s -> 'tools'
  from jsonb_array_elements(j) l, jsonb_array_elements(l -> 'steps') s
  where exists (select 1 from public.ew_lessons x where x.id = (l ->> 'id')::uuid)
  on conflict (id) do nothing;

  insert into public.ew_lesson_step_translations (step_id, lang, text, warning)
  select (s ->> 'id')::uuid, t.key, t.value ->> 'text', coalesce(t.value ->> 'warning', '')
  from jsonb_array_elements(j) l, jsonb_array_elements(l -> 'steps') s, jsonb_each(s -> 't') t
  where exists (select 1 from public.ew_lesson_steps x where x.id = (s ->> 'id')::uuid)
  on conflict do nothing;

  insert into public.ew_quiz_questions (id, lesson_id, sort_order, correct_index)
  select (q ->> 'id')::uuid, (l ->> 'id')::uuid, (q ->> 'sort_order')::int, (q ->> 'correct_index')::smallint
  from jsonb_array_elements(j) l, jsonb_array_elements(l -> 'quiz') q
  where exists (select 1 from public.ew_lessons x where x.id = (l ->> 'id')::uuid)
  on conflict (id) do nothing;

  insert into public.ew_quiz_question_translations (question_id, lang, question, options, explanation)
  select (q ->> 'id')::uuid, t.key, t.value ->> 'q', t.value -> 'options', coalesce(t.value ->> 'explanation', '')
  from jsonb_array_elements(j) l, jsonb_array_elements(l -> 'quiz') q, jsonb_each(q -> 't') t
  where exists (select 1 from public.ew_quiz_questions x where x.id = (q ->> 'id')::uuid)
  on conflict do nothing;

  return n;
end $$;

revoke all on function ew_private.seed_lessons(jsonb) from public, authenticated;
