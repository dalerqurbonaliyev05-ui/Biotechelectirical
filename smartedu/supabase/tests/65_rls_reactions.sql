-- 0010 testlari: reaksiya paketlari, chegaralar, eng faol talaba, nishonli savol, RLS
\i supabase/tests/_helpers.sql

begin;
insert into public.lectures (id, subject_id, created_by, title, pdf_path, page_count) values
  ('00000000-0000-0000-0000-000000000f31', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'L-react', 'x/r.pdf', 6);
insert into public.questions (id, subject_id, created_by, type, body) values
  ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'mcq', '{"text":"bonus"}');
insert into public.lecture_questions (id, lecture_id, slide_no, question_id, is_bonus) values
  ('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-000000000f31', 2, '00000000-0000-0000-0000-0000000000c9', true);
insert into public.lecture_sessions (id, lecture_id, created_by, code) values
  ('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-000000000f31', '00000000-0000-0000-0000-0000000000b1', '222222');
insert into public.session_participants (session_id, student_id, join_token, mode) values
  ('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-000000000101', 't1', 'remote'),
  ('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-000000000102', 't2', 'remote');

set local role service_role;
select * from public.app_add_reactions('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-000000000101', 2, 3, 1);
select * from public.app_add_reactions('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-000000000102', 2, 1, 0);
-- bir chaqiruvda ko'pi bilan 5; jami 20 dan oshmaydi
select * from public.app_add_reactions('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-000000000101', 2, 99, 0);
do $$ begin for i in 1..10 loop perform * from public.app_add_reactions('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-000000000101', 2, 5, 0); end loop; end $$;
reset role;
select pg_temp.expect('talaba/slayd/tur uchun jami chegara 20', (select cnt from public.session_reactions where student_id = '00000000-0000-0000-0000-000000000101' and kind = 'understood'), 20);
select pg_temp.expect('"tushunmadim" alohida hisoblanadi', (select cnt from public.session_reactions where student_id = '00000000-0000-0000-0000-000000000101' and kind = 'confused'), 1);

-- confused o'chirilsa — yozilmaydi
update public.lecture_sessions set confused_enabled = false where id = '00000000-0000-0000-0000-0000000005b1';
set local role service_role;
select * from public.app_add_reactions('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-000000000102', 2, 0, 5);
reset role;
select pg_temp.expect('confused o''chiq: yozilmadi', (select count(*) from public.session_reactions where student_id = '00000000-0000-0000-0000-000000000102' and kind = 'confused'), 0);
update public.lecture_sessions set confused_enabled = true where id = '00000000-0000-0000-0000-0000000005b1';

-- Ishtirokchi bo'lmagan, bloklangan, slayd chegarasidan tashqari — rad
set local role service_role;
select pg_temp.expect_error('ishtirokchi emas', $q$select * from public.app_add_reactions('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-000000000103', 2, 1, 0)$q$, 'not_participant');
select pg_temp.expect_error('slayd chegarasidan tashqari', $q$select * from public.app_add_reactions('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-000000000101', 7, 1, 0)$q$, 'validation');
reset role;
update public.session_participants set blocked = true where student_id = '00000000-0000-0000-0000-000000000102';
set local role service_role;
select pg_temp.expect_error('bloklangan', $q$select * from public.app_add_reactions('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-000000000102', 2, 1, 0)$q$, 'blocked');
reset role;
select pg_temp.expect('eng faol: bloklangan chiqarib tashlanadi', (select count(*) from public.app_top_reactors('00000000-0000-0000-0000-0000000005b1', 5)), 1);
select pg_temp.expect('eng faol: 1-o''rin S1 (21 ta)', (select out_total from public.app_top_reactors('00000000-0000-0000-0000-0000000005b1', 1) where out_student_id = '00000000-0000-0000-0000-000000000101'), 21);
update public.session_participants set blocked = false where student_id = '00000000-0000-0000-0000-000000000102';

-- Nishonli savol
set local role service_role;
select id as tq from public.app_open_targeted_question('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000c9', 2, 30, '{}', now(), array['00000000-0000-0000-0000-000000000101']::uuid[]) \gset
reset role;
select pg_temp.expect('nishonli savol: audience=targeted', (select count(*) from public.session_questions where id = :'tq' and audience = 'targeted' and target_ids = array['00000000-0000-0000-0000-000000000101']::uuid[]), 1);

-- RLS: o'z reaksiyasini ko'radi, boshqasiniki yo'q; begona o'qituvchi ko'rmaydi; yozolmaydi
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000102');
select pg_temp.expect('talaba: faqat o''zinikini', (select count(*) from public.session_reactions), 1);
select pg_temp.expect_error('talaba yoza olmaydi', $q$insert into public.session_reactions (session_id, student_id, slide_no, kind, cnt) values ('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-000000000102', 1, 'understood', 1)$q$, 'row-level security');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('o''qituvchi: o''z sessiyasi hammasi', (select count(*) from public.session_reactions), 3);
reset role;
rollback;
