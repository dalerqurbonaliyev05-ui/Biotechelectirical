-- 0012 testlari: izohlarni saqlash, chegaralar, RLS
\i supabase/tests/_helpers.sql

begin;
insert into public.lectures (id, subject_id, created_by, title, pdf_path, page_count) values
  ('00000000-0000-0000-0000-000000000f51', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'L-annot', 'x/a.pdf', 4);
insert into public.lecture_sessions (id, lecture_id, created_by, code) values
  ('00000000-0000-0000-0000-0000000005d1', '00000000-0000-0000-0000-000000000f51', '00000000-0000-0000-0000-0000000000b1', '444444');

set local role service_role;
select public.app_save_annotations('00000000-0000-0000-0000-0000000005d1', 2, '[{"t":"s","c":"#f00","w":3,"p":[[0.1,0.1],[0.2,0.2]]}]');
select public.app_save_annotations('00000000-0000-0000-0000-0000000005d1', 2, '[{"t":"x","x":0.5,"y":0.5,"s":"$x^2$"}]');
select pg_temp.expect_error('slayd chegarasidan tashqari', $q$select public.app_save_annotations('00000000-0000-0000-0000-0000000005d1', 9, '[]')$q$, 'slide_out_of_range');
select pg_temp.expect_error('massiv emas', $q$select public.app_save_annotations('00000000-0000-0000-0000-0000000005d1', 1, '{"a":1}')$q$, 'validation');
reset role;
select pg_temp.expect('qayta saqlash almashtiradi (bitta qator)', (select count(*) from public.session_annotations where slide_no = 2), 1);
select pg_temp.expect('oxirgi holat saqlangan', (select count(*) from public.session_annotations where slide_no = 2 and items->0->>'t' = 'x'), 1);

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select pg_temp.expect('talaba to''g''ridan-to''g''ri o''qiy olmaydi', (select count(*) from public.session_annotations), 0);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('o''qituvchi o''z sessiyasini ko''radi', (select count(*) from public.session_annotations), 1);
reset role;

update public.lecture_sessions set status = 'ended', ended_at = now() where id = '00000000-0000-0000-0000-0000000005d1';
set local role service_role;
select pg_temp.expect_error('tugagan darsga yozib bo''lmaydi', $q$select public.app_save_annotations('00000000-0000-0000-0000-0000000005d1', 1, '[]')$q$, 'session_ended');
reset role;
rollback;
