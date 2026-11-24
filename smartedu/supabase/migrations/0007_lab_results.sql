-- ════════════════════════════════════════════════════════════════
-- 0007 — Tashqi laboratoriya natijalari (+ RLS)
-- Natija `POST /api/lab/submit` orqali (HMAC imzolangan so'rov) keladi; faqat server (service_role) yozadi.
-- ════════════════════════════════════════════════════════════════

create table public.lab_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  lab_id text not null check (lab_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$'),
  score numeric(8, 2) not null check (score >= 0),
  max_score numeric(8, 2) not null check (max_score > 0),
  passed boolean,
  details jsonb,                                   -- laboratoriya saytidan ixtiyoriy tafsilot (vaqt, urinishlar ...)
  lab_time timestamptz not null,                   -- laboratoriya saytining o'zi ko'rsatgan vaqt (imzo ichida)
  received_at timestamptz not null default now(),  -- serverga kelgan vaqt (ball oynasi shu bo'yicha)
  nonce text not null unique,                      -- bir martalik: takroriy yuborishdan (replay) himoya
  check (score <= max_score)
);
create index lab_results_student_lab_idx on public.lab_results (student_id, lab_id, received_at desc);

alter table public.lab_results enable row level security;
create policy lab_results_own on public.lab_results for select to authenticated using (student_id = auth.uid());
create policy lab_results_admin on public.lab_results for select to authenticated using (public.is_admin());
-- O'qituvchi: faqat o'z guruhlaridagi talabalarning natijalari
create policy lab_results_teacher on public.lab_results for select to authenticated
  using (public.is_teacher() and exists (
    select 1 from public.profiles p where p.id = lab_results.student_id and p.group_id is not null and public.teaches_group(p.group_id)
  ));
