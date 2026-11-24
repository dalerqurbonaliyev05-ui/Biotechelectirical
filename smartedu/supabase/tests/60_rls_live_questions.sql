-- 0006 testlari: savol ochish/yopish, ikki marta javob, reyting yig'indisi, RLS
\i supabase/tests/_helpers.sql

begin;
insert into public.lectures (id, subject_id, created_by, title, pdf_path, page_count) values
  ('00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'L1', 'x/a.pdf', 10);
insert into public.questions (id, subject_id, created_by, type, body) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'mcq', '{"text":"q1"}'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'mcq', '{"text":"q2"}');
insert into public.lecture_questions (id, lecture_id, slide_no, question_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000f01', 2, '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000f01', 3, '00000000-0000-0000-0000-0000000000c2');
insert into public.lecture_sessions (id, lecture_id, created_by, code) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-0000000000b1', '111111');

set local role service_role;
-- 1-savol ochiladi
select id from public.app_open_session_question('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 2, 30, '{}', now());
select id as sq1 from public.session_questions where lecture_question_id = '00000000-0000-0000-0000-0000000000d1' \gset
reset role;
select pg_temp.expect('bitta ochiq savol', (select count(*) from public.session_questions where closed_at is null), 1);

-- Javoblar: S1 to'g'ri (100+8), S2 noto'g'ri (0+0)
set local role service_role;
select out_status, out_total from public.app_record_live_answer(:'sq1', '00000000-0000-0000-0000-000000000101', '{"selected":["a"]}', true, 100, 8, 3000);
select out_status, out_total from public.app_record_live_answer(:'sq1', '00000000-0000-0000-0000-000000000102', '{"selected":["b"]}', false, 0, 0, 5000);
-- S1 ikkinchi marta: duplicate, ball o'zgarmaydi
select out_status, out_total from public.app_record_live_answer(:'sq1', '00000000-0000-0000-0000-000000000101', '{"selected":["b"]}', true, 100, 10, 100);
reset role;
select pg_temp.expect('ikki marta javob: faqat bitta yozuv', (select count(*) from public.session_answers where student_id = '00000000-0000-0000-0000-000000000101'), 1);
select pg_temp.expect('ikki marta javob ballni oshirmaydi', (select count(*) from public.scores where student_id = '00000000-0000-0000-0000-000000000101' and total_points = 108 and correct_count = 1 and answered_count = 1 and correct_time_ms = 3000), 1);
select pg_temp.expect('noto''g''ri javob: 0 ball, vaqt hisobga olinmaydi', (select count(*) from public.scores where student_id = '00000000-0000-0000-0000-000000000102' and total_points = 0 and correct_count = 0 and answered_count = 1 and correct_time_ms = 0), 1);

-- 2-savolni ochish avvalgisini yopadi; rev oshadi; xuddi shu rejalashtirilgan savol qayta so'ralmaydi
set local role service_role;
select id from public.app_open_session_question('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', 3, 20, '{}', now());
select pg_temp.expect_error('rejalashtirilgan savol qayta so''ralmaydi',
  $q$select * from public.app_open_session_question('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 2, 30, '{}', now())$q$, 'already_asked');
reset role;
select pg_temp.expect('avvalgi savol avtomatik yopildi', (select count(*) from public.session_questions where id = :'sq1' and closed_at is not null), 1);
select pg_temp.expect('sessiya rev oshdi', (select count(*) from public.lecture_sessions where rev = 2), 1);

set local role service_role;
select id from public.app_close_session_question('00000000-0000-0000-0000-0000000005a1', now());
select pg_temp.expect_error('ochiq savol qolmagan', $q$select * from public.app_close_session_question('00000000-0000-0000-0000-0000000005a1', now())$q$, 'no_open_question');
select pg_temp.expect_error('tugagan sessiyada savol ochilmaydi', $q$select 1 from (select public.app_session_end('00000000-0000-0000-0000-0000000005a1')) x, lateral (select * from public.app_open_session_question('00000000-0000-0000-0000-0000000005a1', null, '00000000-0000-0000-0000-0000000000c1', 2, 30, '{}', now())) y$q$, 'session_ended');
reset role;

-- RLS
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select pg_temp.expect('talaba: savollar yopiq', (select count(*) from public.session_questions), 0);
select pg_temp.expect('talaba: javoblar yopiq (to''g''rilik oshkor bo''lmasin)', (select count(*) from public.session_answers), 0);
select pg_temp.expect('talaba: ballar jadvali yopiq', (select count(*) from public.scores), 0);
select pg_temp.expect_error('talaba: javob yoza olmaydi',
  $q$select * from public.app_record_live_answer('00000000-0000-0000-0000-000000000001', auth.uid(), '{}', true, 100, 10, 1)$q$, 'permission denied');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('o''qituvchi: savollar', (select count(*) from public.session_questions), 2);
select pg_temp.expect('o''qituvchi: javoblar', (select count(*) from public.session_answers), 2);
select pg_temp.expect('o''qituvchi: ballar', (select count(*) from public.scores), 2);
rollback;
