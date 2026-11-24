-- 0001 RLS testlari. Muvaffaqiyatsizlikda EXCEPTION ko'taradi.
create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end $$;

create function pg_temp.expect(label text, got bigint, want bigint) returns void language plpgsql as $$
begin
  if got is distinct from want then
    raise exception 'TEST YIQILDI [%]: kutilgan %, olingan %', label, want, got;
  end if;
  raise notice 'ok  - %', label;
end $$;

-- Seed to'g'ri yuklanganmi
select pg_temp.expect('seed: 12 profil', (select count(*) from public.profiles), 12);
select pg_temp.expect('seed: 10 talaba', (select count(*) from public.profiles where role='student'), 10);

begin;
set local role authenticated;
-- Talaba o'z profilini ko'radi, boshqasini emas
select pg_temp.as_user('00000000-0000-0000-0000-000000000101');
select pg_temp.expect('talaba: faqat o''zi', (select count(*) from public.profiles), 1);
select pg_temp.expect('talaba: boshqa talabani ko''ra olmaydi',
  (select count(*) from public.profiles where student_code = 'S002'), 0);
-- Talaba o'z rolini o'zgartira olmaydi (UPDATE siyosati yo'q → 0 qator)
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-000000000101';
select pg_temp.expect('talaba: rolni o''zgartira olmaydi',
  (select count(*) from public.profiles where role = 'admin'), 0);
-- Talaba tashkiliy ma'lumotni o'qiydi, yozolmaydi
select pg_temp.expect('talaba: guruhlarni o''qiydi', (select count(*) from public.groups), 1);
do $$ begin
  begin
    insert into public.groups (name) values ('HACK');
    raise exception 'TEST YIQILDI: talaba guruh qo''sha oldi';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;
-- Talaba sozlamalarni to'g'ridan-to'g'ri o'qiy olmaydi
select pg_temp.expect('talaba: app_settings yopiq', (select count(*) from public.app_settings), 0);
rollback;

begin;
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('o''qituvchi: o''z + 10 talaba', (select count(*) from public.profiles), 11);
select pg_temp.expect('o''qituvchi: sozlamalarni o''qiydi', (select (count(*) > 0)::int from public.app_settings)::bigint, 1);
rollback;

begin;
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect('admin: hammasi', (select count(*) from public.profiles), 12);
insert into public.faculties (name) values ('Test fakultet');
select pg_temp.expect('admin: yoza oladi', (select count(*) from public.faculties), 2);
rollback;

-- Anonim foydalanuvchi hech narsa ko'rmaydi
begin;
set local role anon;
select pg_temp.expect('anon: profillar yopiq', (select count(*) from public.profiles), 0);
rollback;
