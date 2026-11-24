-- 14-bosqich: mehmon va NB/faollik ma'lumotlari xavfsizligi (RLS). Har bir rol faqat o'ziga tegishlini ko'radi.
\i supabase/tests/_helpers.sql

begin;
-- Mehmon (profilsiz auth foydalanuvchi) va ikkinchi o'qituvchi
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000009a9', 'guest-anon@example.invalid'),
  ('00000000-0000-0000-0000-0000000000b9', 'teacher2@smartedu.test');
insert into public.profiles (id, role, full_name) values ('00000000-0000-0000-0000-0000000000b9', 'teacher', 'Boshqa Oqituvchi');

insert into public.lectures (id, subject_id, created_by, title, pdf_path, page_count) values
  ('00000000-0000-0000-0000-000000000f61', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'L-sec', 'x/s.pdf', 5);
insert into public.lecture_sessions (id, lecture_id, created_by, code) values
  ('00000000-0000-0000-0000-0000000005e1', '00000000-0000-0000-0000-000000000f61', '00000000-0000-0000-0000-0000000000b1', '555555');

set local role service_role;
select * from public.app_join_session('555555', '00000000-0000-0000-0000-000000000101', 'remote', 'tok-a', false, null, null);
select * from public.app_join_session('555555', '00000000-0000-0000-0000-000000000102', 'remote', 'tok-b', false, null, null);
select * from public.app_join_session('555555', '00000000-0000-0000-0000-0000000009a9', 'remote', 'tok-g', true, 'Mehmon Test', 'EE-1');
select * from public.app_add_reactions('00000000-0000-0000-0000-0000000005e1', '00000000-0000-0000-0000-000000000101', 1, 2, 1);
select * from public.app_add_reactions('00000000-0000-0000-0000-0000000005e1', '00000000-0000-0000-0000-000000000102', 1, 1, 0);
select * from public.app_add_reactions('00000000-0000-0000-0000-0000000005e1', '00000000-0000-0000-0000-0000000009a9', 1, 1, 0);
select public.app_write_attendance_results('00000000-0000-0000-0000-0000000005e1',
  '[{"student_id":"00000000-0000-0000-0000-000000000101","status":"nb","ratio":0.1,"present_seconds":60},
    {"student_id":"00000000-0000-0000-0000-000000000102","status":"present","ratio":0.9,"present_seconds":3000}]');
select public.app_override_attendance('00000000-0000-0000-0000-0000000005e1', '00000000-0000-0000-0000-000000000101', 'present', 'sabab bor', '00000000-0000-0000-0000-0000000000b1');
select public.app_break_start('00000000-0000-0000-0000-0000000005e1');
select public.app_save_annotations('00000000-0000-0000-0000-0000000005e1', 1, '[]');
reset role;

-- Talaba 1: faqat o'z reaksiyasi va o'z davomati; boshqa talaba NB'si, tanaffus, izoh, audit, token ko'rinmaydi
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select pg_temp.expect('talaba: faqat o''z reaksiyalari', (select count(*) from public.session_reactions where student_id <> auth.uid()), 0);
select pg_temp.expect('talaba: faqat o''z davomati', (select count(*) from public.attendance where student_id <> auth.uid()), 0);
select pg_temp.expect('talaba: ishtirokchi tokenlari ko''rinmaydi', (select count(*) from public.session_participants), 0);
select pg_temp.expect('talaba: tanaffus/izoh/audit ko''rinmaydi', (select count(*) from public.session_breaks) + (select count(*) from public.session_annotations) + (select count(*) from public.audit_log), 0);

-- Mehmon: o'z yozuvlaridan boshqasini ko'rmaydi; hech narsa yoza olmaydi
select pg_temp.as_user('00000000-0000-0000-0000-0000000009a9');
select pg_temp.expect('mehmon: boshqalar reaksiyasini ko''rmaydi', (select count(*) from public.session_reactions where student_id <> auth.uid()), 0);
select pg_temp.expect('mehmon: boshqalar davomatini ko''rmaydi', (select count(*) from public.attendance where student_id <> auth.uid()), 0);
select pg_temp.expect('mehmon: ishtirokchilar/javoblar/ballar ko''rinmaydi',
  (select count(*) from public.session_participants) + (select count(*) from public.session_answers where student_id <> auth.uid()) + (select count(*) from public.scores where student_id <> auth.uid()), 0);
select pg_temp.expect_error('mehmon reaksiyani to''g''ridan-to''g''ri yoza olmaydi',
  $q$insert into public.session_reactions (session_id, student_id, slide_no, kind, cnt) values ('00000000-0000-0000-0000-0000000005e1', auth.uid(), 1, 'understood', 5)$q$, 'row-level security');
select pg_temp.expect_error('mehmon davomatni to''g''ridan-to''g''ri yoza olmaydi',
  $q$insert into public.attendance (session_id, student_id, mode) values ('00000000-0000-0000-0000-0000000005e1', auth.uid(), 'remote')$q$, 'row-level security');

-- Boshqa o'qituvchi: bu darsning sezgir ma'lumotlarini ko'rmaydi
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b9');
select pg_temp.expect('boshqa o''qituvchi: reaksiya yo''q', (select count(*) from public.session_reactions), 0);
select pg_temp.expect('boshqa o''qituvchi: davomat/NB yo''q', (select count(*) from public.attendance), 0);
select pg_temp.expect('boshqa o''qituvchi: tanaffus/izoh yo''q', (select count(*) from public.session_breaks) + (select count(*) from public.session_annotations), 0);

-- Dars o'qituvchisi: hammasini ko'radi
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('dars o''qituvchisi: 3 ta reaksiya yozuvi', (select count(*) from public.session_reactions), 4);
select pg_temp.expect('dars o''qituvchisi: davomat', (select count(*) from public.attendance where session_id = '00000000-0000-0000-0000-0000000005e1'), 3);
reset role;

-- Mehmon NB hisobiga kirmasligi: finalizatsiya faqat berilgan qatorlarni yozadi (mehmon qatori server tomonidan chiqarib tashlanadi)
select pg_temp.expect('mehmon NB qatorida bor-yo''qligi: unga nb yozilmagan', (select count(*) from public.attendance where student_id = '00000000-0000-0000-0000-0000000009a9' and status = 'nb'), 0);
rollback;
