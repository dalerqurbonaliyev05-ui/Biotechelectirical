-- =====================================================================
-- Amaliyot (RES) tizimi: Supabase sxemasi, rollar va RLS qoidalari
-- 1-bosqich. Supabase SQL Editor'da bir marta ishga tushiriladi.
--
-- Rollar:  student | res_head | practice_head | admin
--   student        - talaba (HEMIS ID bilan, faollashtirish kodi orqali)
--   res_head       - RES rahbari (korxona boshlig'i): davomat, naryad, tasdiqlash
--   practice_head  - amaliyot rahbari (kafedra o'qituvchisi): kuzatuv, topshiriq, e'lon
--   admin          - tizim administratori
--
-- Foydalanuvchilarni (auth.users) yaratish, rol berish va faollashtirish
-- kodlarini tekshirish FAQAT server tomonida (Edge Function, service_role)
-- bajariladi. Brauzerdan hech kim o'z rolini o'zgartira olmaydi.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Turlar -----------------------------------------------------
create type public.user_role      as enum ('student', 'res_head', 'practice_head', 'admin');
create type public.att_status     as enum ('faol', 'yakunlangan', 'kelmadi');
create type public.approval_kind  as enum ('kundalik', 'hisobot');
create type public.approval_state as enum ('pending', 'approved', 'rejected');

-- ---------- Jadvallar --------------------------------------------------

-- Tizim foydalanuvchisi (auth.users bilan 1:1). Login - HEMIS ID yoki xodim logini.
create table public.profiles (
    id         uuid primary key references auth.users (id) on delete cascade,
    login      text not null unique check (login = lower(login) and length(login) between 3 and 64),
    full_name  text not null,
    role       public.user_role not null,
    active     boolean not null default true,
    created_at timestamptz not null default now()
);

-- Talabalar ro'yxati (HEMIS'dan import qilinadi; keyinchalik API orqali).
create table public.students (
    id           uuid primary key default gen_random_uuid(),
    hemis_id     text not null unique check (hemis_id ~ '^[0-9]{6,20}$'),
    full_name    text not null,
    group_name   text,
    course       smallint check (course between 1 and 6),
    faculty      text,
    specialty    text,
    university   text,
    kafedra      text,
    active       boolean not null default true,          -- HEMIS'da o'qiyaptimi
    profile_id   uuid unique references public.profiles (id) on delete set null, -- faollashgan bo'lsa
    imported_at  timestamptz not null default now()
);
create index students_group_idx  on public.students (group_name);
create index students_course_idx on public.students (course);

-- Bir martalik faollashtirish kodlari. Kod ochiq holda saqlanmaydi (hash).
-- Hech qanday RLS policy YO'Q: faqat service_role (Edge Function) o'qiydi/yozadi.
create table public.activation_codes (
    student_id uuid primary key references public.students (id) on delete cascade,
    code_hash  text not null,
    expires_at timestamptz not null,
    attempts   smallint not null default 0,              -- noto'g'ri urinishlar (5 tadan keyin bloklanadi)
    used_at    timestamptz,
    created_at timestamptz not null default now()
);

-- Amaliyot davrlari (kurs bo'yicha; talaba portalidagi taymer shundan hisoblanadi).
create table public.practice_periods (
    id        uuid primary key default gen_random_uuid(),
    course    smallint not null check (course between 1 and 6),
    title     text not null,                              -- "3-kurs: Texnologik amaliyot"
    starts_on date not null,
    ends_on   date not null,
    check (ends_on >= starts_on)
);

-- Brigadalar.
create table public.brigades (
    id          uuid primary key default gen_random_uuid(),
    name        text not null unique,
    leader_name text,
    active      boolean not null default true
);

-- Kunlik davomat va naryad (talaba + sana bo'yicha bitta yozuv).
-- Sana `date` turida: brauzer formatiga bog'liq xatolar yo'q.
create table public.attendance (
    id         uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students (id) on delete cascade,
    work_date  date not null,
    status     public.att_status not null,
    time_in    time,
    time_out   time,
    brigade_id uuid references public.brigades (id) on delete set null,
    brigade_name text,                                    -- tarixiy nusxa (brigada nomi o'zgarsa ham)
    leader     text,
    task       text,                                      -- naryad
    marked_by  uuid references public.profiles (id) on delete set null,
    updated_at timestamptz not null default now(),
    unique (student_id, work_date)
);
create index attendance_date_idx on public.attendance (work_date);

-- Amaliyot rahbaridan talabaga (yoki guruh/kursga) topshiriq.
create table public.tasks (
    id         uuid primary key default gen_random_uuid(),
    student_id uuid references public.students (id) on delete cascade,  -- bitta talabaga
    group_name text,                                                    -- yoki butun guruhga
    title      text not null,
    body       text,
    due_on     date,
    created_by uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now(),
    check (student_id is not null or group_name is not null)
);

-- E'lonlar: amaliyot vaqti o'zgarishi va h.k. (target_course null = hammaga).
create table public.announcements (
    id            uuid primary key default gen_random_uuid(),
    title         text not null,
    body          text,
    target_course smallint check (target_course between 1 and 6),
    created_by    uuid references public.profiles (id) on delete set null,
    created_at    timestamptz not null default now()
);

-- Jarayon rasmlari (fayl Storage'da, bu yerda faqat yo'l).
create table public.photos (
    id            uuid primary key default gen_random_uuid(),
    student_id    uuid not null references public.students (id) on delete cascade,
    work_date     date not null,
    storage_path  text not null unique,                   -- "<student_id>/<fayl>"
    created_at    timestamptz not null default now()
);
create index photos_student_idx on public.photos (student_id, work_date);

-- Talab va takliflar.
create table public.feedbacks (
    id         uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students (id) on delete cascade,
    message    text not null check (length(message) between 1 and 4000),
    created_at timestamptz not null default now()
);

-- Kundalik/hisobotni RES rahbari tasdiqlashi. PDF'dagi pechat va imzo
-- faqat status = 'approved' bo'lganda qo'yiladi.
create table public.approvals (
    id           uuid primary key default gen_random_uuid(),
    student_id   uuid not null references public.students (id) on delete cascade,
    period_id    uuid references public.practice_periods (id) on delete set null,
    kind         public.approval_kind not null,
    state        public.approval_state not null default 'pending',
    requested_at timestamptz not null default now(),
    decided_by   uuid references public.profiles (id) on delete set null,
    decided_at   timestamptz,
    note         text,
    unique nulls not distinct (student_id, period_id, kind)
);

-- Tashkilot sozlamalari (bitta qator): PDF sarlavhasi, rahbar nomi, pechat/imzo fayllari.
create table public.settings (
    id            boolean primary key default true check (id),   -- faqat bitta qator
    org_name      text not null default 'Ulug''bek tuman elektr tarmoqlari korxonasi (RES)',
    head_name     text not null default 'Rahmonov O.T.',
    head_position text not null default 'RES boshlig''i',
    seal_path     text,                                          -- pechat rasmi (Storage)
    signature_path text                                          -- imzo rasmi (Storage)
);
insert into public.settings default values;

-- ---------- Yordamchi funksiyalar (RLS uchun) --------------------------
-- SECURITY DEFINER: profiles'ning o'z RLS'iga tushib qolmasdan rolni o'qiydi.
create function public.current_role_name() returns public.user_role
language sql stable security definer set search_path = '' as $$
    select role from public.profiles where id = auth.uid() and active
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
    select coalesce(public.current_role_name() in ('res_head', 'practice_head', 'admin'), false)
$$;

create function public.has_role(variadic roles public.user_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
    select coalesce(public.current_role_name() = any (roles), false)
$$;

-- Joriy foydalanuvchi talaba bo'lsa, uning students.id'si.
create function public.current_student_id() returns uuid
language sql stable security definer set search_path = '' as $$
    select s.id from public.students s
    join public.profiles p on p.id = s.profile_id
    where p.id = auth.uid() and p.active and p.role = 'student'
$$;

create function public.current_student_course() returns smallint
language sql stable security definer set search_path = '' as $$
    select s.course from public.students s where s.profile_id = auth.uid()
$$;

create function public.current_student_group() returns text
language sql stable security definer set search_path = '' as $$
    select s.group_name from public.students s where s.profile_id = auth.uid()
$$;

revoke all on function public.current_role_name(), public.is_staff(), public.has_role(public.user_role[]),
    public.current_student_id(), public.current_student_course(), public.current_student_group() from public;
grant execute on function public.current_role_name(), public.is_staff(), public.has_role(public.user_role[]),
    public.current_student_id(), public.current_student_course(), public.current_student_group() to authenticated;

-- attendance.updated_at avtomatik yangilanadi.
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger attendance_touch before update on public.attendance
    for each row execute function public.touch_updated_at();

-- ---------- RLS --------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.students         enable row level security;
alter table public.activation_codes enable row level security;  -- policy yo'q: faqat service_role
alter table public.practice_periods enable row level security;
alter table public.brigades         enable row level security;
alter table public.attendance       enable row level security;
alter table public.tasks            enable row level security;
alter table public.announcements    enable row level security;
alter table public.photos           enable row level security;
alter table public.feedbacks        enable row level security;
alter table public.approvals        enable row level security;
alter table public.settings         enable row level security;

-- profiles: o'zini ko'radi; xodimlar hammani ko'radi; yozish faqat admin
-- (rolni o'zgartirish mijozdan MUMKIN EMAS - talaba o'z profilini ham o'zgartira olmaydi).
create policy profiles_select on public.profiles for select to authenticated
    using (id = auth.uid() or public.is_staff());
create policy profiles_admin_write on public.profiles for all to authenticated
    using (public.has_role('admin')) with check (public.has_role('admin'));

-- students: talaba faqat o'zini; xodimlar hammasini; yozish admin va amaliyot rahbari.
create policy students_select on public.students for select to authenticated
    using (profile_id = auth.uid() or public.is_staff());
create policy students_write on public.students for all to authenticated
    using (public.has_role('admin', 'practice_head'))
    with check (public.has_role('admin', 'practice_head'));

-- practice_periods, brigades, settings: hamma kirganlar o'qiydi, admin (brigada - res_head ham) yozadi.
create policy periods_select on public.practice_periods for select to authenticated using (true);
create policy periods_write  on public.practice_periods for all to authenticated
    using (public.has_role('admin', 'practice_head')) with check (public.has_role('admin', 'practice_head'));

create policy brigades_select on public.brigades for select to authenticated using (public.is_staff());
create policy brigades_write  on public.brigades for all to authenticated
    using (public.has_role('admin', 'res_head')) with check (public.has_role('admin', 'res_head'));

create policy settings_select on public.settings for select to authenticated using (true);
create policy settings_write  on public.settings for update to authenticated
    using (public.has_role('admin')) with check (public.has_role('admin'));

-- attendance: talaba o'zinikini o'qiydi; xodimlar hammasini; yozish res_head va admin.
create policy attendance_select on public.attendance for select to authenticated
    using (student_id = public.current_student_id() or public.is_staff());
create policy attendance_write on public.attendance for all to authenticated
    using (public.has_role('admin', 'res_head')) with check (public.has_role('admin', 'res_head'));

-- tasks: talaba o'ziga yoki o'z guruhiga berilganini o'qiydi; yozish amaliyot rahbari va admin.
create policy tasks_select on public.tasks for select to authenticated
    using (student_id = public.current_student_id()
           or (group_name is not null and group_name = public.current_student_group())
           or public.is_staff());
create policy tasks_write on public.tasks for all to authenticated
    using (public.has_role('admin', 'practice_head')) with check (public.has_role('admin', 'practice_head'));

-- announcements: talaba o'z kursiga yoki umumiy e'lonlarni o'qiydi; yozish xodimlar.
create policy announcements_select on public.announcements for select to authenticated
    using (public.is_staff() or target_course is null or target_course = public.current_student_course());
create policy announcements_write on public.announcements for all to authenticated
    using (public.has_role('admin', 'practice_head', 'res_head'))
    with check (public.has_role('admin', 'practice_head', 'res_head'));

-- photos: talaba o'z rasmlarini qo'shadi/ko'radi/o'chiradi; xodimlar ko'radi.
create policy photos_select on public.photos for select to authenticated
    using (student_id = public.current_student_id() or public.is_staff());
create policy photos_insert on public.photos for insert to authenticated
    with check (student_id = public.current_student_id()
                and storage_path like public.current_student_id()::text || '/%');
create policy photos_delete on public.photos for delete to authenticated
    using (student_id = public.current_student_id() or public.has_role('admin'));

-- feedbacks: talaba o'zinikini yozadi/o'qiydi; xodimlar o'qiydi.
create policy feedbacks_select on public.feedbacks for select to authenticated
    using (student_id = public.current_student_id() or public.is_staff());
create policy feedbacks_insert on public.feedbacks for insert to authenticated
    with check (student_id = public.current_student_id());

-- approvals: talaba tasdiqlashga FAQAT 'pending' holatda yuboradi; qaror res_head/admin'da.
create policy approvals_select on public.approvals for select to authenticated
    using (student_id = public.current_student_id() or public.is_staff());
create policy approvals_student_insert on public.approvals for insert to authenticated
    with check (student_id = public.current_student_id()
                and state = 'pending' and decided_by is null and decided_at is null);
-- Rad etilgan bo'lsa, talaba o'zi qayta 'pending' holatiga qaytarib yuboradi.
create policy approvals_student_resubmit on public.approvals for update to authenticated
    using (student_id = public.current_student_id() and state = 'rejected')
    with check (student_id = public.current_student_id()
                and state = 'pending' and decided_by is null and decided_at is null);
create policy approvals_decide on public.approvals for update to authenticated
    using (public.has_role('admin', 'res_head'))
    with check (public.has_role('admin', 'res_head'));

-- ---------- Storage (Supabase Storage bucket'lari) ---------------------
-- practice-photos: yopiq bucket; talaba faqat o'z papkasiga ("<student_id>/...") yuklaydi.
-- org-assets: pechat va imzo rasmlari; hamma kirganlar o'qiydi, admin yuklaydi.
insert into storage.buckets (id, name, public) values
    ('practice-photos', 'practice-photos', false),
    ('org-assets',      'org-assets',      false)
on conflict (id) do nothing;

create policy photos_obj_select on storage.objects for select to authenticated
    using (bucket_id = 'practice-photos'
           and ((storage.foldername(name))[1] = public.current_student_id()::text or public.is_staff()));
create policy photos_obj_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'practice-photos'
                and (storage.foldername(name))[1] = public.current_student_id()::text);
create policy photos_obj_delete on storage.objects for delete to authenticated
    using (bucket_id = 'practice-photos'
           and ((storage.foldername(name))[1] = public.current_student_id()::text or public.has_role('admin')));

create policy assets_obj_select on storage.objects for select to authenticated
    using (bucket_id = 'org-assets');
create policy assets_obj_write on storage.objects for all to authenticated
    using (bucket_id = 'org-assets' and public.has_role('admin'))
    with check (bucket_id = 'org-assets' and public.has_role('admin'));
