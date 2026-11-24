-- ════════════════════════════════════════════════════════════════
-- 0002 — Savollar banki, nazoratlar, urinishlar, javoblar, audit jurnali (+ RLS)
--
-- Muhim qarorlar:
--  * To'g'ri javob va izoh `question_keys` da — talabalar uchun hech qanday siyosat yo'q.
--  * Talaba hech narsa yozmaydi; vaqt/ball DB funksiyalari (service_role) orqali, DB soati bilan.
--  * Talaba natijani faqat `student_can_see_results()` ruxsat bergandan keyin o'qiy oladi.
-- ════════════════════════════════════════════════════════════════

create type public.question_type as enum ('mcq', 'numeric', 'short_text', 'lab_task');
create type public.attempt_status as enum ('in_progress', 'submitted', 'finalized');

-- ── Savollar ────────────────────────────────────────────────────
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  type public.question_type not null,
  -- mcq: {text, options:[{id,text}], multiple}; boshqalar: {text}
  body jsonb not null,
  topic text,
  difficulty smallint check (difficulty between 1 and 5),
  -- numeric: {vars:{U:{min,max,step}}, answer_unit, tolerance_pct, decimals}; short_text: {rubric:[{criterion,points}]};
  -- lab_task: {max_points}
  params jsonb not null default '{}',
  book_ref jsonb check (book_ref is null or (book_ref ? 'slug')),   -- {slug, page}
  lab_ref jsonb check (lab_ref is null or (lab_ref ? 'lab_id')),    -- {lab_id}
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index questions_subject_idx on public.questions (subject_id, topic);
create trigger questions_touch before update on public.questions
  for each row execute function public.touch_updated_at();

-- To'g'ri javob va izoh: TALABAGA HECH QACHON KO'RINMAYDI (siyosat faqat admin/o'qituvchiga)
create table public.question_keys (
  question_id uuid primary key references public.questions (id) on delete cascade,
  -- mcq: ["optId",..]; numeric: {formula}; short_text: {sample}; lab_task: {}
  correct jsonb not null default 'null',
  explanation text
);

-- ── Nazoratlar ──────────────────────────────────────────────────
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete restrict,
  group_id uuid not null references public.groups (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  title text not null check (length(btrim(title)) > 0),
  description text,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 1 and 600),
  question_count integer check (question_count is null or question_count > 0), -- bo'sh = barchasi
  shuffle_questions boolean not null default true,
  shuffle_options boolean not null default true,
  -- Natija (ball) qachon ko'rinadi:
  --   immediate: topshirishi bilan; after_close: nazorat yopilgach; after_finalize: o'qituvchi tasdiqlagach
  show_score text not null default 'after_finalize' check (show_score in ('immediate', 'after_close', 'after_finalize')),
  -- To'g'ri javob + izoh qachon ko'rinadi: never / after_close / manual (answers_revealed_at belgilanganda)
  reveal_answers text not null default 'manual' check (reveal_answers in ('never', 'after_close', 'manual')),
  answers_revealed_at timestamptz,
  weight integer not null default 100 check (weight between 0 and 1000), -- semestr reytingiga hissasi (maks. ball)
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at)
);
create index assessments_group_idx on public.assessments (group_id, opens_at);
create trigger assessments_touch before update on public.assessments
  for each row execute function public.touch_updated_at();

create table public.assessment_questions (
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  position integer not null default 0,
  points numeric(6, 2) not null default 1 check (points > 0),
  primary key (assessment_id, question_id)
);

