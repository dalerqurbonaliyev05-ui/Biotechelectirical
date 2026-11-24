-- 0004 testlari: sessiya kodi, slayd chegaralari, RLS
\i supabase/tests/_helpers.sql

begin;
insert into public.lectures (id, subject_id, created_by, title, pdf_path, page_count) values
  ('00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'L1', 'x/a.pdf', 10);

set local role service_role;
select id, code from public.app_create_session('00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-0000000000b1', null, null);
select id as sid from public.lecture_sessions limit 1 \gset
select pg_temp.expect('kod 6 xonali raqam', (select count(*) from public.lecture_sessions where code ~ '^[0-9]{6}$'), 1);
select pg_temp.expect('boshlang''ich slayd 1, rev 0', (select count(*) from public.lecture_sessions where current_slide = 1 and rev = 0), 1);

select current_slide, rev from public.app_session_set_slide(:'sid', 5);
select pg_temp.expect('slayd 5, rev 1', (select count(*) from public.lecture_sessions where current_slide = 5 and rev = 1), 1);
select pg_temp.expect_error('slayd 0 mumkin emas', format($q$select public.app_session_set_slide(%L, 0)$q$, :'sid'), 'slide_out_of_range');
select pg_temp.expect_error('slayd betlar sonidan katta', format($q$select public.app_session_set_slide(%L, 11)$q$, :'sid'), 'slide_out_of_range');
reset role;

-- Bir xil faol kod ikki sessiyada bo'la olmaydi; tugaganidan keyin bo'ladi
select code as c1 from public.lecture_sessions where id = :'sid' \gset
select pg_temp.expect_error('faol kod takrorlanmaydi',
  format($q$insert into public.lecture_sessions (lecture_id, created_by, code) values ('00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-0000000000b1', %L)$q$, :'c1'),
  'lecture_sessions_active_code');

set local role service_role;
select status from public.app_session_end(:'sid');
select pg_temp.expect_error('tugagan sessiyada slayd o''zgarmaydi', format($q$select public.app_session_set_slide(%L, 2)$q$, :'sid'), 'session_ended');
reset role;
select pg_temp.expect('tugagan: ended_at bor, rev oshgan', (select count(*) from public.lecture_sessions where status = 'ended' and ended_at is not null and rev = 2), 1);
insert into public.lecture_sessions (lecture_id, created_by, code) values ('00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-0000000000b1', :'c1');
select pg_temp.expect('tugagan kod qayta ishlatiladi', (select count(*) from public.lecture_sessions where code = :'c1'), 2);

-- RLS
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select pg_temp.expect('talaba: sessiyalarni ko''rmaydi', (select count(*) from public.lecture_sessions), 0);
select pg_temp.expect_error('talaba: sessiya yarata olmaydi',
  $q$insert into public.lecture_sessions (lecture_id, created_by, code) values ('00000000-0000-0000-0000-000000000f01', auth.uid(), '123456')$q$, 'row-level security');
select pg_temp.expect_error('talaba: funksiyani chaqira olmaydi', format($q$select public.app_session_set_slide(%L, 2)$q$, :'sid'), 'permission denied');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('o''qituvchi: o''z sessiyalari', (select count(*) from public.lecture_sessions), 2);
update public.lecture_sessions set current_slide = 9;   -- to'g'ridan-to'g'ri yozish siyosati yo'q → 0 qator
select pg_temp.expect('o''qituvchi: to''g''ridan-to''g''ri o''zgartira olmaydi', (select count(*) from public.lecture_sessions where current_slide = 9), 0);
rollback;
