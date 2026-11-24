-- ════════════════════════════════════════════════════════════════
-- NAMUNA MA'LUMOT — FAQAT LOKAL/DEMO UCHUN. Parollar ochiq yozilgan!
-- Productionda `supabase db reset` yoki bu faylni ISHLATMANG.
--   admin    : admin@smartedu.test    / Admin12345
--   o'qituvchi: teacher@smartedu.test  / Teacher12345
--   talabalar: kod S001..S010, parol Talaba12345 (birinchi kirishda almashtiriladi)
-- Talaba emaili: <kod>@students.smartedu.example (kichik harflarda).
-- ════════════════════════════════════════════════════════════════

create function pg_temp.seed_user(uid uuid, mail text, pw text, meta jsonb) returns void
language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', mail,
    extensions.crypt(pw, extensions.gen_salt('bf')), now(), meta, '{}', now(), now(), '', '', '', '')
  on conflict (id) do nothing;
  insert into auth.identities (user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (uid, uid::text, jsonb_build_object('sub', uid::text, 'email', mail, 'email_verified', true),
    'email', now(), now(), now())
  on conflict do nothing;
end $$;

insert into public.faculties (id, name) values
  ('00000000-0000-0000-0000-00000000f001', 'Energetika fakulteti') on conflict do nothing;
insert into public.departments (id, faculty_id, name) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000f001', 'Elektr ta''minoti kafedrasi')
  on conflict do nothing;
insert into public.groups (id, department_id, name, course_year) values
  ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000d001', 'EE-21', 3)
  on conflict do nothing;
insert into public.subjects (id, department_id, name, code) values
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000d001', 'Elektr ta''minoti', 'ET-301')
  on conflict do nothing;
insert into public.rooms (name, building, capacity) values ('A-101', 'Asosiy bino', 60) on conflict do nothing;

select pg_temp.seed_user('00000000-0000-0000-0000-0000000000a1', 'admin@smartedu.test', 'Admin12345',
  '{"role":"admin"}');
select pg_temp.seed_user('00000000-0000-0000-0000-0000000000b1', 'teacher@smartedu.test', 'Teacher12345',
  '{"role":"teacher"}');

insert into public.profiles (id, role, full_name, department_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin', 'Admin Adminov', null),
  ('00000000-0000-0000-0000-0000000000b1', 'teacher', 'Sobirov Karim Anvarovich', '00000000-0000-0000-0000-00000000d001')
on conflict do nothing;

insert into public.teacher_subjects (teacher_id, subject_id, group_id) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000a001')
on conflict do nothing;

do $$
declare
  i int;
  uid uuid;
  code text;
  names text[] := array['Aliyev Anvar','Boboyev Sardor','Davronov Jasur','Ergashev Dilshod','Fayzullayev Otabek',
    'G''ulomov Bahrom','Hamidov Rustam','Ismoilov Nodir','Jo''rayev Ulug''bek','Karimova Malika'];
begin
  for i in 1..10 loop
    uid := ('00000000-0000-0000-0000-0000000001' || lpad(i::text, 2, '0'))::uuid;
    code := 'S' || lpad(i::text, 3, '0');
    perform pg_temp.seed_user(uid, lower(code) || '@students.smartedu.example', 'Talaba12345', '{"role":"student"}');
    insert into public.profiles (id, role, full_name, student_code, group_id, must_change_password)
    values (uid, 'student', names[i], code, '00000000-0000-0000-0000-00000000a001', true)
    on conflict do nothing;
  end loop;
end $$;