-- ── Urinishlar va javoblar ──────────────────────────────────────
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status public.attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),   -- DB soati (mijozga ishonilmaydi)
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  finalized_at timestamptz,
  finalized_by uuid references public.profiles (id) on delete set null,
  seed text not null,                              -- parametr generatori urug'i: talaba id + nazorat id
  total_score numeric(8, 2),
  max_score numeric(8, 2),
  leave_count integer not null default 0,          -- sahifadan chiqish soni (jazo emas, faqat signal)
  last_leave_at timestamptz,
  unique (assessment_id, student_id)
);
create index attempts_student_idx on public.attempts (student_id);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  position integer not null,
  points_max numeric(6, 2) not null,
  variant jsonb not null default '{}',             -- {values:{U:12}, option_order:[...]} — talabaga ko'rinadigan variant
  response jsonb,                                  -- talaba javobi
  answered_at timestamptz,
  is_correct boolean,
  score numeric(6, 2),
  needs_review boolean not null default false,
  graded_by uuid references public.profiles (id) on delete set null,
  graded_at timestamptz,
  feedback text,
  rubric_scores jsonb,
  unique (attempt_id, question_id)
);
create index answers_attempt_idx on public.answers (attempt_id);
create index answers_review_idx on public.answers (attempt_id) where needs_review;

-- ── Audit jurnali (ball o'zgarishlari talabaga ham ko'rinadi) ───
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,               -- score.set | score.adjust | attempt.finalize | answers.reveal
  entity text not null,               -- answer | attempt | assessment
  entity_id uuid,
  subject_student_id uuid references public.profiles (id) on delete cascade,
  attempt_id uuid references public.attempts (id) on delete cascade,
  assessment_id uuid references public.assessments (id) on delete cascade,
  old_value jsonb,
  new_value jsonb,
  reason text
);
create index audit_attempt_idx on public.audit_log (attempt_id);
create index audit_assessment_idx on public.audit_log (assessment_id);

-- ── Yordamchi funksiyalar ───────────────────────────────────────
create function public.owns_assessment(aid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.assessments where id = aid and created_by = auth.uid())
$$;

create function public.teaches_assessment(aid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.assessments a where a.id = aid and public.teaches_subject_group(a.subject_id, a.group_id)
  )
$$;

create function public.teaches_attempt(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.attempts t join public.assessments a on a.id = t.assessment_id
    where t.id = tid and public.teaches_subject_group(a.subject_id, a.group_id)
  )
$$;

create function public.question_visible(qid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.questions q where q.id = qid and public.teaches_subject(q.subject_id))
$$;

create function public.question_owned(qid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.questions q where q.id = qid and q.created_by = auth.uid())
$$;

-- Talaba o'z urinishi natijasini (ball) ko'ra oladimi? — nazoratning `show_score` qoidasi bo'yicha.
create function public.student_can_see_results(aid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.attempts t join public.assessments s on s.id = t.assessment_id
    where t.id = aid and t.student_id = auth.uid()
      and (
        (s.show_score = 'immediate' and t.status in ('submitted', 'finalized'))
        or (s.show_score = 'after_close' and t.status in ('submitted', 'finalized') and now() >= s.closes_at)
        or (s.show_score = 'after_finalize' and t.status = 'finalized')
      )
  )
$$;

-- Savolni ishlatilgan bo'lsa, mazmunini (matn/javob/parametr) o'zgartirib bo'lmaydi: natijalar buzilmasin.
create function public.guard_question_in_use() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from public.answers where question_id = old.id)
     and (new.type is distinct from old.type or new.body is distinct from old.body or new.params is distinct from old.params) then
    raise exception 'question_in_use' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger questions_guard before update on public.questions
  for each row execute function public.guard_question_in_use();

create function public.guard_key_in_use() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from public.answers where question_id = old.question_id)
     and new.correct is distinct from old.correct then
    raise exception 'question_in_use' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger question_keys_guard before update on public.question_keys
  for each row execute function public.guard_key_in_use();

-- ── RLS ─────────────────────────────────────────────────────────
alter table public.questions enable row level security;
alter table public.question_keys enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;
alter table public.audit_log enable row level security;

-- Savollar: faqat admin va o'z fanini o'qitadigan o'qituvchi. TALABAGA — siyosat yo'q.
create policy questions_admin on public.questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy questions_teacher_read on public.questions for select to authenticated
  using (public.is_teacher() and public.teaches_subject(subject_id));
create policy questions_teacher_insert on public.questions for insert to authenticated
  with check (public.is_teacher() and created_by = auth.uid() and public.teaches_subject(subject_id));
