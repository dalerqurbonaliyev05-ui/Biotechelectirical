-- =====================================================================
-- FIZIKA ILOVASI — Supabase sxemasi (barcha jadvallar "fizika_" prefiksi bilan)
-- O'quvchi (6–11 sinf) va abituriyent panellari, testlar, o'yinlar,
-- reyting, sovg'alar, admin panel.
-- =====================================================================

-- ---------- Admin e-pochtalari (birinchi admin) ----------
create table if not exists public.fizika_admin_emails (
  email text primary key
);
insert into public.fizika_admin_emails(email) values ('dalerqurbonaliyev05@gmail.com')
  on conflict do nothing;

-- ---------- Profil ----------
create table if not exists public.fizika_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar text default '⚛️',
  role_type text not null check (role_type in ('student','abiturient')),
  grade smallint check (grade between 6 and 11),
  region text not null default 'Toshkent shahri',
  district text,
  school text,
  target_university text,
  xp integer not null default 0,
  coins integer not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  last_active date,
  hearts smallint not null default 5,
  is_admin boolean not null default false,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fizika_grade_required check (role_type <> 'student' or grade is not null)
);
create index if not exists fizika_profiles_xp_idx on public.fizika_profiles (xp desc);
create index if not exists fizika_profiles_region_idx on public.fizika_profiles (region, xp desc);

-- admin tekshiruvi
create or replace function public.fizika_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.fizika_profiles where id = auth.uid()), false)
      or exists(select 1 from public.fizika_admin_emails e
                where lower(e.email) = lower(coalesce(auth.jwt() ->> 'email','')));
$$;

-- ---------- Mavzular ----------
create table if not exists public.fizika_topics (
  id text primary key,
  title text not null,
  grades smallint[] not null default '{}',
  section text,
  sort integer not null default 0
);

-- ---------- Savollar banki ----------
create table if not exists public.fizika_questions (
  id bigserial primary key,
  ext_id text unique,
  source text not null default 'admin',
  source_ref text,
  topic text references public.fizika_topics(id) on update cascade on delete set null,
  grades smallint[] not null default '{}',
  audience text[] not null default '{student,abiturient}',
  qtype text not null check (qtype in ('mc','matching','open','open2')),
  difficulty smallint not null default 2 check (difficulty between 1 and 5),
  stem text not null,
  options jsonb,
  tasks jsonb,
  answer jsonb not null,
  explanation text,
  figure text,
  full_image text,
  options_image text,
  exam_tag text,
  verified boolean not null default false,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fizika_q_topic_idx on public.fizika_questions(topic);
create index if not exists fizika_q_diff_idx on public.fizika_questions(difficulty);
create index if not exists fizika_q_grades_idx on public.fizika_questions using gin(grades);
create index if not exists fizika_q_exam_idx on public.fizika_questions(exam_tag);

-- Javobsiz ko'rinish (mijozlarga)
create or replace view public.fizika_questions_public
with (security_invoker = false) as
  select id, ext_id, source, topic, grades, audience, qtype, difficulty, stem, options, tasks,
         figure, full_image, options_image, exam_tag, verified
  from public.fizika_questions where active;

-- ---------- Urinishlar ----------
create table if not exists public.fizika_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,               -- grade_test | abit_test | daily | milliy | topic | marathon
  title text,
  grade smallint,
  topic text,
  question_ids bigint[] not null default '{}',
  total integer not null default 0,
  correct integer not null default 0,
  score numeric(6,2) not null default 0,
  xp_earned integer not null default 0,
  coins_earned integer not null default 0,
  status text not null default 'active' check (status in ('active','finished')),
  instant_feedback boolean not null default true,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  meta jsonb not null default '{}'
);
create index if not exists fizika_attempts_user_idx on public.fizika_attempts(user_id, started_at desc);
create index if not exists fizika_attempts_mode_idx on public.fizika_attempts(mode, started_at desc);

create table if not exists public.fizika_attempt_items (
  attempt_id uuid not null references public.fizika_attempts(id) on delete cascade,
  question_id bigint not null references public.fizika_questions(id) on delete cascade,
  user_id uuid not null,
  answer jsonb,
  is_correct boolean,
  points numeric(5,2) not null default 0,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);
create index if not exists fizika_items_q_idx on public.fizika_attempt_items(question_id);

