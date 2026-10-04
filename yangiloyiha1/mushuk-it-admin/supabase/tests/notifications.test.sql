-- Bildirishnomalar sinovi (run.sh: stub.sql + schema.sql + 0002 dan keyin).
\set ON_ERROR_STOP on
create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', uid::text, false); end $$;
create or replace function pg_temp.n(q text) returns int language plpgsql as $$ declare c int; begin execute 'select count(*) from (' || q || ') t' into c; return c; end $$;
grant execute on all functions in schema pg_temp to public;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'a@x.uz'), ('00000000-0000-0000-0000-0000000000b1', 'b@x.uz');
insert into public.posts (id, user_id, animal_type, title, image_url, latitude, longitude)
 values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'cat', 'Chiroyli mushuk',
         'https://p.supabase.co/storage/v1/object/public/animal-photos/00000000-0000-0000-0000-0000000000a1/1.jpg', 41.3, 69.2);
set role authenticated;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
insert into public.likes (post_id, user_id) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1');
delete from public.likes where user_id = '00000000-0000-0000-0000-0000000000b1';
insert into public.likes (post_id, user_id) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1');
insert into public.comments (post_id, user_id, text) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'Qanday chiroyli!');
do $$ begin assert pg_temp.n('select 1 from public.notifications') = 0, 'actor boshqaning bildirishnomasini ko''rmaydi'; end $$;
do $$ begin
  begin insert into public.notifications (user_id, actor_id, type, post_id) values ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b1','like','20000000-0000-0000-0000-000000000001'); raise exception 'KUTILGAN XATO YO''Q'; exception when insufficient_privilege then null; end;
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  assert pg_temp.n('select 1 from public.notifications') = 2, 'egasi 2 ta bildirishnoma olishi kerak (1 layk + 1 izoh): ' || pg_temp.n('select 1 from public.notifications');
  assert pg_temp.n($q$select 1 from public.notifications where type = 'comment' and body = 'Qanday chiroyli!'$q$) = 1, 'izoh matni';
end $$;
-- o'ziga layk/izoh: bildirishnoma yo'q
insert into public.likes (post_id, user_id) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1');
do $$ begin assert pg_temp.n('select 1 from public.notifications') = 2, 'o''ziga bildirishnoma kelmasligi kerak'; end $$;
update public.notifications set read = true;
do $$ begin assert pg_temp.n('select 1 from public.notifications where not read') = 0, 'o''qilgan deb belgilash'; end $$;
do $$ begin
  begin update public.notifications set body = 'x'; raise exception 'KUTILGAN XATO YO''Q'; exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo 'BILDIRISHNOMA SINOVLARI O''TDI'
