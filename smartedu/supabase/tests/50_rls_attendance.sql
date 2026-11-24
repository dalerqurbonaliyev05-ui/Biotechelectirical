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

-- ── 0009: mehmon rejimi ─────────────────────────────────────────
begin;
insert into public.lectures (id, subject_id, created_by, title, pdf_path, page_count) values
  ('00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'L1', 'x/a.pdf', 10);
insert into public.lecture_sessions (id, lecture_id, created_by, code, group_id) values
  ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-0000000000b1', '777777', '00000000-0000-0000-0000-00000000a001'),
  ('00000000-0000-0000-0000-0000000005c2', '00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-0000000000b1', '888888', null);
-- Mehmon = profiles'da yo'q auth foydalanuvchisi
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000009a1', null);

set local role service_role;
-- Guruhli sessiyaga mehmon (guruhi yo'q) QO'SHILA OLADI (ro'yxatdan o'tmagan talaba)
select out_mode from public.app_join_session('777777', '00000000-0000-0000-0000-0000000009a1', 'remote', 'g-tok', true, 'Karimov Vali', 'EE-22');
select pg_temp.expect_error('mehmon ismsiz kira olmaydi', $q$select * from public.app_join_session('777777', '00000000-0000-0000-0000-0000000009a1', 'remote', 't', true, '', null)$q$, 'guest_name_required');
select pg_temp.expect_error('profili bor foydalanuvchi mehmon sifatida kira olmaydi', $q$select * from public.app_join_session('777777', '00000000-0000-0000-0000-000000000101', 'remote', 't', true, 'Soxta Mehmon', null)$q$, 'forbidden');
reset role;
select pg_temp.expect('mehmon yozuvi: is_guest, ism, guruh matni', (select count(*) from public.session_participants where is_guest and guest_name = 'Karimov Vali' and guest_group = 'EE-22'), 1);

-- Mehmonlarni o'chirib qo'yish
update public.lecture_sessions set allow_guests = false where id = '00000000-0000-0000-0000-0000000005c1';
set local role service_role;
select pg_temp.expect_error('allow_guests = false: yangi mehmon kira olmaydi', $q$select * from public.app_join_session('777777', '00000000-0000-0000-0000-000000000102', 'remote', 't', true, 'Yangi Mehmon', null)$q$, 'guests_not_allowed');
reset role;

-- Bloklash: qayta kira olmaydi (mehmonlarga yana ruxsat berilgan holatda ham)
update public.lecture_sessions set allow_guests = true where id = '00000000-0000-0000-0000-0000000005c1';
update public.session_participants set blocked = true where student_id = '00000000-0000-0000-0000-0000000009a1';
set local role service_role;
select pg_temp.expect_error('bloklangan qayta kira olmaydi', $q$select * from public.app_join_session('777777', '00000000-0000-0000-0000-0000000009a1', 'remote', 't2', true, 'Karimov Vali', null)$q$, 'blocked');

-- Kodni yangilash
select public.app_rotate_session_code('00000000-0000-0000-0000-0000000005c1');
select pg_temp.expect_error('eski kod bekor', $q$select * from public.app_join_session('777777', '00000000-0000-0000-0000-000000000103', 'remote', 't', false, null, null)$q$, 'session_not_found');
reset role;
select pg_temp.expect('kod yangilandi', (select count(*) from public.lecture_sessions where id = '00000000-0000-0000-0000-0000000005c1' and code <> '777777' and rev = 1), 1);

-- Bog'lash: faqat dars tugagach; javoblar va ball talabaga o'tadi
insert into public.questions (id, subject_id, created_by, type, body) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'mcq', '{"text":"q"}');
insert into public.session_questions (id, session_id, question_id, slide_no, time_limit_sec, opened_at) values ('00000000-0000-0000-0000-0000000005d1', '00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000000c1', 1, 30, now());
set local role service_role;
select out_status from public.app_record_live_answer('00000000-0000-0000-0000-0000000005d1', '00000000-0000-0000-0000-0000000009a1', '{}', true, 100, 7, 1000);
select id as gp from public.session_participants where is_guest \gset
select pg_temp.expect_error('dars davomida bog''lab bo''lmaydi', format($q$select public.app_link_guest(%L, %L, '00000000-0000-0000-0000-000000000104')$q$, '00000000-0000-0000-0000-0000000005c1', :'gp'), 'session_active');
select public.app_session_end('00000000-0000-0000-0000-0000000005c1');
select pg_temp.expect_error('mehmonni bog''lash: talaba bo''lmagan', format($q$select public.app_link_guest(%L, %L, '00000000-0000-0000-0000-0000000009a1')$q$, '00000000-0000-0000-0000-0000000005c1', :'gp'), 'forbidden');
select public.app_link_guest('00000000-0000-0000-0000-0000000005c1', :'gp', '00000000-0000-0000-0000-000000000104');
reset role;
select pg_temp.expect('bog''langach ball va davomat talabaga o''tdi',
  (select count(*) from public.scores where student_id = '00000000-0000-0000-0000-000000000104' and total_points = 107)
  + (select count(*) from public.attendance where student_id = '00000000-0000-0000-0000-000000000104')
  + (select count(*) from public.session_participants where student_id = '00000000-0000-0000-0000-000000000104' and linked_student_id is not null), 3);
select pg_temp.expect('mehmonda ball qolmadi', (select count(*) from public.scores where student_id = '00000000-0000-0000-0000-0000000009a1'), 0);

-- RLS: mehmon (auth foydalanuvchi, profil yo'q) hech narsani ko'rmaydi; o'z davomatidan tashqari
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000009a1');
select pg_temp.expect('mehmon: profillar, sessiyalar, savollar, javoblar — yopiq',
  (select count(*) from public.profiles) + (select count(*) from public.lecture_sessions) + (select count(*) from public.session_questions) + (select count(*) from public.session_answers) + (select count(*) from public.scores) + (select count(*) from public.session_participants) + (select count(*) from public.questions) + (select count(*) from public.lectures), 0);
select pg_temp.expect_error('mehmon: qo''shilish funksiyasini chaqira olmaydi', $q$select * from public.app_join_session('888888', auth.uid(), 'remote', 'x', true, 'X Y', null)$q$, 'permission denied');
reset role;
rollback;
