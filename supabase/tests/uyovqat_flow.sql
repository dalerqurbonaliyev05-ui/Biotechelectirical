-- Oqim sinovi (lokal Postgres + uyovqat_stub.sql): ro'yxatdan o'tish -> buyurtma -> kuryer -> yetkazish -> daromad/bonus -> RLS.
\set ON_ERROR_STOP on
\set s '''aaaaaaaa-0000-0000-0000-000000000001'''
\set s2 '''aaaaaaaa-0000-0000-0000-000000000002'''
\set b '''bbbbbbbb-0000-0000-0000-000000000001'''
\set b2 '''bbbbbbbb-0000-0000-0000-000000000002'''
\set c1 '''cccccccc-0000-0000-0000-000000000001'''
\set c2 '''cccccccc-0000-0000-0000-000000000002'''
\set adm '''dddddddd-0000-0000-0000-000000000001'''

insert into auth.users (id, email, raw_user_meta_data) values
 (:s,  's@t',  '{"app":"uyovqat","role":"seller","full_name":"Malika","shop_name":"Malika oshxonasi"}'),
 (:s2, 's2@t', '{"app":"uyovqat","role":"seller","full_name":"Boshqa"}'),
 (:b,  'b@t',  '{"app":"uyovqat","role":"buyer","full_name":"Ali"}'),
 (:b2, 'b2@t', '{"app":"uyovqat","role":"buyer","full_name":"Vali"}'),
 (:c1, 'c1@t', '{"app":"uyovqat","role":"courier","full_name":"Kuryer1"}'),
 (:c2, 'c2@t', '{"app":"uyovqat","role":"courier","full_name":"Kuryer2"}'),
 (:adm,'a@t',  '{"app":"uyovqat","role":"admin","full_name":"Hacker"}'),
 ('eeeeeeee-0000-0000-0000-000000000001', 'other@t', '{}');
update public.uy_profiles set role='admin' where id=:adm;       -- admin faqat qo'lda
update public.uy_profiles set lat=41.30, lng=69.24 where id=:s;
update public.uy_profiles set lat=41.30, lng=69.24 where id=:s2;

do $$ begin
  assert (select count(*) from uy_profiles) = 7, 'boshqa ilova foydalanuvchisiga profil yaratilmasligi kerak';
  assert (select role from uy_profiles where id='aaaaaaaa-0000-0000-0000-000000000001') = 'seller';
  assert (select count(*) from couriers) = 2;
end $$;

-- sotuvchi taom qo'shadi
set role authenticated; select set_config('request.jwt.claim.sub', :s, false);
insert into food_items (seller_id, category_id, name, price_per_portion, prep_minutes)
  select :s, id, 'Mastava', 25000, 90 from categories where slug='mastava';
insert into food_items (seller_id, category_id, name, price_per_portion, prep_minutes)
  select :s, id, 'Manti', 30000, 60 from categories where slug='manti';
-- boshqa sotuvchi nomidan qo'sha olmaydi
do $$ begin
  begin
    insert into food_items (seller_id, category_id, name, price_per_portion) select 'aaaaaaaa-0000-0000-0000-000000000002', id, 'Qalbaki', 1000 from categories limit 1;
    raise exception 'RLS ishlamadi';
  exception when insufficient_privilege then null; when others then if sqlerrm like 'new row violates%' then null; else raise; end if;
  end;
end $$;

-- kuryerlar: c1 (yaqin), c2 (uzoq)
select set_config('request.jwt.claim.sub', :c1, false);
update couriers set lat=41.31, lng=69.25, availability='free' where id=:c1;
select set_config('request.jwt.claim.sub', :c2, false);
update couriers set lat=41.60, lng=69.60, availability='free' where id=:c2;

-- xaridor buyurtma beradi
select set_config('request.jwt.claim.sub', :b, false);
select code, discount_amount from (select 1) x, lateral (select null::text as code, null::numeric as discount_amount) y where false;
reset role;
insert into promo_codes (code, discount_percent, usage_limit) values ('TEST10', 10, 1);
set role authenticated; select set_config('request.jwt.claim.sub', :b, false);

\echo -- promokod korish
select * from uy_preview_promo('test10', 100000);
\echo -- vaqt juda erta bolsa rad etiladi
do $$ declare r uuid; begin
  begin
    perform uy_place_order('aaaaaaaa-0000-0000-0000-000000000001',
      (select jsonb_agg(jsonb_build_object('food_id', id, 'portions', 10)) from food_items where name='Mastava'),
      now() + interval '10 minutes', 'cash', null, 'Chilonzor 5', 41.27, 69.20, null);
    raise exception 'erta vaqt qabul qilindi';
  exception when others then if sqlerrm like 'Tayyor bo''lish%' then null; else raise; end if; end;
end $$;

create temp table t_order as
select uy_place_order('aaaaaaaa-0000-0000-0000-000000000001',
  (select jsonb_agg(jsonb_build_object('food_id', id, 'portions', 10)) from food_items where name='Mastava'),
  now() + interval '3 hours', 'card', 'test10', 'Chilonzor 5', 41.27, 69.20, 'qo''ng''iroq qiling') as id;
grant all on t_order to public;
do $$ declare o orders; begin
  select * into o from orders where id=(select id from t_order);
  assert o.subtotal = 250000 and o.discount_amount = 25000 and o.delivery_fee = 8000 and o.total = 233000, 'summa: '||o.total;
  assert o.people_count = 10 and o.status='new';
end $$;

