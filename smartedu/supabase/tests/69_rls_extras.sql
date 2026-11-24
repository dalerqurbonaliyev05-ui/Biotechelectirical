-- 0013 testlari: savol qutisi (anonimlik, ovoz, doskaga chiqarish), tezkor so'rov (bitta ochiq, bitta ovoz), RLS
\i supabase/tests/_helpers.sql

begin;
insert into public.lectures (id, subject_id, created_by, title, pdf_path, page_count) values
  ('00000000-0000-0000-0000-000000000f71', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'L-extras', 'x/e.pdf', 3);
insert into public.lecture_sessions (id, lecture_id, created_by, code) values
  ('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-000000000f71', '00000000-0000-0000-0000-0000000000b1', '666666');
insert into public.session_participants (session_id, student_id, join_token, mode) values
  ('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-000000000101', 't1', 'remote'),
  ('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-000000000102', 't2', 'remote');

set local role service_role;
select public.app_ask_create('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-000000000101', 'Bu formula qaerdan kelib chiqadi?', true) as a1 \gset
select public.app_ask_create('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-000000000102', 'Imtihonda chiqadimi?', false) as a2 \gset
select pg_temp.expect_error('juda qisqa savol', $q$select public.app_ask_create('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-000000000101', 'ha', true)$q$, 'validation');
select pg_temp.expect_error('ishtirokchi emas', $q$select public.app_ask_create('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-000000000103', 'Savolim bor', true)$q$, 'not_participant');
-- ovoz: har talaba bitta; qayta bosish o'zgartirmaydi
select pg_temp.expect('ovoz 1', (select public.app_ask_vote(:'a1', '00000000-0000-0000-0000-000000000102')), 1);
select pg_temp.expect('qayta ovoz sonni oshirmaydi', (select public.app_ask_vote(:'a1', '00000000-0000-0000-0000-000000000102')), 1);
select pg_temp.expect('ikkinchi talaba ovozi', (select public.app_ask_vote(:'a1', '00000000-0000-0000-0000-000000000101')), 2);
-- doskaga bitta savol chiqadi
select public.app_ask_moderate(:'a1', '00000000-0000-0000-0000-0000000005f1', true, null, null);
select public.app_ask_moderate(:'a2', '00000000-0000-0000-0000-0000000005f1', true, null, null);
-- 5 ta chegarasi
do $$ begin for i in 1..5 loop begin perform public.app_ask_create('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-000000000101', 'Savol raqami ' || i, true); exception when others then null; end; end loop; end $$;
reset role;
select pg_temp.expect('doskada faqat bitta savol', (select count(*) from public.session_asks where on_board), 1);
select pg_temp.expect('talaba savollari 5 dan oshmaydi', (select count(*) from public.session_asks where author_id = '00000000-0000-0000-0000-000000000101'), 5);
set local role service_role;
select public.app_ask_moderate(:'a2', '00000000-0000-0000-0000-0000000005f1', null, null, true);
select pg_temp.expect_error('yashirilgan savolga ovoz yo''q', format($q$select public.app_ask_vote(%L, '00000000-0000-0000-0000-000000000101')$q$, :'a2'), 'not_found');
reset role;
select pg_temp.expect('yashirilgan savol doskadan tushdi', (select count(*) from public.session_asks where id = :'a2' and on_board), 0);

-- Tezkor so'rov
set local role service_role;
select public.app_poll_open('00000000-0000-0000-0000-0000000005f1', 'Tushunarlimi?', '[{"id":"yes","text":"Ha"},{"id":"no","text":"Yo''q"}]') as p1 \gset
select public.app_poll_vote(:'p1', '00000000-0000-0000-0000-000000000101', 'yes');
select pg_temp.expect_error('ikki marta ovoz', format($q$select public.app_poll_vote(%L, '00000000-0000-0000-0000-000000000101', 'no')$q$, :'p1'), 'duplicate');
select pg_temp.expect_error('noma''lum variant', format($q$select public.app_poll_vote(%L, '00000000-0000-0000-0000-000000000102', 'maybe')$q$, :'p1'), 'validation');
select public.app_poll_open('00000000-0000-0000-0000-0000000005f1', 'Ikkinchi so''rov', '[{"id":"a","text":"A"},{"id":"b","text":"B"}]') as p2 \gset
reset role;
select pg_temp.expect('yangi so''rov oldingisini yopdi (bitta ochiq)', (select count(*) from public.session_polls where closed_at is null), 1);
set local role service_role;
select pg_temp.expect_error('yopiq so''rovga ovoz yo''q', format($q$select public.app_poll_vote(%L, '00000000-0000-0000-0000-000000000102', 'yes')$q$, :'p1'), 'closed');
select public.app_poll_close('00000000-0000-0000-0000-0000000005f1');
select pg_temp.expect_error('ochiq so''rov yo''q', $q$select public.app_poll_close('00000000-0000-0000-0000-0000000005f1')$q$, 'no_open_poll');
reset role;

-- RLS: talaba boshqa talaba savolini (muallifni) ko'rmaydi; o'z ovozini ko'radi; o'qituvchi so'rovni ko'radi
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000102');
select pg_temp.expect('talaba: faqat o''z savollari (muallif maxfiyligi)', (select count(*) from public.session_asks where author_id <> auth.uid()), 0);
select pg_temp.expect('talaba: boshqa ovozlar ko''rinmaydi', (select count(*) from public.session_ask_votes where voter_id <> auth.uid()), 0);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('o''qituvchi: savol muallifini to''g''ridan-to''g''ri o''qimaydi (API orqali, muallifsiz)', (select count(*) from public.session_asks), 0);
select pg_temp.expect('o''qituvchi: so''rovlarni ko''radi', (select count(*) from public.session_polls), 2);
reset role;
rollback;
