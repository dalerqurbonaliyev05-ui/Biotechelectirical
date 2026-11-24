-- ════════════════════════════════════════════════════════════════
-- 0006 — Jonli savollar, javoblar va reyting (+ RLS)
--
-- Ball HISOBLASH mantig'i DB'da emas: u toza TypeScript funksiyasida (lib/live-score.ts, to'liq sinalgan).
-- DB faqat natijani atomik yozadi va "ikki marta javob"ni unique cheklov bilan taqiqlaydi.
-- Talabaga bu jadvallarga siyosat YO'Q: javob to'g'riligi savol yopilguncha oshkor bo'lmasin.
-- ════════════════════════════════════════════════════════════════

create table public.session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lecture_sessions (id) on delete cascade,
  lecture_question_id uuid references public.lecture_questions (id) on delete set null,
  question_id uuid not null references public.questions (id) on delete restrict,
  slide_no integer not null check (slide_no >= 1),
  time_limit_sec integer not null check (time_limit_sec between 5 and 600),
  variant jsonb not null default '{}',     -- butun auditoriya uchun BIR XIL (raqamli savol qiymatlari)
  opened_at timestamptz not null,          -- ilova (server) vaqti: ball hisoblash bilan bir xil soat
  closed_at timestamptz,                   -- bo'sh = savol hali ochiq
  created_at timestamptz not null default now()
);
-- Bir vaqtda bitta ochiq savol; rejalashtirilgan savol dars davomida bir marta so'raladi
create unique index session_questions_one_open on public.session_questions (session_id) where closed_at is null;
create unique index session_questions_once on public.session_questions (session_id, lecture_question_id) where lecture_question_id is not null;
create index session_questions_session_idx on public.session_questions (session_id, opened_at);

create table public.session_answers (
  id uuid primary key default gen_random_uuid(),
  session_question_id uuid not null references public.session_questions (id) on delete cascade,
  session_id uuid not null references public.lecture_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  response jsonb not null,
  is_correct boolean not null,
  points integer not null check (points >= 0),   -- to'g'ri javob uchun ball
  bonus integer not null check (bonus >= 0),     -- tezlik bonusi
  elapsed_ms integer not null check (elapsed_ms >= 0),
  answered_at timestamptz not null default now(),
  unique (session_question_id, student_id)       -- ikki marta javob berib bo'lmaydi
);
create index session_answers_session_idx on public.session_answers (session_id, student_id);

