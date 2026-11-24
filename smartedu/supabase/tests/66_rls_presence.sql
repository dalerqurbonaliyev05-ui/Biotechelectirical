-- 0011 testlari: heartbeat hisobi, tanaffus, "Doskaga qarang", davomat natijasi, tuzatish (audit), saqlash muddati, RLS
\i supabase/tests/_helpers.sql

begin;
insert into public.lectures (id, subject_id, created_by, title, pdf_path, page_count) values
  ('00000000-0000-0000-0000-000000000f41', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'L-presence', 'x/p.pdf', 6);
insert into public.lecture_sessions (id, lecture_id, created_by, code) values
  ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000f41', '00000000-0000-0000-0000-0000000000b1', '333333');
insert into public.session_participants (session_id, student_id, join_token, mode) values
  ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000101', 't1', 'remote'),
  ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000102', 't2', 'remote');
insert into public.attendance (session_id, student_id, mode) values
  ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000101', 'remote'),
  ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000102', 'remote');

-- Heartbeat: birinchi ping hisoblanmaydi; 30 s keyingisi — ko'rinadigan (visible) vaqt
set local role service_role;
select * from public.app_presence_ping('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000101', true);
reset role;
select pg_temp.expect('birinchi ping: 0 s', (select present_seconds from public.session_participants where student_id = '00000000-0000-0000-0000-000000000101'), 0);
update public.session_participants set last_ping_at = now() - interval '30 seconds' where student_id = '00000000-0000-0000-0000-000000000101';
set local role service_role;
select * from public.app_presence_ping('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000101', false);
reset role;
select pg_temp.expect('30 s ko''rinadigan vaqt', (select present_seconds from public.session_participants where student_id = '00000000-0000-0000-0000-000000000101'), 30);
-- oldingi ping "ko'rinmas" bo'lsa — hidden hisoblanadi
update public.session_participants set last_ping_at = now() - interval '20 seconds' where student_id = '00000000-0000-0000-0000-000000000101';
set local role service_role;
select * from public.app_presence_ping('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000101', true);
reset role;
select pg_temp.expect('20 s yashirin vaqt', (select hidden_seconds from public.session_participants where student_id = '00000000-0000-0000-0000-000000000101'), 20);
-- 120 s dan uzoq oraliq (qurilma uxlagan) hisoblanmaydi
update public.session_participants set last_ping_at = now() - interval '300 seconds', last_ping_visible = true where student_id = '00000000-0000-0000-0000-000000000101';
set local role service_role;
select * from public.app_presence_ping('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000101', true);
reset role;
select pg_temp.expect('uzun oraliq hisoblanmaydi', (select present_seconds from public.session_participants where student_id = '00000000-0000-0000-0000-000000000101'), 30);

-- Tanaffus: vaqt hisoblanmaydi; ikki marta boshlab bo'lmaydi
set local role service_role;
select public.app_break_start('00000000-0000-0000-0000-0000000005c1');
select pg_temp.expect_error('tanaffus ikki marta', $q$select public.app_break_start('00000000-0000-0000-0000-0000000005c1')$q$, 'break_active');
reset role;
update public.session_breaks set started_at = now() - interval '60 seconds';
update public.session_participants set last_ping_at = now() - interval '40 seconds', last_ping_visible = true where student_id = '00000000-0000-0000-0000-000000000101';
set local role service_role;
select * from public.app_presence_ping('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000101', true);
reset role;
select pg_temp.expect('tanaffus vaqti hisoblanmaydi', (select present_seconds from public.session_participants where student_id = '00000000-0000-0000-0000-000000000101'), 30);
select pg_temp.expect('rev tanaffusda oshdi, break_started_at o''rnatilgan', (select count(*) from public.lecture_sessions where id = '00000000-0000-0000-0000-0000000005c1' and break_started_at is not null), 1);
set local role service_role;
select public.app_break_end('00000000-0000-0000-0000-0000000005c1');
select pg_temp.expect_error('tanaffus yo''q', $q$select public.app_break_end('00000000-0000-0000-0000-0000000005c1')$q$, 'no_break');
-- "Doskaga qarang"
select public.app_focus_call('00000000-0000-0000-0000-0000000005c1');
reset role;
select pg_temp.expect('focus_seq oshdi', (select focus_seq from public.lecture_sessions where id = '00000000-0000-0000-0000-0000000005c1'), 1);

