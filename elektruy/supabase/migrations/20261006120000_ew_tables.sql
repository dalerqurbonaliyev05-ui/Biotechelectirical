-- ElektrUy: core tables. Everything is prefixed with ew_ (tables) or lives in the
-- ew_private schema (helper functions) so nothing that already exists in the shared
-- Supabase project is touched.

create schema if not exists ew_private;
revoke all on schema ew_private from public;
grant usage on schema ew_private to authenticated, service_role;

-- ---------------------------------------------------------------- users & config
create table public.ew_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 120),
  avatar_url text check (char_length(avatar_url) <= 1000),
  language text not null default 'uz' check (language in ('uz', 'ru', 'en')),
  region text not null default 'tashkent_city',
  currency text not null default 'UZS' check (currency in ('UZS', 'USD')),
  units text not null default 'm' check (units in ('m', 'cm')),
  voice_guide boolean not null default true,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ew_admins (
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  user_id uuid references auth.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table public.ew_app_config (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table public.ew_app_config_history (
  id bigint generated always as identity primary key,
  key text not null,
  value jsonb not null,
  version int not null,
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index ew_app_config_history_key_idx on public.ew_app_config_history (key, version desc);
create index ew_app_config_history_changed_by_idx on public.ew_app_config_history (changed_by);
create index ew_app_config_updated_by_idx on public.ew_app_config (updated_by);

create table public.ew_legal_texts (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('disclaimer', 'disclaimer_short', 'privacy')),
  version int not null check (version > 0),
  lang text not null check (lang in ('uz', 'ru', 'en')),
  body text not null check (char_length(body) <= 20000),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  unique (kind, version, lang)
);
create index ew_legal_texts_created_by_idx on public.ew_legal_texts (created_by);

create table public.ew_consents (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('disclaimer', 'privacy', 'safety_gate')),
  version int not null default 1 check (version > 0),
  context jsonb not null default '{}'::jsonb,
  accepted_at timestamptz not null default now() check (accepted_at <= now() + interval '5 minutes')
);
create index ew_consents_user_idx on public.ew_consents (user_id, type, version desc);

-- ---------------------------------------------------------------- projects
create table public.ew_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 120),
  room_length numeric(6, 2) check (room_length is null or room_length between 0.5 and 30),
  room_width numeric(6, 2) check (room_width is null or room_width between 0.5 and 30),
  room_height numeric(6, 2) check (room_height is null or room_height between 1.8 and 6),
  wall_material text check (wall_material in ('brick', 'concrete', 'gypsum', 'wood')),
  wiring_type text check (wiring_type in ('hidden', 'open')),
  answers jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  out_of_scope boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'planned', 'in_progress', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ew_projects_user_idx on public.ew_projects (user_id, updated_at desc);
create index ew_projects_created_idx on public.ew_projects (created_at);

create table public.ew_project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ew_projects (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null check (char_length(storage_path) <= 500),
  sort_order int not null default 0,
  wall text check (wall in ('A', 'B', 'C', 'D')),
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index ew_project_photos_project_idx on public.ew_project_photos (project_id, sort_order);
create index ew_project_photos_user_idx on public.ew_project_photos (user_id);

create table public.ew_markers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ew_projects (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  photo_id uuid references public.ew_project_photos (id) on delete set null,
  type text not null check (type in ('input', 'socket', 'switch', 'lamp', 'junction_box')),
  x real check (x is null or x between 0 and 1),
  y real check (y is null or y between 0 and 1),
  pos3d jsonb,
  note text check (char_length(note) <= 300),
  link_key uuid,
  created_at timestamptz not null default now()
);
create index ew_markers_project_idx on public.ew_markers (project_id);
create index ew_markers_photo_idx on public.ew_markers (photo_id);
create index ew_markers_user_idx on public.ew_markers (user_id);

-- ---------------------------------------------------------------- lessons
create table public.ew_lessons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  sort_order int not null default 0,
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  est_minutes int not null default 10 check (est_minutes between 1 and 600),
  icon text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ew_lesson_translations (
  lesson_id uuid not null references public.ew_lessons (id) on delete cascade,
  lang text not null check (lang in ('uz', 'ru', 'en')),
  title text not null check (char_length(title) <= 200),
  summary text not null default '' check (char_length(summary) <= 1000),
  primary key (lesson_id, lang)
);

create table public.ew_lesson_steps (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.ew_lessons (id) on delete cascade,
  sort_order int not null default 0,
  image_path text,
  illustration text,
  tools jsonb not null default '[]'::jsonb check (jsonb_typeof(tools) = 'array'),
  created_at timestamptz not null default now()
);
create index ew_lesson_steps_lesson_idx on public.ew_lesson_steps (lesson_id, sort_order);

create table public.ew_lesson_step_translations (
  step_id uuid not null references public.ew_lesson_steps (id) on delete cascade,
  lang text not null check (lang in ('uz', 'ru', 'en')),
  text text not null check (char_length(text) <= 4000),
  warning text not null default '' check (char_length(warning) <= 1000),
  primary key (step_id, lang)
);

create table public.ew_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.ew_lessons (id) on delete cascade,
  sort_order int not null default 0,
  correct_index smallint not null default 0 check (correct_index between 0 and 5)
);
create index ew_quiz_questions_lesson_idx on public.ew_quiz_questions (lesson_id, sort_order);