\echo -- promo limiti (1) tugadi: ikkinchi xaridor ishlata olmaydi
select set_config('request.jwt.claim.sub', :b2, false);
select * from uy_preview_promo('TEST10', 100000);

\echo -- RLS: boshqa xaridor/sotuvchi/kuryer buyurtmani kormaydi
select (select count(*) from orders) as b2_sees; 
select set_config('request.jwt.claim.sub', :s2, false);
select (select count(*) from orders) as s2_sees;
select set_config('request.jwt.claim.sub', :c1, false);
select (select count(*) from orders) as c1_sees_before_assign;

\echo -- sotuvchi qabul qiladi -> eng yaqin kuryer (c1) avtomatik biriktiriladi
select set_config('request.jwt.claim.sub', :s, false);
select uy_seller_set_status((select id from t_order), 'accepted');
select set_config('request.jwt.claim.sub', :c1, false);
do $$ begin
  assert (select count(*) from orders) = 1, 'c1 ko''rishi kerak';
  assert (select courier_id from courier_assignments) = 'cccccccc-0000-0000-0000-000000000001';
  assert (select availability from couriers where id='cccccccc-0000-0000-0000-000000000001') = 'busy';
end $$;
select set_config('request.jwt.claim.sub', :c2, false);
select (select count(*) from orders) as c2_sees, (select count(*) from courier_assignments) as c2_assign;

\echo -- kuryer sotuvchi tayyorlamasdan olib keta olmaydi; band paytida bosh bola olmaydi
select set_config('request.jwt.claim.sub', :c1, false);
do $$ begin
  begin perform uy_courier_set_delivery((select id from t_order), 'picked_up'); raise exception 'kutilgan xato yo''q';
  exception when others then if sqlerrm like 'Taom hali%' then null; else raise; end if; end;
  begin update couriers set availability='free' where id='cccccccc-0000-0000-0000-000000000001'; raise exception 'bo''sh bo''ldi';
  exception when others then if sqlerrm like 'Faol buyurtma%' then null; else raise; end if; end;
end $$;

select set_config('request.jwt.claim.sub', :s, false);
select uy_seller_set_status((select id from t_order), 'preparing');
select set_config('request.jwt.claim.sub', :c1, false);
select uy_courier_set_delivery((select id from t_order), 'picked_up');
select uy_courier_set_delivery((select id from t_order), 'on_the_way');
select status from orders;
select uy_courier_set_delivery((select id from t_order), 'delivered');

reset role;
do $$ begin
  assert (select status from orders) = 'delivered' and (select paid from orders);
  assert (select net from seller_earnings) = 225000, 'net (gross 250000 - 10%): '|| (select net from seller_earnings);
  assert (select availability from couriers where id='cccccccc-0000-0000-0000-000000000001') = 'free';
  assert (select count(*) from order_status_log) = 5, 'tarix: '|| (select count(*) from order_status_log);
end $$;

\echo -- sharhlar
set role authenticated; select set_config('request.jwt.claim.sub', :b, false);
insert into reviews (order_id, reviewer_id, target_kind, rating, comment)
 select id, :b, 'seller', 5, 'Zo''r' from orders;
insert into reviews (order_id, reviewer_id, target_kind, rating) select id, :b, 'courier', 4 from orders;
do $$ begin
  assert (select rating_avg from uy_profiles where id='aaaaaaaa-0000-0000-0000-000000000001') = 5;
  assert (select rating_avg from uy_profiles where id='cccccccc-0000-0000-0000-000000000001') = 4;
  begin insert into reviews (order_id, reviewer_id, target_kind, rating) select id, 'bbbbbbbb-0000-0000-0000-000000000002','seller',1 from orders; raise exception 'boshqa xaridor sharh yozdi';
  exception when unique_violation then null; end;
end $$;
-- xaridor holatni to'g'ridan-to'g'ri o'zgartira olmaydi
do $$ begin
  begin update orders set status='delivered', total=0; raise exception 'UPDATE ruxsat etilgan';
  exception when insufficient_privilege then null; end;
  begin update uy_profiles set role='admin' where id=auth.uid(); raise exception 'rol o''zgardi';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from promo_codes) = 0, 'xaridor promokodlar jadvalini ko''rdi';
end $$;
-- admin
select set_config('request.jwt.claim.sub', :adm, false);
do $$ declare j jsonb; begin
  j := uy_admin_stats();
  assert (j->>'total_orders')::int = 1 and (j->>'delivered_orders')::int = 1, j::text;
  assert jsonb_array_length(j->'daily') = 14;
  assert (select count(*) from uy_admin_seller_stats()) = 2;
  assert (select count(*) from promo_codes) = 1;
end $$;
-- admin bo'lmagan statistikani ola olmaydi
select set_config('request.jwt.claim.sub', :b, false);
do $$ begin begin perform uy_admin_stats(); raise exception 'xaridor statistika oldi'; exception when others then if sqlerrm like 'Ruxsat%' then null; else raise; end if; end; end $$;

\echo -- bonus: 50-buyurtmada bonus beriladi
reset role;
insert into orders (id, buyer_id, seller_id, status, people_count, ready_at, payment_method, subtotal, total, delivery_address)
select gen_random_uuid(), :b, :s, 'handed_to_courier', 1, now(), 'cash', 100000, 100000, 'x' from generate_series(1, 49);
update orders set status='delivered' where status='handed_to_courier';
do $$ begin
  assert (select count(*) from seller_earnings) = 50;
  assert (select count(*) from seller_bonuses) = 1, 'bonus soni';
  raise notice 'bonus = %', (select amount from seller_bonuses);
end $$;
\echo OK: barcha tekshiruvlar otdi
