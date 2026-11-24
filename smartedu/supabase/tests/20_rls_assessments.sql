-- 0002 testlari: savollar/kalitlar yopiqligi, natija ko'rinishi, vaqt, ball o'zgartirish, audit.
\i supabase/tests/_helpers.sql

begin;

-- ── Tayyorgarlik (superuser) ────────────────────────────────────
insert into public.subjects (id, name) values ('00000000-0000-0000-0000-00000000b002', 'Boshqa fan');
insert into public.groups (id, name) values ('00000000-0000-0000-0000-00000000a002', 'BOSHQA-1');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b2', 't2@test');
insert into public.profiles (id, role, full_name) values ('00000000-0000-0000-0000-0000000000b2', 'teacher', 'Ikkinchi Ustoz');
insert into public.teacher_subjects values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-00000000a002');

insert into public.questions (id, subject_id, created_by, type, body, params) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'mcq',
   '{"text":"2+2?","options":[{"id":"a","text":"4"},{"id":"b","text":"5"}]}', '{}'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'short_text',
   '{"text":"Tushuntiring"}', '{"rubric":[{"criterion":"a","points":2}]}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000b2', 'mcq',
   '{"text":"x"}', '{}');
insert into public.question_keys (question_id, correct, explanation) values
  ('00000000-0000-0000-0000-0000000000c1', '["a"]', 'Chunki 4'),
  ('00000000-0000-0000-0000-0000000000c2', '{"sample":"..."}', null),
  ('00000000-0000-0000-0000-0000000000c3', '["a"]', null);

-- A1: ikki savol (mcq 1 ball + short_text 2 ball). A3: faqat mcq (avtomatik tasdiqlanadi). A2: boshqa guruh.
insert into public.assessments (id, subject_id, group_id, created_by, title, opens_at, closes_at, duration_minutes, is_published) values
  ('00000000-0000-0000-0000-000000000e01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000a001',
   '00000000-0000-0000-0000-0000000000b1', 'Nazorat 1', now() - interval '1 hour', now() + interval '1 hour', 30, true),
  ('00000000-0000-0000-0000-000000000e02', '00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-00000000a002',
   '00000000-0000-0000-0000-0000000000b2', 'Boshqa guruh nazorati', now() - interval '1 hour', now() + interval '1 hour', 30, true),
  ('00000000-0000-0000-0000-000000000e03', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000a001',
   '00000000-0000-0000-0000-0000000000b1', 'Faqat test', now() - interval '1 hour', now() + interval '1 hour', 30, true),
  ('00000000-0000-0000-0000-000000000e04', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000a001',
   '00000000-0000-0000-0000-0000000000b1', 'Hali e''lon qilinmagan', now() - interval '1 hour', now() + interval '1 hour', 30, false);
insert into public.assessment_questions values
  ('00000000-0000-0000-0000-000000000e01', '00000000-0000-0000-0000-0000000000c1', 1, 1),
  ('00000000-0000-0000-0000-000000000e01', '00000000-0000-0000-0000-0000000000c2', 2, 2),
  ('00000000-0000-0000-0000-000000000e03', '00000000-0000-0000-0000-0000000000c1', 1, 1);

-- ── Urinishlarni boshlash (service_role) ────────────────────────
set local role service_role;
select id from public.app_start_attempt('00000000-0000-0000-0000-000000000e01', '00000000-0000-0000-0000-000000000101', 's1',
  '[{"question_id":"00000000-0000-0000-0000-0000000000c1","position":1,"points_max":1,"variant":{}},
    {"question_id":"00000000-0000-0000-0000-0000000000c2","position":2,"points_max":2,"variant":{}}]');
select id from public.app_start_attempt('00000000-0000-0000-0000-000000000e01', '00000000-0000-0000-0000-000000000102', 's2',
  '[{"question_id":"00000000-0000-0000-0000-0000000000c1","position":1,"points_max":1,"variant":{}},
    {"question_id":"00000000-0000-0000-0000-0000000000c2","position":2,"points_max":2,"variant":{}}]');