-- Bloklangan ping qila olmaydi; ishtirokchi emas
update public.session_participants set blocked = true where student_id = '00000000-0000-0000-0000-000000000102';
set local role service_role;
select pg_temp.expect_error('bloklangan', $q$select * from public.app_presence_ping('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000102', true)$q$, 'blocked');
select pg_temp.expect_error('ishtirokchi emas', $q$select * from public.app_presence_ping('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000103', true)$q$, 'not_participant');
reset role;
update public.session_participants set blocked = false where student_id = '00000000-0000-0000-0000-000000000102';

-- Natijalarni yozish va o'qituvchi tuzatishi (audit)
set local role service_role;
select public.app_write_attendance_results('00000000-0000-0000-0000-0000000005c1',
  '[{"student_id":"00000000-0000-0000-0000-000000000101","status":"present","ratio":0.95,"present_seconds":3000},
    {"student_id":"00000000-0000-0000-0000-000000000102","status":"nb","ratio":0.2,"present_seconds":600},
    {"student_id":"00000000-0000-0000-0000-000000000103","status":"nb","ratio":0,"present_seconds":0}]');
reset role;
select pg_temp.expect('NB: 2 ta', (select count(*) from public.attendance where session_id = '00000000-0000-0000-0000-0000000005c1' and status = 'nb'), 2);
select pg_temp.expect('qo''shilmagan a''zo uchun qator (mode NULL)', (select count(*) from public.attendance where student_id = '00000000-0000-0000-0000-000000000103' and mode is null), 1);
set local role service_role;
select pg_temp.expect_error('sababsiz tuzatish rad', $q$select public.app_override_attendance('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000102', 'present', ' ', '00000000-0000-0000-0000-0000000000b1')$q$, 'reason_required');
select public.app_override_attendance('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000102', 'present', 'Internet uzilgan, darsda bo''lgan', '00000000-0000-0000-0000-0000000000b1');
reset role;
select pg_temp.expect('tuzatish audit_log''ga yozildi', (select count(*) from public.audit_log where action = 'attendance.override' and subject_student_id = '00000000-0000-0000-0000-000000000102' and (old_value->>'status') = 'nb' and (new_value->>'status') = 'present'), 1);
select pg_temp.expect('avtomatik holat saqlanadi, tuzatish alohida', (select count(*) from public.attendance where student_id = '00000000-0000-0000-0000-000000000102' and status = 'nb' and override_status = 'present'), 1);

-- Saqlash muddati: eski tugagan dars tozalanadi, yangisi tegilmaydi
insert into public.session_reactions (session_id, student_id, slide_no, kind, cnt) values
  ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000101', 1, 'understood', 3);
select pg_temp.expect('faol dars tozalanmaydi', (select (public.app_purge_activity(1)->>'reactions')::bigint), 0) ;
update public.lecture_sessions set status = 'ended', ended_at = now() - interval '400 days' where id = '00000000-0000-0000-0000-0000000005c1';
select pg_temp.expect('eski dars: reaksiyalar o''chdi', (select (public.app_purge_activity(180)->>'reactions')::bigint), 1);
select pg_temp.expect('vaqt hisoblagichlari nolga tushdi', (select count(*) from public.session_participants where session_id = '00000000-0000-0000-0000-0000000005c1' and (present_seconds <> 0 or hidden_seconds <> 0)), 0);
select pg_temp.expect('davomat holati saqlanib qoldi', (select count(*) from public.attendance where session_id = '00000000-0000-0000-0000-0000000005c1' and status = 'nb'), 2);

-- RLS: talaba faqat o'z davomatini; boshqa o'qituvchi ko'rmaydi
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select pg_temp.expect('talaba: faqat o''z davomati', (select count(*) from public.attendance), 1);
select pg_temp.expect('talaba: tanaffuslarni ko''rmaydi', (select count(*) from public.session_breaks), 0);
update public.attendance set override_status = 'present';
reset role;
select pg_temp.expect('talaba davomatni tuzata olmaydi', (select count(*) from public.attendance where student_id = '00000000-0000-0000-0000-000000000101' and override_status is not null), 0);
rollback;