create table public.ew_quiz_question_translations (
  question_id uuid not null references public.ew_quiz_questions (id) on delete cascade,
  lang text not null check (lang in ('uz', 'ru', 'en')),
  question text not null check (char_length(question) <= 1000),
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  explanation text not null default '' check (char_length(explanation) <= 2000),
  primary key (question_id, lang)
);

create table public.ew_lesson_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.ew_lessons (id) on delete cascade,
  step_index int not null default 0 check (step_index >= 0),
  checked_steps jsonb not null default '[]'::jsonb,
  quiz_score int check (quiz_score is null or quiz_score between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index ew_lesson_progress_lesson_idx on public.ew_lesson_progress (lesson_id);

-- ---------------------------------------------------------------- materials & prices
create table public.ew_regions (
  code text primary key check (code ~ '^[a-z_]+$'),
  name_uz text not null,
  name_ru text not null,
  name_en text not null,
  sort_order int not null default 0
);

create table public.ew_materials (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_]+$'),
  category text not null default 'other',
  unit text not null check (unit in ('m', 'pcs', 'kg')),
  default_price numeric(14, 2) not null default 0 check (default_price >= 0),
  currency text not null default 'UZS' check (currency in ('UZS', 'USD')),
  sort_order int not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.ew_material_translations (
  material_id uuid not null references public.ew_materials (id) on delete cascade,
  lang text not null check (lang in ('uz', 'ru', 'en')),
  name text not null check (char_length(name) <= 200),
  primary key (material_id, lang)
);

create table public.ew_material_prices (
  material_id uuid not null references public.ew_materials (id) on delete cascade,
  region text not null references public.ew_regions (code) on delete cascade,
  price numeric(14, 2) not null check (price >= 0),
  currency text not null default 'UZS' check (currency in ('UZS', 'USD')),
  updated_at timestamptz not null default now(),
  primary key (material_id, region)
);
create index ew_material_prices_region_idx on public.ew_material_prices (region);

-- ---------------------------------------------------------------- electricians
create table public.ew_electricians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  telegram text check (telegram is null or telegram ~ '^@?[A-Za-z0-9_]{4,64}$'),
  city text not null references public.ew_regions (code),
  district text check (char_length(district) <= 120),
  experience_years int not null default 0 check (experience_years between 0 and 70),
  price_from numeric(14, 2) check (price_from is null or price_from >= 0),
  price_to numeric(14, 2) check (price_to is null or price_to >= 0),
  bio text check (char_length(bio) <= 2000),
  services text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'blocked')),
  rating_avg numeric(3, 2) not null default 0,
  rating_count int not null default 0,
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ew_electricians_search_idx on public.ew_electricians (status, city, district);
create index ew_electricians_reviewed_by_idx on public.ew_electricians (reviewed_by);

create table public.ew_reviews (
  id uuid primary key default gen_random_uuid(),
  electrician_id uuid not null references public.ew_electricians (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  text text check (char_length(text) <= 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (electrician_id, user_id)
);
create index ew_reviews_user_idx on public.ew_reviews (user_id);

-- ---------------------------------------------------------------- AI, reports, audit
create table public.ew_work_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid references public.ew_projects (id) on delete set null,
  image_paths text[] not null,
  lang text not null default 'uz' check (lang in ('uz', 'ru', 'en')),
  overall text check (overall in ('ok', 'warning', 'critical', 'unclear')),
  result jsonb not null default '{}'::jsonb,
  flagged_wrong boolean not null default false,
  user_feedback text check (char_length(user_feedback) <= 1000),
  admin_status text not null default 'none' check (admin_status in ('none', 'reviewed', 'wrong', 'confirmed')),
  admin_note text,
  created_at timestamptz not null default now()
);
create index ew_work_checks_user_idx on public.ew_work_checks (user_id, created_at desc);
create index ew_work_checks_project_idx on public.ew_work_checks (project_id);
create index ew_work_checks_flagged_idx on public.ew_work_checks (flagged_wrong) where flagged_wrong;

create table public.ew_ai_calls (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  fn text not null,
  ok boolean not null default false,
  duration_ms int,
  input_tokens int,
  output_tokens int,
  error text,
  created_at timestamptz not null default now()
);
create index ew_ai_calls_user_idx on public.ew_ai_calls (user_id, fn, created_at desc);
create index ew_ai_calls_created_idx on public.ew_ai_calls (created_at);

create table public.ew_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('lesson', 'content', 'electrician', 'review', 'ai_check', 'other')),
  target text check (char_length(target) <= 200),
  text text not null check (char_length(text) between 1 and 2000),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);
create index ew_reports_status_idx on public.ew_reports (status, created_at desc);
create index ew_reports_user_idx on public.ew_reports (user_id);
create index ew_reports_resolved_by_idx on public.ew_reports (resolved_by);

create table public.ew_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  table_name text not null,
  row_pk text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index ew_audit_log_created_idx on public.ew_audit_log (created_at desc);

-- Lock down until the security migration adds policies (RLS on, no policies = no access).
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'ew\_%' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
