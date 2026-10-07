-- =====================================================================
-- Amaliyot portali: baza sxemasi (oddiy PostgreSQL 14+; hech qanday bulut xizmatiga bog'liq emas)
--
-- Xavfsizlik modeli (uch qatlam):
--   1) server (Node.js): kirish, parol, sessiya, so'rov chegaralari;
--   2) PostgreSQL RLS (qator darajasidagi qoidalar): har bir so'rov foydalanuvchi huquqi bilan bajariladi
--      (SET LOCAL ROLE authenticated + JWT da'volari), shuning uchun serverda xato bo'lsa ham
--      foydalanuvchi o'zining ruxsat etilgan qatorlaridan boshqasini ko'ra olmaydi;
--   3) maxfiy jadvallar (parol xeshlari, sessiyalar, faollashtirish kodlari, audit) `authenticated`
--      roliga umuman berilmagan: ularni faqat `service` roli (faqat server) o'qiy oladi.
--
-- Rollar (login roli `app` migrate.js tomonidan yaratiladi):
--   authenticated - NOLOGIN. RLS qoidalari shu rolga yozilgan.
--   service       - NOLOGIN, BYPASSRLS. Faqat server ichki amallari uchun (kirish, import, xodim yaratish).
--   app           - LOGIN. Ikkala rolning a'zosi; serverning ulanish roli.
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service') then
    create role service nologin bypassrls;
  end if;
end $$;

-- ---------- Turlar -----------------------------------------------------
create type public.user_role      as enum ('student', 'res_head', 'practice_head', 'admin');
create type public.att_status     as enum ('faol', 'yakunlangan', 'kelmadi');
create type public.approval_kind  as enum ('kundalik', 'hisobot');
create type public.approval_state as enum ('pending', 'approved', 'rejected');

-- ---------- Joriy foydalanuvchi (JWT da'vosidan) ------------------------
-- Server har bir so'rovda `request.jwt.claims` ni o'rnatadi (tranzaksiya ichida).
create schema auth;
create function auth.uid() returns uuid
language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub', '')::uuid
$$;

-- ---------- Foydalanuvchilar -------------------------------------------
-- Login: talaba uchun HEMIS ID, xodim uchun lotin harfli login.
create table public.profiles (
    id         uuid primary key default gen_random_uuid(),
    login      text not null unique check (login = lower(login) and length(login) between 3 and 64),
    full_name  text not null,
    role       public.user_role not null,
    active     boolean not null default true,
    created_at timestamptz not null default now()
);

-- Parol xeshlari (scrypt) va kirishga urinishlar. FAQAT server o'qiydi.
create table public.credentials (
    user_id             uuid primary key references public.profiles (id) on delete cascade,
    password_hash       text not null,
    must_change_password boolean not null default true,
    failed_attempts     integer not null default 0,
    locked_until        timestamptz,
    password_changed_at timestamptz not null default now()
);

-- Yangilash tokenlari (xesh holida). FAQAT server o'qiydi.
create table public.sessions (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.profiles (id) on delete cascade,
    token_hash  text not null unique,
    created_at  timestamptz not null default now(),
    expires_at  timestamptz not null,
    revoked_at  timestamptz,
    user_agent  text
);
create index sessions_user_idx on public.sessions (user_id);

-- Audit jurnali: kim, qachon, nima qildi (kirish, xodim yaratish, parol tiklash, import...). FAQAT server yozadi/o'qiydi.
create table public.audit_log (
    id          bigserial primary key,
    at          timestamptz not null default now(),
    actor_id    uuid,
    actor_login text,
    action      text not null,
    target      text,
    ip          text,
    details     jsonb
);
create index audit_log_at_idx on public.audit_log (at desc);

-- ---------- Talabalar (HEMIS'dan import yoki API orqali) ----------------
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
    active       boolean not null default true,
    profile_id   uuid unique references public.profiles (id) on delete set null,
    imported_at  timestamptz not null default now()
);
create index students_group_idx  on public.students (group_name);
create index students_course_idx on public.students (course);

-- Bir martalik faollashtirish kodlari (xesh holida). FAQAT server o'qiydi.
create table public.activation_codes (
    student_id uuid primary key references public.students (id) on delete cascade,
    code_hash  text not null,
    expires_at timestamptz not null,
    attempts   smallint not null default 0,
    used_at    timestamptz,
    created_at timestamptz not null default now()
);

-- ---------- Amaliyot ma'lumotlari ---------------------------------------
create table public.practice_periods (
    id        uuid primary key default gen_random_uuid(),
    course    smallint not null check (course between 1 and 6),
    title     text not null,
    starts_on date not null,
    ends_on   date not null,
    check (ends_on >= starts_on)
);

create table public.brigades (
    id          uuid primary key default gen_random_uuid(),
    name        text not null unique,
    leader_name text,
    active      boolean not null default true
);

create table public.attendance (
    id         uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students (id) on delete cascade,
    work_date  date not null,
    status     public.att_status not null,
    time_in    time,
    time_out   time,
    brigade_id uuid references public.brigades (id) on delete set null,
    brigade_name text,
    leader     text,
    task       text,
    marked_by  uuid references public.profiles (id) on delete set null,
    updated_at timestamptz not null default now(),
    unique (student_id, work_date)
);
create index attendance_date_idx on public.attendance (work_date);

create table public.tasks (
    id         uuid primary key default gen_random_uuid(),
    student_id uuid references public.students (id) on delete cascade,
    group_name text,
    title      text not null,
    body       text,
    due_on     date,
    created_by uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now(),
    check (student_id is not null or group_name is not null)
);

create table public.announcements (
    id            uuid primary key default gen_random_uuid(),
    title         text not null,
    body          text,
    target_course smallint check (target_course between 1 and 6),
    created_by    uuid references public.profiles (id) on delete set null,
    created_at    timestamptz not null default now()
);

-- Rasm fayllari serverning diskida; bu yerda faqat yo'l ("<student_id>/<sana>/<uuid>.jpg").
create table public.photos (
    id            uuid primary key default gen_random_uuid(),
    student_id    uuid not null references public.students (id) on delete cascade,
    work_date     date not null,
    storage_path  text not null unique,
    created_at    timestamptz not null default now()
);
create index photos_student_idx on public.photos (student_id, work_date);

create table public.feedbacks (
    id         uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students (id) on delete cascade,
    message    text not null check (length(message) between 1 and 4000),
    created_at timestamptz not null default now()
);

-- Kundalik/hisobotni RES rahbari tasdiqlashi. data_hash: tasdiq paytidagi ma'lumotlar muhri;
-- keyin davomat yoki rasmlar o'zgarsa xesh mos kelmaydi va PDF'ga pechat qo'yilmaydi.
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
    data_hash    text,
    days_count   integer,
    unique nulls not distinct (student_id, period_id, kind)
);