select id from public.app_start_attempt('00000000-0000-0000-0000-000000000e03', '00000000-0000-0000-0000-000000000103', 's3',
  '[{"question_id":"00000000-0000-0000-0000-0000000000c1","position":1,"points_max":1,"variant":{}}]');
-- Qayta boshlash o'sha urinishni qaytaradi (yangisini yaratmaydi)
select id from public.app_start_attempt('00000000-0000-0000-0000-000000000e01', '00000000-0000-0000-0000-000000000101', 'boshqa',
  '[]');
reset role;

select pg_temp.expect('qayta boshlash: urinish takrorlanmaydi',
  (select count(*) from public.attempts where student_id = '00000000-0000-0000-0000-000000000101'), 1);
select pg_temp.expect('qayta boshlash: urug'' o''zgarmaydi',
  (select count(*) from public.attempts where student_id = '00000000-0000-0000-0000-000000000101' and seed = 's1'), 1);
select pg_temp.expect('javob qatorlari yaratildi', (select count(*) from public.answers), 5);

select id as att1 from public.attempts where student_id = '00000000-0000-0000-0000-000000000101' \gset
select id as att2 from public.attempts where student_id = '00000000-0000-0000-0000-000000000102' \gset
select id as att3 from public.attempts where student_id = '00000000-0000-0000-0000-000000000103' \gset

-- Boshlash shartlari
set local role service_role;
select pg_temp.expect_error('boshqa guruh talabasi boshlay olmaydi',
  $q$select public.app_start_attempt('00000000-0000-0000-0000-000000000e02', '00000000-0000-0000-0000-000000000104', 'x', '[]')$q$,
  'not_your_group');
select pg_temp.expect_error('e''lon qilinmagan nazoratni boshlab bo''lmaydi',
  $q$select public.app_start_attempt('00000000-0000-0000-0000-000000000e04', '00000000-0000-0000-0000-000000000104', 'x', '[]')$q$,
  'not_found');
reset role;

-- ── Talaba: kalitlar va boshqalar yopiq ─────────────────────────
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select pg_temp.expect('talaba: savollarni ko''ra olmaydi', (select count(*) from public.questions), 0);
select pg_temp.expect('talaba: TO''G''RI JAVOBLARNI ko''ra olmaydi', (select count(*) from public.question_keys), 0);
select pg_temp.expect('talaba: o''z guruhining e''lon qilingan nazoratlari (2 ta)', (select count(*) from public.assessments), 2);
select pg_temp.expect('talaba: boshqa guruh nazoratini ko''rmaydi',
  (select count(*) from public.assessments where id = '00000000-0000-0000-0000-000000000e02'), 0);
select pg_temp.expect('talaba: natija chiqmaguncha o''z urinishini ham o''qiy olmaydi', (select count(*) from public.attempts), 0);
select pg_temp.expect('talaba: natija chiqmaguncha javoblarni o''qiy olmaydi', (select count(*) from public.answers), 0);
select pg_temp.expect_error('talaba: urinish yarata olmaydi',
  $q$insert into public.attempts (assessment_id, student_id, deadline_at, seed) values ('00000000-0000-0000-0000-000000000e01', '00000000-0000-0000-0000-000000000101', now() + interval '1 day', 'x')$q$,
  'row-level security');
select pg_temp.expect_error('talaba: ball funksiyasini chaqira olmaydi',
  $q$select public.app_set_answer_score('00000000-0000-0000-0000-000000000001', 1, true, null, null, null, null)$q$,
  'permission denied');
select pg_temp.expect_error('talaba: topshirish funksiyasini chaqira olmaydi',
  $q$select public.app_submit_attempt('00000000-0000-0000-0000-000000000001', '[]')$q$,
  'permission denied');
reset role;

-- ── Avtosaqlash va vaqt chegarasi (DB soati) ────────────────────
set local role service_role;
select pg_temp.expect('javob saqlandi',
  (select public.app_save_answers(:'att1', '00000000-0000-0000-0000-000000000101',
   '[{"question_id":"00000000-0000-0000-0000-0000000000c1","response":{"selected":["a"]}}]'))::bigint, 1);