create policy questions_teacher_update on public.questions for update to authenticated
  using (public.is_teacher() and created_by = auth.uid())
  with check (created_by = auth.uid() and public.teaches_subject(subject_id));
create policy questions_teacher_delete on public.questions for delete to authenticated
  using (public.is_teacher() and created_by = auth.uid());

create policy keys_admin on public.question_keys for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy keys_teacher_read on public.question_keys for select to authenticated
  using (public.is_teacher() and public.question_visible(question_id));
create policy keys_teacher_insert on public.question_keys for insert to authenticated
  with check (public.is_teacher() and public.question_owned(question_id));
create policy keys_teacher_update on public.question_keys for update to authenticated
  using (public.is_teacher() and public.question_owned(question_id))
  with check (public.question_owned(question_id));
create policy keys_teacher_delete on public.question_keys for delete to authenticated
  using (public.is_teacher() and public.question_owned(question_id));

-- Nazoratlar
create policy assessments_admin on public.assessments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy assessments_teacher_read on public.assessments for select to authenticated
  using (public.is_teacher() and public.teaches_subject_group(subject_id, group_id));
create policy assessments_teacher_insert on public.assessments for insert to authenticated
  with check (public.is_teacher() and created_by = auth.uid() and public.teaches_subject_group(subject_id, group_id));
create policy assessments_teacher_update on public.assessments for update to authenticated
  using (public.is_teacher() and created_by = auth.uid())
  with check (created_by = auth.uid() and public.teaches_subject_group(subject_id, group_id));
create policy assessments_teacher_delete on public.assessments for delete to authenticated
  using (public.is_teacher() and created_by = auth.uid());
-- Talaba: faqat o'z guruhining e'lon qilingan nazoratlari (sarlavha/vaqt). Savollar — yo'q.
create policy assessments_student_read on public.assessments for select to authenticated
  using (public.app_role() = 'student' and is_published and group_id = public.my_group_id());

create policy aq_admin on public.assessment_questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy aq_teacher_read on public.assessment_questions for select to authenticated
  using (public.is_teacher() and public.teaches_assessment(assessment_id));
create policy aq_teacher_write on public.assessment_questions for all to authenticated
  using (public.is_teacher() and public.owns_assessment(assessment_id))
  with check (public.is_teacher() and public.owns_assessment(assessment_id));

-- Urinishlar va javoblar: faqat O'QISH. Yozish — service_role funksiyalari orqali.
create policy attempts_admin_read on public.attempts for select to authenticated using (public.is_admin());
create policy attempts_teacher_read on public.attempts for select to authenticated
  using (public.is_teacher() and public.teaches_assessment(assessment_id));
create policy attempts_student_read on public.attempts for select to authenticated
  using (student_id = auth.uid() and public.student_can_see_results(id));

create policy answers_admin_read on public.answers for select to authenticated using (public.is_admin());
create policy answers_teacher_read on public.answers for select to authenticated
  using (public.is_teacher() and public.teaches_attempt(attempt_id));
create policy answers_student_read on public.answers for select to authenticated
  using (public.student_can_see_results(attempt_id));

create policy audit_admin_read on public.audit_log for select to authenticated using (public.is_admin());
create policy audit_teacher_read on public.audit_log for select to authenticated
  using (public.is_teacher() and assessment_id is not null and public.teaches_assessment(assessment_id));
create policy audit_student_read on public.audit_log for select to authenticated
  using (subject_student_id = auth.uid() and attempt_id is not null and public.student_can_see_results(attempt_id));

-- ── Atomik server funksiyalari (FAQAT service_role) ─────────────
create function public.app_start_attempt(
  p_assessment_id uuid, p_student_id uuid, p_seed text, p_answers jsonb
) returns public.attempts
language plpgsql security definer set search_path = public as $$
declare
  a public.assessments%rowtype;
  s public.profiles%rowtype;
  t public.attempts%rowtype;