-- Tashkilot sozlamalari (bitta qator): PDF sarlavhasi va rahbar. Administrator o'zgartiradi.
create table public.settings (
    id            boolean primary key default true check (id),
    org_name      text not null default 'Tashkilot nomi (Sozlamalarda o''zgartiring)',
    head_name     text not null default '',
    head_position text not null default 'Korxona rahbari',
    seal_path     text,
    signature_path text
);
insert into public.settings default values;

-- ---------- RLS yordamchi funksiyalari ----------------------------------
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

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger attendance_touch before update on public.attendance
    for each row execute function public.touch_updated_at();

-- ---------- Huquqlar ----------------------------------------------------
-- Funksiyalar: odatda hamma chaqira oladi; faqat kerakli rollarga qoldiramiz.
revoke all on function public.current_role_name(), public.is_staff(), public.has_role(public.user_role[]),
    public.current_student_id(), public.current_student_course(), public.current_student_group(),
    public.touch_updated_at(), auth.uid() from public;
grant execute on function public.current_role_name(), public.is_staff(), public.has_role(public.user_role[]),
    public.current_student_id(), public.current_student_course(), public.current_student_group(),
    auth.uid() to authenticated, service;

grant usage on schema public, auth to authenticated, service;
revoke all on all tables in schema public from public;

-- Oddiy foydalanuvchi roli: faqat ilova jadvallari (qatorlarni RLS cheklaydi).
grant select, insert, update, delete on
    public.profiles, public.students, public.practice_periods, public.brigades, public.attendance,
    public.tasks, public.announcements, public.photos, public.feedbacks, public.approvals, public.settings
    to authenticated;

-- Server roli: hammasi (parollar, sessiyalar, kodlar, audit ham).
grant all on all tables in schema public to service;
grant usage, select on all sequences in schema public to service;

-- ---------- Qator darajasidagi xavfsizlik (RLS) -------------------------
alter table public.profiles         enable row level security;
alter table public.students         enable row level security;
alter table public.practice_periods enable row level security;
alter table public.brigades         enable row level security;
alter table public.attendance       enable row level security;
alter table public.tasks            enable row level security;
alter table public.announcements    enable row level security;
alter table public.photos           enable row level security;
alter table public.feedbacks        enable row level security;
alter table public.approvals        enable row level security;
alter table public.settings         enable row level security;
-- Maxfiy jadvallar: RLS yoqilgan, siyosat yo'q, `authenticated` ga huquq berilmagan.
alter table public.credentials      enable row level security;
alter table public.sessions         enable row level security;
alter table public.activation_codes enable row level security;
alter table public.audit_log        enable row level security;

-- profiles: o'zini ko'radi; xodimlar hammani; yozish faqat admin.
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
create policy approvals_student_resubmit on public.approvals for update to authenticated
    using (student_id = public.current_student_id() and state = 'rejected')
    with check (student_id = public.current_student_id()
                and state = 'pending' and decided_by is null and decided_at is null);
create policy approvals_decide on public.approvals for update to authenticated
    using (public.has_role('admin', 'res_head'))
    with check (public.has_role('admin', 'res_head'));