-- ---------- O'yinlar natijasi ----------
create table if not exists public.fizika_game_scores (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game text not null,
  score integer not null default 0,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists fizika_games_user_idx on public.fizika_game_scores(user_id, created_at desc);

-- ---------- Sovg'alar / nishonlar ----------
create table if not exists public.fizika_rewards (
  id text primary key,
  title text not null,
  description text,
  icon text not null default '🏅',
  kind text not null default 'badge' check (kind in ('badge','gift','title','avatar')),
  cost_coins integer not null default 0,
  audience text not null default 'all' check (audience in ('all','student','abiturient')),
  rule jsonb not null default '{}',   -- {"xp":500} | {"streak":7} | {"tests":10} | {"perfect":1} | {"games":5}
  sort integer not null default 0,
  active boolean not null default true
);
create table if not exists public.fizika_user_rewards (
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id text not null references public.fizika_rewards(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, reward_id)
);

-- ---------- Xatolik haqida xabarlar ----------
create table if not exists public.fizika_reports (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  question_id bigint references public.fizika_questions(id) on delete cascade,
  message text not null,
  status text not null default 'new' check (status in ('new','fixed','rejected')),
  created_at timestamptz not null default now()
);

-- ---------- E'lonlar ----------
create table if not exists public.fizika_announcements (
  id bigserial primary key,
  title text not null,
  body text,
  audience text not null default 'all',
  created_at timestamptz not null default now()
);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.fizika_admin_emails enable row level security;
alter table public.fizika_profiles enable row level security;
alter table public.fizika_topics enable row level security;
alter table public.fizika_questions enable row level security;
alter table public.fizika_attempts enable row level security;
alter table public.fizika_attempt_items enable row level security;
alter table public.fizika_game_scores enable row level security;
alter table public.fizika_rewards enable row level security;
alter table public.fizika_user_rewards enable row level security;
alter table public.fizika_reports enable row level security;
alter table public.fizika_announcements enable row level security;

-- admin_emails: faqat admin
drop policy if exists fz_admin_emails_admin on public.fizika_admin_emails;
create policy fz_admin_emails_admin on public.fizika_admin_emails for all
  using (public.fizika_is_admin()) with check (public.fizika_is_admin());

-- profiles
drop policy if exists fz_prof_self_select on public.fizika_profiles;
create policy fz_prof_self_select on public.fizika_profiles for select
  using (id = auth.uid() or public.fizika_is_admin());
drop policy if exists fz_prof_self_insert on public.fizika_profiles;
create policy fz_prof_self_insert on public.fizika_profiles for insert
  with check (id = auth.uid() and xp = 0 and coins = 0 and is_admin = false);
drop policy if exists fz_prof_admin_update on public.fizika_profiles;
create policy fz_prof_admin_update on public.fizika_profiles for update
  using (public.fizika_is_admin()) with check (public.fizika_is_admin());
drop policy if exists fz_prof_admin_delete on public.fizika_profiles;
create policy fz_prof_admin_delete on public.fizika_profiles for delete using (public.fizika_is_admin());

-- topics: hamma o'qiydi, admin yozadi
drop policy if exists fz_topics_read on public.fizika_topics;
create policy fz_topics_read on public.fizika_topics for select using (true);
drop policy if exists fz_topics_admin on public.fizika_topics;
create policy fz_topics_admin on public.fizika_topics for all
  using (public.fizika_is_admin()) with check (public.fizika_is_admin());

-- questions: to'g'ridan-to'g'ri jadval faqat admin uchun (javoblar yashirin)
drop policy if exists fz_q_admin on public.fizika_questions;
create policy fz_q_admin on public.fizika_questions for all
  using (public.fizika_is_admin()) with check (public.fizika_is_admin());

-- attempts & items: egasi o'qiydi; yozish faqat RPC orqali
drop policy if exists fz_att_read on public.fizika_attempts;
create policy fz_att_read on public.fizika_attempts for select
  using (user_id = auth.uid() or public.fizika_is_admin());
drop policy if exists fz_items_read on public.fizika_attempt_items;
create policy fz_items_read on public.fizika_attempt_items for select
  using (user_id = auth.uid() or public.fizika_is_admin());
drop policy if exists fz_games_read on public.fizika_game_scores;
create policy fz_games_read on public.fizika_game_scores for select
  using (user_id = auth.uid() or public.fizika_is_admin());

-- rewards
drop policy if exists fz_rew_read on public.fizika_rewards;
create policy fz_rew_read on public.fizika_rewards for select using (true);
drop policy if exists fz_rew_admin on public.fizika_rewards;
create policy fz_rew_admin on public.fizika_rewards for all
  using (public.fizika_is_admin()) with check (public.fizika_is_admin());
drop policy if exists fz_urew_read on public.fizika_user_rewards;
create policy fz_urew_read on public.fizika_user_rewards for select
  using (user_id = auth.uid() or public.fizika_is_admin());

-- reports
drop policy if exists fz_rep_insert on public.fizika_reports;
create policy fz_rep_insert on public.fizika_reports for insert
  with check (user_id = auth.uid());
drop policy if exists fz_rep_admin on public.fizika_reports;
create policy fz_rep_admin on public.fizika_reports for all
  using (public.fizika_is_admin()) with check (public.fizika_is_admin());

-- announcements
drop policy if exists fz_ann_read on public.fizika_announcements;
create policy fz_ann_read on public.fizika_announcements for select using (true);
drop policy if exists fz_ann_admin on public.fizika_announcements;
create policy fz_ann_admin on public.fizika_announcements for all
  using (public.fizika_is_admin()) with check (public.fizika_is_admin());

-- Ko'rinishga ruxsat: faqat tizimga kirganlar
revoke all on public.fizika_questions_public from anon;
grant select on public.fizika_questions_public to authenticated;
