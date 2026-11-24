-- 0007 testlari: laboratoriya natijalari
\i supabase/tests/_helpers.sql

begin;
insert into public.lab_results (student_id, lab_id, score, max_score, passed, lab_time, nonce) values
  ('00000000-0000-0000-0000-000000000101', 'motor-01', 8, 10, true, now(), 'n-0000001'),
  ('00000000-0000-0000-0000-000000000102', 'motor-01', 5, 10, false, now(), 'n-0000002');

select pg_temp.expect_error('nonce takrorlanmaydi (replay himoyasi)',
  $q$insert into public.lab_results (student_id, lab_id, score, max_score, lab_time, nonce) values ('00000000-0000-0000-0000-000000000101', 'motor-01', 10, 10, now(), 'n-0000001')$q$, 'lab_results_nonce_key');
select pg_temp.expect_error('ball maksimaldan oshmaydi',
  $q$insert into public.lab_results (student_id, lab_id, score, max_score, lab_time, nonce) values ('00000000-0000-0000-0000-000000000101', 'x', 11, 10, now(), 'n-3')$q$, 'check');
select pg_temp.expect_error('lab_id formati',
  $q$insert into public.lab_results (student_id, lab_id, score, max_score, lab_time, nonce) values ('00000000-0000-0000-0000-000000000101', '../x', 1, 10, now(), 'n-4')$q$, 'check');

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select pg_temp.expect('talaba: faqat o''z natijasi', (select count(*) from public.lab_results), 1);
select pg_temp.expect_error('talaba: natijani o''zi yoza olmaydi (soxta ball)',
  $q$insert into public.lab_results (student_id, lab_id, score, max_score, lab_time, nonce) values (auth.uid(), 'motor-02', 10, 10, now(), 'n-fake')$q$, 'row-level security');
update public.lab_results set score = 10;
select pg_temp.expect('talaba: natijani o''zgartira olmaydi', (select count(*) from public.lab_results where score = 10), 0);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('o''qituvchi: o''z guruhi talabalari natijasi', (select count(*) from public.lab_results), 2);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect('admin: hammasi', (select count(*) from public.lab_results), 2);
rollback;
