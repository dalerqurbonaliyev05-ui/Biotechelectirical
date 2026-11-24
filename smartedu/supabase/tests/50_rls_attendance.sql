-- 0005 testlari: qo'shilish, takroriy kirish, davomat turi, RLS
\i supabase/tests/_helpers.sql

begin;
insert into public.lectures (id, subject_id, created_by, title, pdf_path, page_count) values
  ('00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'L1', 'x/a.pdf', 10);
insert into public.groups (id, name) values ('00000000-0000-0000-0000-00000000a002', 'BOSHQA-1');
insert into public.lecture_sessions (id, lecture_id, created_by, group_id, code) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000a001', '111111'),
  ('00000000-0000-0000-0000-0000000005a2', '00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000a002', '222222');
insert into public.lecture_sessions (id, lecture_id, created_by, code, status, ended_at) values
  ('00000000-0000-0000-0000-0000000005a3', '00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-0000000000b1', '333333', 'ended', now());

set local role service_role;
-- Birinchi kirish (masofadan)
select out_mode, out_rejoin from public.app_join_session('111111', '00000000-0000-0000-0000-000000000101', 'remote', 'tok-1');
select pg_temp.expect('birinchi kirish: 1 ishtirokchi + 1 davomat',
  (select count(*) from public.session_participants) + (select count(*) from public.attendance), 2);

-- Takroriy kirish: token yangilanadi, hisoblagich oshadi, tur pasaymaydi
select out_mode, out_rejoin from public.app_join_session('111111', '00000000-0000-0000-0000-000000000101', 'remote', 'tok-2');
reset role;
select pg_temp.expect('takroriy kirish: yangi token, rejoin = 1, yozuv takrorlanmadi',
  (select count(*) from public.session_participants where join_token = 'tok-2' and rejoin_count = 1), 1);
select pg_temp.expect('takroriy kirishda davomat takrorlanmaydi', (select count(*) from public.attendance), 1);

-- QR bilan kirsa tur yaxshilanadi; keyin oddiy kod bilan kirsa pasaymaydi
set local role service_role;
select out_mode from public.app_join_session('111111', '00000000-0000-0000-0000-000000000101', 'auditorium', 'tok-3');
select out_mode from public.app_join_session('111111', '00000000-0000-0000-0000-000000000101', 'remote', 'tok-4');
reset role;
select pg_temp.expect('tur: remote → auditorium (va qaytib pasaymaydi)',
  (select count(*) from public.attendance where mode = 'auditorium'), 1);
select pg_temp.expect('rejoin_count = 3', (select count(*) from public.session_participants where rejoin_count = 3 and join_token = 'tok-4'), 1);

-- Cheklovlar
set local role service_role;
select pg_temp.expect_error('noto''g''ri kod', $q$select * from public.app_join_session('999999', '00000000-0000-0000-0000-000000000102', 'remote', 't')$q$, 'session_not_found');
select pg_temp.expect_error('tugagan sessiyaga qo''shilib bo''lmaydi', $q$select * from public.app_join_session('333333', '00000000-0000-0000-0000-000000000102', 'remote', 't')$q$, 'session_not_found');
select pg_temp.expect_error('boshqa guruh sessiyasi', $q$select * from public.app_join_session('222222', '00000000-0000-0000-0000-000000000102', 'remote', 't')$q$, 'not_your_group');
select pg_temp.expect_error('talaba bo''lmagan foydalanuvchi', $q$select * from public.app_join_session('111111', '00000000-0000-0000-0000-0000000000b1', 'remote', 't')$q$, 'forbidden');
select out_mode from public.app_join_session('111111', '00000000-0000-0000-0000-000000000102', 'auditorium', 'tok-s2');
reset role;

-- RLS
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select pg_temp.expect('talaba: ishtirokchilar (token) yopiq', (select count(*) from public.session_participants), 0);
select pg_temp.expect('talaba: faqat o''z davomati', (select count(*) from public.attendance), 1);
select pg_temp.expect_error('talaba: davomatni yoza olmaydi',
  $q$insert into public.attendance (session_id, student_id, mode) values ('00000000-0000-0000-0000-0000000005a1', auth.uid(), 'auditorium')$q$, 'row-level security');
select pg_temp.expect_error('talaba: joinni chaqira olmaydi', $q$select * from public.app_join_session('111111', auth.uid(), 'auditorium', 'x')$q$, 'permission denied');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('o''qituvchi: o''z sessiyasi ishtirokchilari', (select count(*) from public.session_participants), 2);
select pg_temp.expect('o''qituvchi: davomat', (select count(*) from public.attendance), 2);
rollback;
