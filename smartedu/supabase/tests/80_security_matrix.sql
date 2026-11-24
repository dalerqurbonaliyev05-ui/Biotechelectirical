-- 11-bosqich: xavfsizlik matritsasi. Yangi jadval/funksiya qo'shilsa va himoyalanmasa — test YIQILADI.
\i supabase/tests/_helpers.sql

-- 1) public sxemadagi HAR BIR jadvalda RLS yoqilgan
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' and not rowsecurity loop
    raise exception 'TEST YIQILDI: RLS o''chiq: public.%', r.tablename;
  end loop;
  raise notice 'ok  - barcha public jadvallarda RLS yoqilgan';
end $$;

-- 2) Foydalanuvchi JWT'i (anon/authenticated) hech bir `app_*` server funksiyasini chaqira olmaydi
do $$
declare r record;
begin
  for r in select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'app\_%'
             and p.proname <> 'app_role' /* RLS yordamchisi: siyosatlar chaqiradi, faqat chaqiruvchining o'zi haqida javob beradi */ loop
    if has_function_privilege('anon', r.oid, 'execute') or has_function_privilege('authenticated', r.oid, 'execute') then
      raise exception 'TEST YIQILDI: % foydalanuvchi uchun ochiq', r.proname;
    end if;
    if not has_function_privilege('service_role', r.oid, 'execute') then
      raise exception 'TEST YIQILDI: % service_role uchun yopiq', r.proname;
    end if;
  end loop;
  raise notice 'ok  - app_* funksiyalari faqat service_role uchun';
end $$;

-- 3) Anonim foydalanuvchi hech narsa ko'rmaydi
do $$
declare r record; n bigint;
begin
  set local role anon;
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('select count(*) from public.%I', r.tablename) into n;
    if n <> 0 then raise exception 'TEST YIQILDI: anon public.% ni ko''ra oladi (%)', r.tablename, n; end if;
  end loop;
  reset role;
  raise notice 'ok  - anon hech bir jadvalni ko''ra olmaydi';
end $$;

-- 4) Talaba ko'rinish matritsasi: ikki talabada ham ma'lumot bor, har biri FAQAT o'zinikini ko'radi
begin;
insert into public.groups (id, name) values ('00000000-0000-0000-0000-00000000a002', 'BOSHQA-1');
insert into public.lectures (id, subject_id, created_by, title, pdf_path, page_count) values
  ('00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'L', 'x/a.pdf', 5);
insert into public.questions (id, subject_id, created_by, type, body) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'mcq', '{"text":"q"}');
insert into public.question_keys (question_id, correct, explanation) values ('00000000-0000-0000-0000-0000000000c1', '["a"]', 'izoh');
insert into public.lecture_questions (id, lecture_id, slide_no, question_id) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000f01', 2, '00000000-0000-0000-0000-0000000000c1');
insert into public.assessments (id, subject_id, group_id, created_by, title, opens_at, closes_at, duration_minutes, is_published) values
  ('00000000-0000-0000-0000-000000000e01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000b1', 'A1', now() - interval '1 hour', now() + interval '1 hour', 30, true),
  ('00000000-0000-0000-0000-000000000e02', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000b1', 'A2 qoralama', now() - interval '1 hour', now() + interval '1 hour', 30, false),
  ('00000000-0000-0000-0000-000000000e03', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000a002', '00000000-0000-0000-0000-0000000000b1', 'A3 boshqa guruh', now() - interval '1 hour', now() + interval '1 hour', 30, true);
insert into public.assessment_questions values ('00000000-0000-0000-0000-000000000e01', '00000000-0000-0000-0000-0000000000c1', 1, 1);
insert into public.attempts (id, assessment_id, student_id, deadline_at, seed) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000e01', '00000000-0000-0000-0000-000000000101', now() + interval '1 hour', 's'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000e01', '00000000-0000-0000-0000-000000000102', now() + interval '1 hour', 's');
insert into public.answers (attempt_id, question_id, position, points_max) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 1, 1),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 1, 1);
insert into public.lecture_sessions (id, lecture_id, created_by, code) values ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-0000000000b1', '123456');
insert into public.session_participants (session_id, student_id, join_token, mode) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-000000000101', 'tok1', 'remote'),
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-000000000102', 'tok2', 'remote');
insert into public.attendance (session_id, student_id, mode) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-000000000101', 'remote'),
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-000000000102', 'remote');
insert into public.session_questions (id, session_id, question_id, slide_no, time_limit_sec, opened_at) values
  ('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000000c1', 2, 30, now());
insert into public.session_answers (session_question_id, session_id, student_id, response, is_correct, points, bonus, elapsed_ms) values
  ('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-000000000101', '{}', true, 100, 5, 1000),
  ('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-000000000102', '{}', false, 0, 0, 2000);
