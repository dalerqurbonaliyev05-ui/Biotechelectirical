-- ════════════════════════════════════════════════════════════════
-- 0008 — Slayd miniatyuralari, nazorat nuqtalari (checkpoint), slayd kitoblari (+ RLS)
-- Nazorat nuqtasi = "shu slayddan KEYIN" so'raladigan savol(lar). O'qituvchi keyingi slaydga o'tmoqchi bo'lganda
-- doska to'xtab savolni chiqaradi (8-bosqich). Oxirgi slayddan keyingi nuqta — yakuniy test.
-- ════════════════════════════════════════════════════════════════

create table public.lecture_slides (
  lecture_id uuid not null references public.lectures (id) on delete cascade,
  slide_no integer not null check (slide_no >= 1),
  thumb_path text,                       -- Storage: <o'qituvchi_id>/<fayl>/<n>.jpg
  primary key (lecture_id, slide_no)
);

create table public.lecture_checkpoints (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures (id) on delete cascade,
  after_slide integer not null check (after_slide >= 1),
  kind text not null default 'checkpoint' check (kind in ('checkpoint', 'final')),
  created_at timestamptz not null default now(),
  unique (lecture_id, after_slide)
);

-- Nuqta ichidagi savollar: tartib, vaqt (lecture_questions.time_limit_sec), bonus belgisi
alter table public.lecture_questions
  add column checkpoint_id uuid references public.lecture_checkpoints (id) on delete cascade,
  add column position integer not null default 0,
  add column is_bonus boolean not null default false;
create index lecture_questions_checkpoint_idx on public.lecture_questions (checkpoint_id, position);

create table public.slide_books (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures (id) on delete cascade,
  slide_no integer not null check (slide_no >= 1),
  title text not null check (length(btrim(title)) > 0),
  slug text not null check (slug ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$'),
  page integer check (page is null or page >= 1),
  created_at timestamptz not null default now()
);
create index slide_books_lecture_idx on public.slide_books (lecture_id, slide_no);

alter table public.lecture_slides enable row level security;
alter table public.lecture_checkpoints enable row level security;
alter table public.slide_books enable row level security;

create policy ls_admin on public.lecture_slides for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ls_teacher_read on public.lecture_slides for select to authenticated using (public.is_teacher() and public.lecture_visible(lecture_id));
create policy ls_teacher_write on public.lecture_slides for all to authenticated
  using (public.is_teacher() and public.lecture_owned(lecture_id)) with check (public.is_teacher() and public.lecture_owned(lecture_id));

create policy lc_admin on public.lecture_checkpoints for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy lc_teacher_read on public.lecture_checkpoints for select to authenticated using (public.is_teacher() and public.lecture_visible(lecture_id));
create policy lc_teacher_write on public.lecture_checkpoints for all to authenticated
  using (public.is_teacher() and public.lecture_owned(lecture_id)) with check (public.is_teacher() and public.lecture_owned(lecture_id));

create policy sb_admin on public.slide_books for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy sb_teacher_read on public.slide_books for select to authenticated using (public.is_teacher() and public.lecture_visible(lecture_id));
create policy sb_teacher_write on public.slide_books for all to authenticated
  using (public.is_teacher() and public.lecture_owned(lecture_id)) with check (public.is_teacher() and public.lecture_owned(lecture_id));