select pg_temp.expect_error('boshqa talaba urinishiga yoza olmaydi',
  format($q$select public.app_save_answers(%L, '00000000-0000-0000-0000-000000000102', '[]')$q$, :'att1'), 'not_found');
reset role;
update public.attempts set deadline_at = now() - interval '1 minute' where id = :'att3';
set local role service_role;
select pg_temp.expect_error('muddat o''tgach saqlab bo''lmaydi',
  format($q$select public.app_save_answers(%L, '00000000-0000-0000-0000-000000000103', '[{"question_id":"00000000-0000-0000-0000-0000000000c1","response":{}}]')$q$, :'att3'),
  'time_over');
reset role;
update public.attempts set deadline_at = now() + interval '10 minutes' where id = :'att3';

-- ── Topshirish ──────────────────────────────────────────────────
select id as a1q1 from public.answers where attempt_id = :'att1' and question_id = '00000000-0000-0000-0000-0000000000c1' \gset
select id as a1q2 from public.answers where attempt_id = :'att1' and question_id = '00000000-0000-0000-0000-0000000000c2' \gset
select id as a2q1 from public.answers where attempt_id = :'att2' and question_id = '00000000-0000-0000-0000-0000000000c1' \gset
select id as a2q2 from public.answers where attempt_id = :'att2' and question_id = '00000000-0000-0000-0000-0000000000c2' \gset
select id as a3q1 from public.answers where attempt_id = :'att3' \gset

set local role service_role;
-- S1: mcq to'g'ri, short_text tekshirilishi kerak → 'submitted'
select status from public.app_submit_attempt(:'att1', format('[{"answer_id":"%s","score":1,"is_correct":true,"needs_review":false},{"answer_id":"%s","score":null,"is_correct":null,"needs_review":true}]', :'a1q1', :'a1q2')::jsonb);
select status from public.app_submit_attempt(:'att2', format('[{"answer_id":"%s","score":0,"is_correct":false,"needs_review":false},{"answer_id":"%s","score":null,"is_correct":null,"needs_review":true}]', :'a2q1', :'a2q2')::jsonb);
-- S3: faqat mcq → darrov 'finalized'
select status from public.app_submit_attempt(:'att3', format('[{"answer_id":"%s","score":1,"is_correct":true,"needs_review":false}]', :'a3q1')::jsonb);
-- Ikkinchi marta topshirish hech narsani o'zgartirmaydi
select status from public.app_submit_attempt(:'att3', format('[{"answer_id":"%s","score":0,"is_correct":false,"needs_review":false}]', :'a3q1')::jsonb);
reset role;

select pg_temp.expect('tekshiruv kutayotgan urinish: submitted',
  (select count(*) from public.attempts where id = :'att1' and status = 'submitted'), 1);
select pg_temp.expect('tekshiruv kerak emas: darrov finalized',
  (select count(*) from public.attempts where id = :'att3' and status = 'finalized' and total_score = 1 and max_score = 1), 1);
select pg_temp.expect('ikkinchi topshirish ballni o''zgartirmaydi',
  (select count(*) from public.answers where id = :'a3q1' and score = 1), 1);

set local role service_role;
select pg_temp.expect_error('tekshirilmagan javob bilan tasdiqlab bo''lmaydi',
  format($q$select public.app_finalize_attempt(%L, '00000000-0000-0000-0000-0000000000b1')$q$, :'att1'), 'pending_review');
select pg_temp.expect_error('maksimaldan yuqori ball',
  format($q$select * from public.app_set_answer_score(%L, 5, true, '00000000-0000-0000-0000-0000000000b1')$q$, :'a1q2'), 'score_out_of_range');
reset role;

-- ── Talaba natijani ko'rishi (show_score = after_finalize) ──────
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select pg_temp.expect('S1: tasdiqlanmagan — ko''rinmaydi', (select count(*) from public.attempts), 0);
select pg_temp.as_user('00000000-0000-0000-0000-000000000103');
select pg_temp.expect('S3: tasdiqlangan o''z urinishini ko''radi', (select count(*) from public.attempts), 1);
select pg_temp.expect('S3: faqat o''z javoblari', (select count(*) from public.answers), 1);
reset role;

