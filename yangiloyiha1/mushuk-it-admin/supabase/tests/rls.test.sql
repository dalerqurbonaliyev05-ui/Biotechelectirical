-- RLS sinovi: `psql -v ON_ERROR_STOP=1 -f stub.sql -f ../schema.sql -f rls.test.sql` (bo'sh bazada).
\set ON_ERROR_STOP on
create or replace function pg_temp.expect_fail(q text, label text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then return; end;
  raise exception 'KUTILGAN XATO YO''Q: %', label;
end $$;
create or replace function pg_temp.expect_rows(q text, n int, label text) returns void language plpgsql as $$
declare c int;
begin
  execute 'select count(*) from (' || q || ') t' into c;
  if c <> n then raise exception '% : kutilgan %, keldi %', label, n, c; end if;
end $$;
create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', uid::text, false); end $$;

-- Foydalanuvchilar (trigger profil yaratishi kerak)
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', 'ali@x.uz',   '{"full_name":"Ali","provider_id":"g-ali","avatar_url":"https://lh3.googleusercontent.com/a"}'),
 ('00000000-0000-0000-0000-00000000000b', 'vali@x.uz',  '{"name":"Vali","sub":"g-vali"}'),
 ('00000000-0000-0000-0000-00000000000c', 'admin@x.uz', '{"full_name":"Admin"}'),
 ('00000000-0000-0000-0000-00000000000d', 'bad@x.uz',   '{}');
insert into public.admins values ('00000000-0000-0000-0000-00000000000c');
do $$ begin
  assert (select count(*) from public.profiles) = 4, 'trigger profil yaratmadi';
  assert (select google_id from public.profiles where full_name = 'Vali') = 'g-vali', 'google_id (sub)';
  assert (select google_id from public.profiles where full_name = 'Ali') = 'g-ali', 'google_id (provider_id)';
end $$;

grant execute on all functions in schema pg_temp to public;
set role authenticated;

-- Ali: o'zi uchun post
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.posts (id, user_id, animal_type, image_url, latitude, longitude, address)
 values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'cat',
         'https://p.supabase.co/storage/v1/object/public/animal-photos/00000000-0000-0000-0000-00000000000a/1.jpg', 41.3, 69.2, 'Toshkent');
select pg_temp.expect_fail($q$insert into public.posts (user_id, animal_type, image_url, latitude, longitude) values ('00000000-0000-0000-0000-00000000000b','dog','https://p.supabase.co/storage/v1/object/public/animal-photos/00000000-0000-0000-0000-00000000000b/x.jpg',1,1)$q$, 'boshqa nomidan post');
select pg_temp.expect_fail($q$insert into public.posts (user_id, animal_type, image_url, latitude, longitude) values ('00000000-0000-0000-0000-00000000000a','dog','https://evil.example/x.jpg',1,1)$q$, 'tashqi rasm havolasi');
select pg_temp.expect_fail($q$insert into public.posts (user_id, animal_type, image_url, latitude, longitude) values ('00000000-0000-0000-0000-00000000000a','bird','https://p.supabase.co/storage/v1/object/public/animal-photos/00000000-0000-0000-0000-00000000000a/x.jpg',1,1)$q$, 'noto''g''ri hayvon turi');
select pg_temp.expect_fail($q$insert into public.posts (user_id, animal_type, image_url, latitude, longitude, status) values ('00000000-0000-0000-0000-00000000000a','dog','https://p.supabase.co/storage/v1/object/public/animal-photos/00000000-0000-0000-0000-00000000000a/x.jpg',1,1,'blocked')$q$, 'status ustuniga yozish');
select pg_temp.expect_fail($q$update public.profiles set blocked = false where user_id = '00000000-0000-0000-0000-00000000000a'$q$, 'o''zini blokdan chiqarish');
select pg_temp.expect_fail($q$update public.profiles set google_id = 'x' where user_id = '00000000-0000-0000-0000-00000000000a'$q$, 'google_id o''zgartirish');
select pg_temp.expect_fail($q$insert into public.admins values ('00000000-0000-0000-0000-00000000000a')$q$, 'o''zini admin qilish');
select pg_temp.expect_fail($q$select * from public.admins$q$, 'admins o''qish');
select pg_temp.expect_fail($q$select public.admin_stats()$q$, 'admin_stats oddiy userga');
update public.profiles set full_name = 'Ali Valiyev', city = 'Toshkent', onboarded = true where user_id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect_rows($q$select 1 from public.profiles$q$, 1, 'faqat o''z profilini ko''radi');
select pg_temp.expect_rows($q$select 1 from public.public_profiles$q$, 4, 'public_profiles hamma uchun');

-- Vali: o'qiydi, layk/izoh qo'yadi, boshqaning postini o'chira olmaydi
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_rows($q$select 1 from public.posts$q$, 1, 'postlar hamma uchun ochiq');
insert into public.likes (post_id, user_id) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_fail($q$insert into public.likes (post_id, user_id) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b')$q$, 'ikki marta layk');
select pg_temp.expect_fail($q$insert into public.likes (post_id, user_id) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a')$q$, 'boshqa nomidan layk');
insert into public.comments (post_id, user_id, text) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Qanday chiroyli!');
insert into public.comments (post_id, user_id, text) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Spam spam');
select pg_temp.expect_fail($q$insert into public.comments (post_id, user_id, text) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', '   ')$q$, 'bo''sh izoh');
delete from public.posts where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.expect_rows($q$select 1 from public.posts$q$, 1, 'boshqaning postini o''chira olmaydi');
update public.posts set status = 'blocked' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.expect_rows($q$select 1 from public.posts where status = 'active'$q$, 1, 'user post statusini o''zgartira olmaydi');
select pg_temp.expect_fail($q$select public.admin_list_users()$q$, 'admin_list_users oddiy userga');
select pg_temp.expect_fail($q$select public.admin_delete_user('00000000-0000-0000-0000-00000000000a')$q$, 'admin_delete_user oddiy userga');

-- Ali Valining izohini o'chira olmaydi, lekin o'zining postiga yozilgan izohni ham (egasi emas) — izoh egasi o'chiradi
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
delete from public.comments where text = 'Spam spam';
select pg_temp.expect_rows($q$select 1 from public.comments$q$, 2, 'post egasi boshqaning izohini o''chira olmaydi');

-- Admin
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_rows($q$select 1 from public.profiles$q$, 4, 'admin hamma profilni ko''radi');
update public.posts set status = 'blocked', blocked_reason = 'spam' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.expect_rows($q$select 1 from public.posts where status = 'blocked'$q$, 1, 'admin postni bloklaydi');
update public.posts set status = 'active', blocked_reason = null where id = '10000000-0000-0000-0000-000000000001';
delete from public.comments where text = 'Spam spam';
select pg_temp.expect_rows($q$select 1 from public.comments$q$, 1, 'admin izohni o''chiradi');
delete from public.likes;
select pg_temp.expect_rows($q$select 1 from public.likes$q$, 0, 'admin laykni o''chiradi');
do $$ declare s jsonb; u int; begin
  s := public.admin_stats();
  assert (s->>'total_posts')::int = 1 and (s->>'total_users')::int = 4 and (s->>'new_posts_today')::int = 1, 'stats: ' || s::text;
  assert (s->>'active_users_7d')::int = 2, 'faol foydalanuvchilar (Ali post, Vali izoh): ' || s::text;
  assert jsonb_array_length(s->'daily') = 14 and (s->'daily'->13->>'posts')::int = 1, 'daily: ' || s::text;
  select count(*) into u from public.admin_list_users();
  assert u = 4, 'admin_list_users';
end $$;
select pg_temp.expect_fail($q$select public.admin_set_user_blocked('00000000-0000-0000-0000-00000000000c', true)$q$, 'o''zini bloklash');
select public.admin_set_user_blocked('00000000-0000-0000-0000-00000000000d', true);

-- Bloklangan foydalanuvchi
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect_fail($q$insert into public.posts (user_id, animal_type, image_url, latitude, longitude) values ('00000000-0000-0000-0000-00000000000d','dog','https://p.supabase.co/storage/v1/object/public/animal-photos/00000000-0000-0000-0000-00000000000d/x.jpg',1,1)$q$, 'bloklangan post qo''ymaydi');
select pg_temp.expect_fail($q$insert into public.likes (post_id, user_id) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d')$q$, 'bloklangan layk qo''ymaydi');
select pg_temp.expect_rows($q$select 1 from public.posts$q$, 0, 'bloklangan postlarni ko''rmaydi');
select pg_temp.expect_rows($q$select 1 from public.profiles$q$, 1, 'bloklangan o''z profilini ko''radi (blocked belgisini bilish uchun)');
select pg_temp.expect_rows($q$select 1 from storage.objects$q$, 0, 'storage bo''sh');
select pg_temp.expect_fail($q$insert into storage.objects (bucket_id, name) values ('animal-photos', '00000000-0000-0000-0000-00000000000d/a.jpg')$q$, 'bloklangan rasm yuklamaydi');

-- Storage: Ali o'z papkasiga yuklaydi, Valining papkasiga yuklay olmaydi
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into storage.objects (bucket_id, name) values ('animal-photos', '00000000-0000-0000-0000-00000000000a/1.jpg');
select pg_temp.expect_fail($q$insert into storage.objects (bucket_id, name) values ('animal-photos', '00000000-0000-0000-0000-00000000000b/1.jpg')$q$, 'boshqa papkaga yuklash');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
delete from storage.objects where bucket_id = 'animal-photos';
select pg_temp.expect_rows($q$select 1 from storage.objects$q$, 1, 'boshqaning faylini o''chira olmaydi');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
delete from storage.objects where bucket_id = 'animal-photos';
select pg_temp.expect_rows($q$select 1 from storage.objects$q$, 0, 'admin faylni o''chiradi');

-- Admin foydalanuvchini o'chiradi: hamma narsa cascade
select public.admin_delete_user('00000000-0000-0000-0000-00000000000a');
reset role;
do $$ begin
  assert (select count(*) from public.posts) = 0 and (select count(*) from public.profiles) = 3, 'cascade o''chirish';
end $$;
\echo 'HAMMA RLS SINOVLARI O''TDI'