begin
  select * into a from public.assessments where id = p_assessment_id;
  if not found or not a.is_published then raise exception 'not_found'; end if;
  select * into s from public.profiles where id = p_student_id and role = 'student' and is_active;
  if not found or s.group_id is distinct from a.group_id then raise exception 'not_your_group'; end if;

  -- Avval boshlangan bo'lsa — o'sha urinish qaytariladi (qayta kirish)
  select * into t from public.attempts where assessment_id = p_assessment_id and student_id = p_student_id;
  if found then return t; end if;

  if now() < a.opens_at then raise exception 'not_open'; end if;
  if now() >= a.closes_at then raise exception 'closed'; end if;

  insert into public.attempts (assessment_id, student_id, started_at, deadline_at, seed)
  values (p_assessment_id, p_student_id, now(),
          least(now() + make_interval(mins => a.duration_minutes), a.closes_at), p_seed)
  returning * into t;

  insert into public.answers (attempt_id, question_id, position, points_max, variant)
  select t.id, (e ->> 'question_id')::uuid, (e ->> 'position')::int, (e ->> 'points_max')::numeric,
         coalesce(e -> 'variant', '{}')
  from jsonb_array_elements(p_answers) e;
  return t;
end $$;

-- Javobni saqlash (avtosaqlash). Vaqt chegarasi DB soati bilan tekshiriladi.
create function public.app_save_answers(
  p_attempt_id uuid, p_student_id uuid, p_items jsonb, p_grace_ms integer default 5000
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  t public.attempts%rowtype;
  n integer := 0;
  e jsonb;
begin
  select * into t from public.attempts where id = p_attempt_id and student_id = p_student_id;
  if not found then raise exception 'not_found'; end if;
  if t.status <> 'in_progress' then raise exception 'already_submitted'; end if;
  if now() > t.deadline_at + make_interval(secs => p_grace_ms / 1000.0) then raise exception 'time_over'; end if;

  for e in select * from jsonb_array_elements(p_items) loop
    update public.answers set response = e -> 'response', answered_at = now()
    where attempt_id = p_attempt_id and question_id = (e ->> 'question_id')::uuid;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Topshirish: avtomatik baholangan natijalarni yozadi. Tekshirilishi kerak javob qolmasa — darrov tasdiqlanadi.
-- p_results: [{answer_id, score|null, is_correct|null, needs_review}]
create function public.app_submit_attempt(p_attempt_id uuid, p_results jsonb)
returns public.attempts
language plpgsql security definer set search_path = public as $$
declare
  t public.attempts%rowtype;
  pending integer;
begin
  select * into t from public.attempts where id = p_attempt_id for update;
  if not found then raise exception 'not_found'; end if;
  if t.status <> 'in_progress' then return t; end if;   -- ikkinchi marta topshirish: o'zgarmaydi

  update public.answers a set
    score = (r ->> 'score')::numeric,
    is_correct = (r ->> 'is_correct')::boolean,
    needs_review = coalesce((r ->> 'needs_review')::boolean, false)
  from jsonb_array_elements(p_results) r
  where a.id = (r ->> 'answer_id')::uuid and a.attempt_id = p_attempt_id;

  select count(*) into pending from public.answers where attempt_id = p_attempt_id and needs_review;

  update public.attempts set
    status = case when pending = 0 then 'finalized'::public.attempt_status else 'submitted'::public.attempt_status end,
    submitted_at = now(),
    finalized_at = case when pending = 0 then now() end,
    total_score = (select coalesce(sum(score), 0) from public.answers where attempt_id = p_attempt_id),
    max_score = (select coalesce(sum(points_max), 0) from public.answers where attempt_id = p_attempt_id)
  where id = p_attempt_id
  returning * into t;
  return t;
end $$;

-- O'qituvchi bahosi / ball o'zgartirish. O'zgartirishda sabab SHART; hammasi audit_log ga yoziladi.
create function public.app_set_answer_score(
  p_answer_id uuid, p_score numeric, p_is_correct boolean, p_actor uuid,
  p_reason text default null, p_feedback text default null, p_rubric jsonb default null
) returns table (out_attempt_id uuid, out_total numeric, out_old numeric)
language plpgsql security definer set search_path = public as $$
declare
  a public.answers%rowtype;
  t public.attempts%rowtype;
  v_total numeric;
begin
  select * into a from public.answers where id = p_answer_id for update;
  if not found then raise exception 'not_found'; end if;
  select * into t from public.attempts where id = a.attempt_id;
  if t.status = 'in_progress' then raise exception 'attempt_in_progress'; end if;
  if p_score < 0 or p_score > a.points_max then raise exception 'score_out_of_range'; end if;
  if a.score is not null and a.score is distinct from p_score and coalesce(btrim(p_reason), '') = '' then
    raise exception 'reason_required';
  end if;

  update public.answers set
    score = p_score, is_correct = p_is_correct, needs_review = false,
    graded_by = p_actor, graded_at = now(),
    feedback = coalesce(p_feedback, feedback), rubric_scores = coalesce(p_rubric, rubric_scores)
  where id = p_answer_id;

  select coalesce(sum(score), 0) into v_total from public.answers where attempt_id = a.attempt_id;
  update public.attempts set total_score = v_total where id = a.attempt_id;

  if a.score is distinct from p_score then
    insert into public.audit_log (actor_id, action, entity, entity_id, subject_student_id, attempt_id, assessment_id,
                                  old_value, new_value, reason)
    values (p_actor, case when a.score is null then 'score.set' else 'score.adjust' end, 'answer', p_answer_id,
            t.student_id, t.id, t.assessment_id,
            jsonb_build_object('score', a.score), jsonb_build_object('score', p_score), p_reason);
  end if;
  return query select a.attempt_id, v_total, a.score;
end $$;

-- O'qituvchi yakuniy tasdig'i (tekshirilmagan javob qolmagan bo'lsa)
create function public.app_finalize_attempt(p_attempt_id uuid, p_actor uuid)
returns public.attempts
language plpgsql security definer set search_path = public as $$
declare t public.attempts%rowtype;
begin
  select * into t from public.attempts where id = p_attempt_id for update;
  if not found then raise exception 'not_found'; end if;
  if t.status = 'in_progress' then raise exception 'attempt_in_progress'; end if;
  if t.status = 'finalized' then return t; end if;
  if exists (select 1 from public.answers where attempt_id = p_attempt_id and needs_review) then
    raise exception 'pending_review';
  end if;
  update public.attempts set status = 'finalized', finalized_at = now(), finalized_by = p_actor
  where id = p_attempt_id returning * into t;
  insert into public.audit_log (actor_id, action, entity, entity_id, subject_student_id, attempt_id, assessment_id, new_value)
  values (p_actor, 'attempt.finalize', 'attempt', t.id, t.student_id, t.id, t.assessment_id,
          jsonb_build_object('total_score', t.total_score, 'max_score', t.max_score));
  return t;
end $$;

-- Sahifadan chiqish signali (faqat hisoblagich)
create function public.app_attempt_leave(p_attempt_id uuid, p_student_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.attempts set leave_count = leave_count + 1, last_leave_at = now()
  where id = p_attempt_id and student_id = p_student_id and status = 'in_progress'
$$;

-- Bu funksiyalarni faqat service_role chaqira oladi (foydalanuvchi JWT'i bilan emas)
revoke execute on function
  public.app_start_attempt(uuid, uuid, text, jsonb),
  public.app_save_answers(uuid, uuid, jsonb, integer),
  public.app_submit_attempt(uuid, jsonb),
  public.app_set_answer_score(uuid, numeric, boolean, uuid, text, text, jsonb),
  public.app_finalize_attempt(uuid, uuid),
  public.app_attempt_leave(uuid, uuid)
from public, anon, authenticated;
grant execute on function
  public.app_start_attempt(uuid, uuid, text, jsonb),
  public.app_save_answers(uuid, uuid, jsonb, integer),
  public.app_submit_attempt(uuid, jsonb),
  public.app_set_answer_score(uuid, numeric, boolean, uuid, text, text, jsonb),
  public.app_finalize_attempt(uuid, uuid),
  public.app_attempt_leave(uuid, uuid)
to service_role;