create table public.scores (
  session_id uuid not null references public.lecture_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  total_points integer not null default 0,
  correct_count integer not null default 0,
  answered_count integer not null default 0,
  correct_time_ms bigint not null default 0,     -- to'g'ri javoblarga ketgan jami vaqt (teng ballda: kamroq — yuqori o'rin)
  updated_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

alter table public.session_questions enable row level security;
alter table public.session_answers enable row level security;
alter table public.scores enable row level security;

create policy sq_admin on public.session_questions for select to authenticated using (public.is_admin());
create policy sq_teacher on public.session_questions for select to authenticated
  using (public.is_teacher() and public.session_visible(session_id));
create policy sa_admin on public.session_answers for select to authenticated using (public.is_admin());
create policy sa_teacher on public.session_answers for select to authenticated
  using (public.is_teacher() and public.session_visible(session_id));
create policy scores_admin on public.scores for select to authenticated using (public.is_admin());
create policy scores_teacher on public.scores for select to authenticated
  using (public.is_teacher() and public.session_visible(session_id));

-- Savolni ochish: avvalgi ochiq savol yopiladi, yangisi yaratiladi, sessiya `rev` oshadi.
create function public.app_open_session_question(
  p_session_id uuid, p_lecture_question_id uuid, p_question_id uuid, p_slide integer,
  p_limit integer, p_variant jsonb, p_opened_at timestamptz
) returns public.session_questions
language plpgsql security definer set search_path = public as $$
declare s public.lecture_sessions%rowtype; q public.session_questions%rowtype;
begin
  select * into s from public.lecture_sessions where id = p_session_id for update;
  if not found then raise exception 'not_found'; end if;
  if s.status <> 'active' then raise exception 'session_ended'; end if;
  update public.session_questions set closed_at = p_opened_at where session_id = p_session_id and closed_at is null;
  begin
    insert into public.session_questions (session_id, lecture_question_id, question_id, slide_no, time_limit_sec, variant, opened_at)
    values (p_session_id, p_lecture_question_id, p_question_id, p_slide, p_limit, coalesce(p_variant, '{}'), p_opened_at)
    returning * into q;
  exception when unique_violation then
    raise exception 'already_asked';
  end;
  update public.lecture_sessions set rev = rev + 1 where id = p_session_id;
  return q;
end $$;

-- Savolni yopish. Ochiq savol bo'lmasa 'no_open_question'.
create function public.app_close_session_question(p_session_id uuid, p_closed_at timestamptz)
returns public.session_questions
language plpgsql security definer set search_path = public as $$
declare q public.session_questions%rowtype;
begin
  perform 1 from public.lecture_sessions where id = p_session_id for update;
  update public.session_questions set closed_at = p_closed_at
    where session_id = p_session_id and closed_at is null returning * into q;
  if not found then raise exception 'no_open_question'; end if;
  update public.lecture_sessions set rev = rev + 1 where id = p_session_id;
  return q;
end $$;

-- Hisoblangan javobni atomik yozish. Ikkinchi urinish → 'duplicate' (ballga tegilmaydi).
create function public.app_record_live_answer(
  p_session_question_id uuid, p_student_id uuid, p_response jsonb,
  p_is_correct boolean, p_points integer, p_bonus integer, p_elapsed_ms integer
) returns table (out_status text, out_total integer)
language plpgsql security definer set search_path = public as $$
declare sq public.session_questions%rowtype; v_id uuid; v_total integer;
begin
  select * into sq from public.session_questions where id = p_session_question_id;
  if not found then raise exception 'not_found'; end if;
  insert into public.session_answers (session_question_id, session_id, student_id, response, is_correct, points, bonus, elapsed_ms)
  values (sq.id, sq.session_id, p_student_id, p_response, p_is_correct, p_points, p_bonus, p_elapsed_ms)
  on conflict (session_question_id, student_id) do nothing
  returning id into v_id;
  if v_id is null then
    select total_points into v_total from public.scores where session_id = sq.session_id and student_id = p_student_id;
    return query select 'duplicate'::text, coalesce(v_total, 0);
    return;
  end if;
  insert into public.scores (session_id, student_id, total_points, correct_count, answered_count, correct_time_ms)
  values (sq.session_id, p_student_id, p_points + p_bonus, case when p_is_correct then 1 else 0 end, 1,
          case when p_is_correct then p_elapsed_ms else 0 end)
  on conflict (session_id, student_id) do update set
    total_points = public.scores.total_points + excluded.total_points,
    correct_count = public.scores.correct_count + excluded.correct_count,
    answered_count = public.scores.answered_count + 1,
    correct_time_ms = public.scores.correct_time_ms + excluded.correct_time_ms,
    updated_at = now()
  returning total_points into v_total;
  return query select 'recorded'::text, v_total;
end $$;

revoke execute on function
  public.app_open_session_question(uuid, uuid, uuid, integer, integer, jsonb, timestamptz),
  public.app_close_session_question(uuid, timestamptz),
  public.app_record_live_answer(uuid, uuid, jsonb, boolean, integer, integer, integer)
from public, anon, authenticated;
grant execute on function
  public.app_open_session_question(uuid, uuid, uuid, integer, integer, jsonb, timestamptz),
  public.app_close_session_question(uuid, timestamptz),
  public.app_record_live_answer(uuid, uuid, jsonb, boolean, integer, integer, integer)
to service_role;
