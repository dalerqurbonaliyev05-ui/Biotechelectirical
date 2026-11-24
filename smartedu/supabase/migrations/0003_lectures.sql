-- ════════════════════════════════════════════════════════════════
-- 0003 — Ma'ruzalar (PDF) va slaydga biriktirilgan savollar (+ RLS, Storage)
-- ════════════════════════════════════════════════════════════════

create table public.lectures (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  title text not null check (length(btrim(title)) > 0),
  pdf_path text not null,                 -- Storage: lectures/<o'qituvchi_id>/<fayl>.pdf
  page_count integer not null check (page_count between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lectures_subject_idx on public.lectures (subject_id);
create trigger lectures_touch before update on public.lectures
  for each row execute function public.touch_updated_at();

-- Slaydga biriktirilgan jonli savollar (reja). Dars paytida `session_questions` ga nusxalanadi.
create table public.lecture_questions (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures (id) on delete cascade,
  slide_no integer not null check (slide_no >= 1),
  question_id uuid not null references public.questions (id) on delete restrict,
  time_limit_sec integer check (time_limit_sec is null or time_limit_sec between 5 and 600), -- bo'sh = sozlamadagi standart
  created_at timestamptz not null default now(),
  unique (lecture_id, slide_no, question_id)
);
create index lecture_questions_lecture_idx on public.lecture_questions (lecture_id, slide_no);

create function public.lecture_visible(lid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lectures l where l.id = lid and public.teaches_subject(l.subject_id))
$$;
create function public.lecture_owned(lid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lectures l where l.id = lid and l.created_by = auth.uid())
$$;

alter table public.lectures enable row level security;
alter table public.lecture_questions enable row level security;

-- Talabaga ma'ruza jadvallariga to'g'ridan-to'g'ri kirish YO'Q (slayd/savol dars paytida server orqali).
create policy lectures_admin on public.lectures for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy lectures_teacher_read on public.lectures for select to authenticated
  using (public.is_teacher() and public.teaches_subject(subject_id));
create policy lectures_teacher_insert on public.lectures for insert to authenticated
  with check (public.is_teacher() and created_by = auth.uid() and public.teaches_subject(subject_id));
create policy lectures_teacher_update on public.lectures for update to authenticated
  using (public.is_teacher() and created_by = auth.uid())
  with check (created_by = auth.uid() and public.teaches_subject(subject_id));
create policy lectures_teacher_delete on public.lectures for delete to authenticated
  using (public.is_teacher() and created_by = auth.uid());

create policy lq_admin on public.lecture_questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy lq_teacher_read on public.lecture_questions for select to authenticated
  using (public.is_teacher() and public.lecture_visible(lecture_id));
create policy lq_teacher_write on public.lecture_questions for all to authenticated
  using (public.is_teacher() and public.lecture_owned(lecture_id))
  with check (public.is_teacher() and public.lecture_owned(lecture_id) and public.question_visible(question_id));

-- ── Storage: shaxsiy bucket, faqat PDF, 50 MB ───────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lectures', 'lectures', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

-- O'qituvchi faqat O'Z papkasiga (<uid>/...) yozadi/o'qiydi; admin — hammasiga.
-- Talabalarga siyosat yo'q: PDF ni faqat server (imzolangan havola) beradi.
create policy lectures_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'lectures' and (public.is_admin() or (public.is_teacher() and (storage.foldername(name))[1] = auth.uid()::text)));
create policy lectures_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'lectures' and (public.is_admin() or (public.is_teacher() and (storage.foldername(name))[1] = auth.uid()::text)));
create policy lectures_obj_update on storage.objects for update to authenticated
  using (bucket_id = 'lectures' and (public.is_admin() or (public.is_teacher() and (storage.foldername(name))[1] = auth.uid()::text)));
create policy lectures_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'lectures' and (public.is_admin() or (public.is_teacher() and (storage.foldername(name))[1] = auth.uid()::text)));
