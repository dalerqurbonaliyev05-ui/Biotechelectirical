-- ════════════════════════════════════════════════════════════════
-- 0001 — Hisoblar, tashkiliy tuzilma, sozlamalar (+ RLS)
--
-- Xavfsizlik tamoyili (butun loyiha bo'yicha):
--   * Talaba MA'LUMOT YOZMAYDI: barcha talaba yozuvlari serverdagi API (service role) orqali.
--   * Talaba faqat O'ZINING (va e'lon qilingan) ma'lumotini o'qiy oladi.
--   * Rol har doim `profiles.role` dan olinadi (JWT dagi da'voga ishonilmaydi).
-- ════════════════════════════════════════════════════════════════

create type public.user_role as enum ('admin', 'teacher', 'student');

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── Tashkiliy jadvallar ─────────────────────────────────────────
create table public.faculties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculties (id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  unique (faculty_id, name)
);

-- department_id bo'sh bo'lishi mumkin: CSV import guruhni avtomatik yaratganda kafedra noma'lum.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references public.departments (id) on delete set null,
  name text not null unique check (length(btrim(name)) > 0),
  course_year smallint check (course_year between 1 and 8),
  created_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references public.departments (id) on delete set null,
  name text not null unique check (length(btrim(name)) > 0),
  code text,
  created_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) > 0),
  building text,
  capacity integer check (capacity is null or capacity > 0),
  created_at timestamptz not null default now()
);

-- ── Profillar (auth.users bilan 1:1) ────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null check (length(btrim(full_name)) > 0),
  student_code text,
  email text, -- o'qituvchi/admin kirish emaili (talabada bo'sh: sintetik email ko'rsatilmaydi)
  group_id uuid references public.groups (id) on delete set null,
  department_id uuid references public.departments (id) on delete set null,
  must_change_password boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_has_code check (role <> 'student' or student_code is not null)
);
-- Talaba kodi katta-kichik harfga bog'liq emas (S001 = s001): login shunday ishlaydi.
create unique index profiles_student_code_ci on public.profiles (lower(student_code));
create index profiles_group_idx on public.profiles (group_id);
create index profiles_role_idx on public.profiles (role);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- O'qituvchi ↔ fan ↔ guruh biriktirilishi ("o'qituvchi faqat o'z fanlari va guruhlarini ko'radi")
create table public.teacher_subjects (
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  primary key (teacher_id, subject_id, group_id)
);
create index teacher_subjects_group_idx on public.teacher_subjects (group_id);

-- Sozlamalar (ball qoidalari va h.k.). Qiymatlar JSON.
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (key, value) values
  ('max_speed_bonus', '10'),       -- tezlik bonusi maksimumi (ball)
  ('correct_points', '100'),       -- to'g'ri javob uchun ball (ma'ruza rejimi)
  ('live_question_seconds', '30'), -- jonli savol uchun standart vaqt
  ('live_grace_ms', '1500'),       -- tarmoq kechikishi uchun "imtiyozli" vaqt (ms)
  ('qr_window_sec', '45')          -- QR davomat tokenining yashash oynasi
on conflict (key) do nothing;

-- ── Yordamchi funksiyalar (RLS siyosatlari uchun) ───────────────
-- SECURITY DEFINER: profiles jadvaliga RLS'siz murojaat (rekursiyaning oldini oladi).
create function public.app_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid() and is_active), false)
$$;

create function public.is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'teacher' from public.profiles where id = auth.uid() and is_active), false)
$$;

create function public.my_group_id() returns uuid
language sql stable security definer set search_path = public as $$
  select group_id from public.profiles where id = auth.uid() and is_active
$$;

create function public.teaches_group(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teacher_subjects ts
    join public.profiles p on p.id = ts.teacher_id and p.is_active
    where ts.teacher_id = auth.uid() and ts.group_id = gid
  )
$$;

create function public.teaches_subject(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teacher_subjects ts
    join public.profiles p on p.id = ts.teacher_id and p.is_active
    where ts.teacher_id = auth.uid() and ts.subject_id = sid
  )
$$;

create function public.teaches_subject_group(sid uuid, gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teacher_subjects ts
    join public.profiles p on p.id = ts.teacher_id and p.is_active
    where ts.teacher_id = auth.uid() and ts.subject_id = sid and ts.group_id = gid
  )
$$;

-- ── RLS ─────────────────────────────────────────────────────────
alter table public.faculties enable row level security;
alter table public.departments enable row level security;
alter table public.groups enable row level security;
alter table public.subjects enable row level security;
alter table public.rooms enable row level security;
alter table public.profiles enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.app_settings enable row level security;

-- Tashkiliy ma'lumotnomalar: kirgan har kim o'qiydi, faqat admin yozadi.
create policy faculties_read on public.faculties for select to authenticated using (true);
create policy faculties_admin on public.faculties for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy departments_read on public.departments for select to authenticated using (true);
create policy departments_admin on public.departments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy groups_read on public.groups for select to authenticated using (true);
create policy groups_admin on public.groups for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy subjects_read on public.subjects for select to authenticated using (true);
create policy subjects_admin on public.subjects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy rooms_read on public.rooms for select to authenticated using (true);
create policy rooms_admin on public.rooms for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Profillar: o'zini; o'qituvchi — o'z guruhlaridagi talabalarni; admin — hammasini.
create policy profiles_self on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_admin_read on public.profiles for select to authenticated using (public.is_admin());
create policy profiles_teacher_read on public.profiles for select to authenticated
  using (public.is_teacher() and role = 'student' and group_id is not null and public.teaches_group(group_id));
create policy profiles_admin_write on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- Diqqat: talaba/o'qituvchi uchun UPDATE siyosati YO'Q → o'z rolini o'zgartira olmaydi.

create policy teacher_subjects_admin on public.teacher_subjects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy teacher_subjects_own on public.teacher_subjects for select to authenticated
  using (teacher_id = auth.uid());

-- Sozlamalar: admin/o'qituvchi o'qiydi, admin yozadi. Talaba serverdagi API orqali (service role).
create policy app_settings_read on public.app_settings for select to authenticated
  using (public.app_role() in ('admin', 'teacher'));
create policy app_settings_admin on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