-- ── O'qituvchi baholashi + audit ────────────────────────────────
set local role service_role;
select * from public.app_set_answer_score(:'a1q2', 1.5, true, '00000000-0000-0000-0000-0000000000b1', null, 'Yaxshi', '[{"criterion":"a","points":1.5}]');
select pg_temp.expect_error('ball o''zgartirishda sabab shart',
  format($q$select * from public.app_set_answer_score(%L, 2, true, '00000000-0000-0000-0000-0000000000b1')$q$, :'a1q2'), 'reason_required');
select * from public.app_set_answer_score(:'a1q2', 2, true, '00000000-0000-0000-0000-0000000000b1', 'Qo''shimcha mezon hisobga olindi');
select status from public.app_finalize_attempt(:'att1', '00000000-0000-0000-0000-0000000000b1');
reset role;

select pg_temp.expect('jami ball = 1 + 2', (select count(*) from public.attempts where id = :'att1' and total_score = 3 and max_score = 3), 1);
select pg_temp.expect('audit: set + adjust + finalize', (select count(*) from public.audit_log where attempt_id = :'att1'), 3);

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select pg_temp.expect('S1: tasdiqlangach natija ko''rinadi', (select count(*) from public.attempts), 1);
select pg_temp.expect('S1: har savol bo''yicha ball', (select count(*) from public.answers), 2);
select pg_temp.expect('S1: ball o''zgarishlari jurnali ko''rinadi (sabab bilan)', (select count(*) from public.audit_log), 3);
select pg_temp.expect('S1: boshqa talaba urinishini ko''rmaydi',
  (select count(*) from public.attempts where student_id <> auth.uid()), 0);
select pg_temp.as_user('00000000-0000-0000-0000-000000000102');
select pg_temp.expect('S2: tasdiqlanmagan, jurnal ham ko''rinmaydi', (select count(*) from public.audit_log), 0);
reset role;

-- ── O'qituvchi doirasi ──────────────────────────────────────────
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('T1: o''z savollari (2)', (select count(*) from public.questions), 2);
select pg_temp.expect('T1: o''z savollarining kalitlari', (select count(*) from public.question_keys), 2);
select pg_temp.expect('T1: o''z nazoratlari (3: A1, A3, A4)', (select count(*) from public.assessments), 3);
select pg_temp.expect('T1: o''z guruhi urinishlari (3)', (select count(*) from public.attempts), 3);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select pg_temp.expect('T2: faqat o''z savoli', (select count(*) from public.questions), 1);
select pg_temp.expect('T2: boshqa fan urinishlarini ko''rmaydi', (select count(*) from public.attempts), 0);
select pg_temp.expect('T2: boshqa fan javoblarini ko''rmaydi', (select count(*) from public.answers), 0);
with d as (delete from public.questions where id = '00000000-0000-0000-0000-0000000000c1' returning 1)
  select pg_temp.expect('T2: boshqa o''qituvchi savolini o''chira olmaydi', (select count(*) from d), 0);
select pg_temp.expect_error('T2: o''z fani bo''lmagan savol yarata olmaydi',
  $q$insert into public.questions (subject_id, created_by, type, body) values ('00000000-0000-0000-0000-00000000b001', auth.uid(), 'mcq', '{}')$q$,
  'row-level security');
reset role;

-- ── Savol ishlatilgach mazmuni qulflanadi ───────────────────────
select pg_temp.expect_error('ishlatilgan savol matnini o''zgartirib bo''lmaydi',
  $q$update public.questions set body = '{"text":"boshqa"}' where id = '00000000-0000-0000-0000-0000000000c1'$q$, 'question_in_use');
select pg_temp.expect_error('ishlatilgan savol kalitini o''zgartirib bo''lmaydi',
  $q$update public.question_keys set correct = '["b"]' where question_id = '00000000-0000-0000-0000-0000000000c1'$q$, 'question_in_use');
update public.questions set topic = 'Yangi mavzu' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.expect('mavzu (metama''lumot) o''zgartirish mumkin',
  (select count(*) from public.questions where topic = 'Yangi mavzu'), 1);

rollback;
