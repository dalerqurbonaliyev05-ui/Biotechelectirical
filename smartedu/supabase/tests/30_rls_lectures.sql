-- 0003 testlari: ma'ruzalar va Storage himoyasi
\i supabase/tests/_helpers.sql

begin;
insert into public.subjects (id, name) values ('00000000-0000-0000-0000-00000000b002', 'Boshqa fan');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b2', 't2@test');
insert into public.profiles (id, role, full_name) values ('00000000-0000-0000-0000-0000000000b2', 'teacher', 'Ikkinchi Ustoz');
insert into public.groups (id, name) values ('00000000-0000-0000-0000-00000000a002', 'BOSHQA-1');
insert into public.teacher_subjects values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-00000000a002');

insert into public.lectures (id, subject_id, created_by, title, pdf_path, page_count) values
  ('00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', '1-ma''ruza', '00000000-0000-0000-0000-0000000000b1/a.pdf', 20),
  ('00000000-0000-0000-0000-000000000f02', '00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000b2', 'Boshqa ma''ruza', '00000000-0000-0000-0000-0000000000b2/b.pdf', 10);
insert into public.questions (id, subject_id, created_by, type, body) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'mcq', '{"text":"x"}');
insert into public.lecture_questions (lecture_id, slide_no, question_id) values
  ('00000000-0000-0000-0000-000000000f01', 3, '00000000-0000-0000-0000-0000000000c1');
insert into storage.objects (bucket_id, name) values
  ('lectures', '00000000-0000-0000-0000-0000000000b1/a.pdf'),
  ('lectures', '00000000-0000-0000-0000-0000000000b2/b.pdf');

select pg_temp.expect('bucket: shaxsiy; faqat PDF va JPEG (miniatura)',
  (select count(*) from storage.buckets where id = 'lectures' and not public and allowed_mime_types = array['application/pdf', 'image/jpeg']), 1);

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select pg_temp.expect('talaba: ma''ruzalarni ko''rmaydi', (select count(*) from public.lectures), 0);
select pg_temp.expect('talaba: slayd savollarini ko''rmaydi', (select count(*) from public.lecture_questions), 0);
select pg_temp.expect('talaba: PDF fayllarni ko''rmaydi', (select count(*) from storage.objects where bucket_id = 'lectures'), 0);
select pg_temp.expect_error('talaba: PDF yuklay olmaydi',
  $q$insert into storage.objects (bucket_id, name) values ('lectures', '00000000-0000-0000-0000-000000000101/x.pdf')$q$, 'row-level security');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('T1: faqat o''z fani ma''ruzasi', (select count(*) from public.lectures), 1);
select pg_temp.expect('T1: slayd savollari', (select count(*) from public.lecture_questions), 1);
select pg_temp.expect('T1: faqat o''z papkasidagi PDF', (select count(*) from storage.objects where bucket_id = 'lectures'), 1);
insert into storage.objects (bucket_id, name) values ('lectures', '00000000-0000-0000-0000-0000000000b1/c.pdf');
select pg_temp.expect_error('T1: boshqa o''qituvchi papkasiga yoza olmaydi',
  $q$insert into storage.objects (bucket_id, name) values ('lectures', '00000000-0000-0000-0000-0000000000b2/hack.pdf')$q$, 'row-level security');
select pg_temp.expect_error('T1: boshqa fan uchun ma''ruza yarata olmaydi',
  $q$insert into public.lectures (subject_id, created_by, title, pdf_path, page_count) values ('00000000-0000-0000-0000-00000000b002', auth.uid(), 'x', 'p', 1)$q$, 'row-level security');
select pg_temp.expect_error('T1: boshqa o''qituvchi ma''ruzasiga savol biriktira olmaydi',
  $q$insert into public.lecture_questions (lecture_id, slide_no, question_id) values ('00000000-0000-0000-0000-000000000f02', 1, '00000000-0000-0000-0000-0000000000c1')$q$, 'row-level security');
with d as (delete from public.lectures where id = '00000000-0000-0000-0000-000000000f02' returning 1)
  select pg_temp.expect('T1: boshqa ma''ruzani o''chira olmaydi', (select count(*) from d), 0);

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select pg_temp.expect('T2: boshqa o''qituvchi ma''ruzasini ko''rmaydi',
  (select count(*) from public.lectures where id = '00000000-0000-0000-0000-000000000f01'), 0);

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect('admin: hammasini ko''radi', (select count(*) from public.lectures), 2);
rollback;

-- ── 0008: nuqtalar, miniatyuralar, kitoblar ─────────────────────
begin;
insert into public.lectures (id, subject_id, created_by, title, pdf_path, page_count) values
  ('00000000-0000-0000-0000-000000000f31', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'L8', 'x/b.pdf', 6);
insert into public.lecture_slides values ('00000000-0000-0000-0000-000000000f31', 1, 'x/b/1.jpg');
insert into public.lecture_checkpoints (id, lecture_id, after_slide) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000f31', 3);
insert into public.slide_books (lecture_id, slide_no, title, slug, page) values ('00000000-0000-0000-0000-000000000f31', 2, 'Ohm qonuni', 'ohm-qonuni', 12);

select pg_temp.expect_error('bitta slayddan keyin bitta nuqta',
  $q$insert into public.lecture_checkpoints (lecture_id, after_slide) values ('00000000-0000-0000-0000-000000000f31', 3)$q$, 'lecture_checkpoints_lecture_id_after_slide_key');
select pg_temp.expect_error('kitob slug formati', $q$insert into public.slide_books (lecture_id, slide_no, title, slug) values ('00000000-0000-0000-0000-000000000f31', 1, 'x', '../x')$q$, 'check');

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select pg_temp.expect('talaba: nuqta/miniatyura/kitob yopiq', (select count(*) from public.lecture_checkpoints) + (select count(*) from public.lecture_slides) + (select count(*) from public.slide_books), 0);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('o''qituvchi: o''z nuqtalarini ko''radi va yozadi', (select count(*) from public.lecture_checkpoints), 1);
insert into public.slide_books (lecture_id, slide_no, title, slug) values ('00000000-0000-0000-0000-000000000f31', 4, 'Yana', 'yana-kitob');
select pg_temp.expect('o''qituvchi: o''z ma''ruzasiga kitob qo''sha oladi', (select count(*) from public.slide_books), 2);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select pg_temp.expect('boshqa o''qituvchi: ko''rmaydi', (select count(*) from public.lecture_checkpoints) + (select count(*) from public.slide_books), 0);
select pg_temp.expect_error('boshqa o''qituvchi: yoza olmaydi', $q$insert into public.slide_books (lecture_id, slide_no, title, slug) values ('00000000-0000-0000-0000-000000000f31', 1, 'h', 'hack')$q$, 'row-level security');
reset role;
rollback;