insert into public.scores (session_id, student_id, total_points) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-000000000101', 105),
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-000000000102', 0);
insert into public.lab_results (student_id, lab_id, score, max_score, lab_time, nonce) values
  ('00000000-0000-0000-0000-000000000101', 'motor-01', 5, 10, now(), 'matrix-n1'),
  ('00000000-0000-0000-0000-000000000102', 'motor-01', 9, 10, now(), 'matrix-n2');
insert into public.audit_log (action, entity, subject_student_id, attempt_id) values
  ('score.set', 'answer', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-0000000000f2');

create function pg_temp.visible(tbl text) returns bigint language plpgsql as $$
declare n bigint; begin execute format('select count(*) from public.%I', tbl) into n; return n; end $$;

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');

-- Faqat O'ZINIKI (1 ta): talaba ikkinchi talabaning ma'lumotini ko'rmaydi
select pg_temp.expect('talaba/profiles: faqat o''zi', pg_temp.visible('profiles'), 1);
select pg_temp.expect('talaba/attendance: faqat o''zinikini', pg_temp.visible('attendance'), 1);
select pg_temp.expect('talaba/lab_results: faqat o''zinikini', pg_temp.visible('lab_results'), 1);
select pg_temp.expect('talaba/assessments: faqat o''z guruhining e''lon qilingani', pg_temp.visible('assessments'), 1);

-- Umuman KO'RINMAYDI (0): to'g'ri javob, ball, token, boshqalarning natijasi
select pg_temp.expect('talaba/questions yopiq', pg_temp.visible('questions'), 0);
select pg_temp.expect('talaba/question_keys (TO''G''RI JAVOBLAR) yopiq', pg_temp.visible('question_keys'), 0);
select pg_temp.expect('talaba/assessment_questions yopiq', pg_temp.visible('assessment_questions'), 0);
select pg_temp.expect('talaba/attempts (natija e''lon qilinmagan) yopiq', pg_temp.visible('attempts'), 0);
select pg_temp.expect('talaba/answers yopiq', pg_temp.visible('answers'), 0);
select pg_temp.expect('talaba/audit_log (boshqaning) yopiq', pg_temp.visible('audit_log'), 0);
select pg_temp.expect('talaba/lectures yopiq', pg_temp.visible('lectures'), 0);
select pg_temp.expect('talaba/lecture_questions yopiq', pg_temp.visible('lecture_questions'), 0);
select pg_temp.expect('talaba/lecture_sessions yopiq', pg_temp.visible('lecture_sessions'), 0);
select pg_temp.expect('talaba/session_participants (TOKEN) yopiq', pg_temp.visible('session_participants'), 0);
select pg_temp.expect('talaba/session_questions yopiq', pg_temp.visible('session_questions'), 0);
select pg_temp.expect('talaba/session_answers yopiq', pg_temp.visible('session_answers'), 0);
select pg_temp.expect('talaba/scores yopiq', pg_temp.visible('scores'), 0);
select pg_temp.expect('talaba/teacher_subjects yopiq', pg_temp.visible('teacher_subjects'), 0);
select pg_temp.expect('talaba/app_settings yopiq', pg_temp.visible('app_settings'), 0);

-- Ikkinchi talaba uchun xuddi shu izolyatsiya
select pg_temp.as_user('00000000-0000-0000-0000-000000000102');
select pg_temp.expect('talaba2/attendance: faqat o''zinikini', pg_temp.visible('attendance'), 1);
select pg_temp.expect('talaba2/lab_results: faqat o''zinikini', pg_temp.visible('lab_results'), 1);
select pg_temp.expect('talaba2/audit_log: natija e''lon qilinmagan — ko''rinmaydi', pg_temp.visible('audit_log'), 0);
select pg_temp.expect('talaba2/boshqa talaba lab natijasini ko''ra olmaydi',
  (select count(*) from public.lab_results where student_id = '00000000-0000-0000-0000-000000000101'), 0);
reset role;
rollback;

-- 5) RLS yordamchi funksiyalari: anon chaqira olmaydi, authenticated chaqira oladi (siyosatlar ularga tayanadi)
do $$
declare r record; n integer := 0;
begin
  for r in select p.oid, p.proname from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
           where ns.nspname = 'public' and p.prosecdef and (p.proname not like 'app\_%' or p.proname = 'app_role') loop
    n := n + 1;
    if has_function_privilege('anon', r.oid, 'execute') then
      raise exception 'TEST YIQILDI: yordamchi funksiya % anonimga ochiq', r.proname;
    end if;
    if not has_function_privilege('authenticated', r.oid, 'execute') then
      raise exception 'TEST YIQILDI: yordamchi funksiya % authenticated uchun yopiq (RLS buziladi)', r.proname;
    end if;
  end loop;
  if n < 17 then raise exception 'TEST YIQILDI: yordamchi funksiyalar kam topildi (%)', n; end if;
  raise notice 'ok  - RLS yordamchi funksiyalari: anon yopiq, authenticated ochiq (% ta)', n;
end $$;
