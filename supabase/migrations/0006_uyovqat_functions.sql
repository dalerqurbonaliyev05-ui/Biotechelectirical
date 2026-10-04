-- =====================================================================
-- "Uy ovqatlari bozori": yordamchi funksiyalar, triggerlar va RPC'lar.
-- Mijoz buyurtma holatini to'g'ridan-to'g'ri o'zgartira olmaydi: faqat
-- quyidagi SECURITY DEFINER funksiyalar orqali (qoidalar shu yerda).
-- =====================================================================

-- ---------- Rol yordamchilari (RLS uchun) -------------------------------
create function public.uy_role() returns public.uy_role
language sql stable security definer set search_path = '' as $$
    select role from public.uy_profiles where id = auth.uid() and is_active
$$;

create function public.uy_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
    select coalesce(public.uy_role() = 'admin', false)
$$;

-- Sozlama qiymati (jsonb -> numeric)
create function public.uy_setting_num(p_key text, p_default numeric) returns numeric
language sql stable security definer set search_path = '' as $$
    select coalesce((select (value #>> '{}')::numeric from public.uy_settings where key = p_key), p_default)
$$;

-- Haversine masofasi, km
create function public.uy_haversine_km(lat1 double precision, lng1 double precision,
                                       lat2 double precision, lng2 double precision)
returns double precision language sql immutable parallel safe as $$
    select 6371.0 * 2 * asin(least(1.0, sqrt(
        power(sin(radians(lat2 - lat1) / 2), 2) +
        cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
    )))
$$;

-- Joriy foydalanuvchi shu profilning "hamkori"mi (o'z buyurtmasi bo'yicha xaridor/sotuvchi/kuryer)?
create function public.uy_is_counterparty(p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from public.orders o
        left join public.courier_assignments ca on ca.order_id = o.id
        where (o.buyer_id = auth.uid() or o.seller_id = auth.uid() or ca.courier_id = auth.uid())
          and p_profile in (o.buyer_id, o.seller_id, ca.courier_id)
    )
$$;

-- ---------- Yangi foydalanuvchi: profil yaratish -----------------------
-- Faqat ro'yxatdan o'tishda user_metadata.app = 'uyovqat' bo'lsa ishlaydi
-- (loyihadagi boshqa ilova foydalanuvchilariga tegmaydi). 'admin' roli bu yerdan berilmaydi.
create function public.uy_handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_role public.uy_role;
begin
    if coalesce(new.raw_user_meta_data ->> 'app', '') <> 'uyovqat' then return new; end if;
    v_role := case new.raw_user_meta_data ->> 'role'
        when 'seller'  then 'seller'::public.uy_role
        when 'courier' then 'courier'::public.uy_role
        else 'buyer'::public.uy_role end;
    insert into public.uy_profiles (id, role, full_name, phone, shop_name)
    values (new.id, v_role,
            left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
            left(new.raw_user_meta_data ->> 'phone', 32),
            left(new.raw_user_meta_data ->> 'shop_name', 120));
    if v_role = 'courier' then
        insert into public.couriers (id) values (new.id);
    end if;
    return new;
end $$;
create trigger uy_on_auth_user_created after insert on auth.users
    for each row execute function public.uy_handle_new_user();

-- updated_at
create function public.uy_touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger food_items_touch before update on public.food_items
    for each row execute function public.uy_touch_updated_at();
create trigger orders_touch before update on public.orders
    for each row execute function public.uy_touch_updated_at();

-- ---------- Eng yaqin bo'sh kuryerni biriktirish -----------------------
-- Sotuvchi joylashuviga (pickup) eng yaqin 'free' kuryerni Haversine bo'yicha topadi.
-- Bo'sh kuryer yo'q bo'lsa NULL: kuryer bo'shaganda uy_assign_pending() qayta urinadi.
create function public.uy_assign_courier(p_order uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
    o record; v_courier uuid; v_dist double precision;
    v_radius numeric := public.uy_setting_num('max_assign_radius_km', 30);
begin
    select * into o from public.orders where id = p_order for update;
    if not found or o.status not in ('accepted', 'preparing', 'handed_to_courier') then return null; end if;
    if o.pickup_lat is null or o.pickup_lng is null then return null; end if;
    if exists (select 1 from public.courier_assignments where order_id = p_order) then return null; end if;

    select c.id, public.uy_haversine_km(c.lat, c.lng, o.pickup_lat, o.pickup_lng)
      into v_courier, v_dist
    from public.couriers c
    join public.uy_profiles p on p.id = c.id and p.is_active
    where c.availability = 'free' and c.lat is not null and c.lng is not null
      and public.uy_haversine_km(c.lat, c.lng, o.pickup_lat, o.pickup_lng) <= v_radius
    order by public.uy_haversine_km(c.lat, c.lng, o.pickup_lat, o.pickup_lng)
    limit 1
    for update of c skip locked;

    if v_courier is null then return null; end if;

    insert into public.courier_assignments (order_id, courier_id, distance_km)
    values (p_order, v_courier, round(v_dist::numeric, 2));
    update public.couriers set availability = 'busy' where id = v_courier;
    return v_courier;
end $$;

-- Kuryersiz qolgan buyurtmalarni eskisidan boshlab biriktiradi.
create function public.uy_assign_pending() returns integer
language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0;
begin
    for r in
        select o.id from public.orders o
        where o.status in ('accepted', 'preparing', 'handed_to_courier')
          and not exists (select 1 from public.courier_assignments ca where ca.order_id = o.id)
        order by o.created_at
    loop
        if public.uy_assign_courier(r.id) is not null then n := n + 1; end if;
    end loop;
    return n;
end $$;

revoke all on function public.uy_assign_courier(uuid), public.uy_assign_pending() from public, anon, authenticated;

-- Kuryer bo'sh bo'lganda yoki joylashuvi o'zgarganda kutayotgan buyurtmalarga urinish.
create function public.uy_couriers_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    if new.lat is distinct from old.lat or new.lng is distinct from old.lng then
        new.location_updated_at := now();
    end if;
    -- Yetkazilmagan buyurtmasi bor kuryer o'zini "bo'sh" qila olmaydi.
    if new.availability = 'free' and old.availability = 'busy' and auth.uid() is not null
       and exists (select 1 from public.courier_assignments
                   where courier_id = new.id and delivery_status <> 'delivered') then
        raise exception 'Faol buyurtma yetkazilmaguncha "bo''sh" holatiga o''tib bo''lmaydi';
    end if;
    return new;
end $$;
create trigger couriers_guard before update on public.couriers
    for each row execute function public.uy_couriers_guard();

create function public.uy_couriers_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    if new.availability = 'free'
       and (old.availability <> 'free' or old.lat is null or new.lat is distinct from old.lat) then
        perform public.uy_assign_pending();
    end if;
    return null;
end $$;
create trigger couriers_after after update on public.couriers
    for each row execute function public.uy_couriers_after();

-- ---------- Buyurtma holati: tarix, kuryer, daromad, bonus -------------
create function public.uy_orders_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    insert into public.order_status_log (order_id, status) values (new.id, new.status);
    return null;
end $$;
create trigger orders_after_insert after insert on public.orders
    for each row execute function public.uy_orders_after_insert();

create function public.uy_orders_after_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
    v_pct numeric; v_gross numeric; v_comm numeric; v_cnt integer; v_base numeric; v_amount numeric; r record;
begin
    insert into public.order_status_log (order_id, status) values (new.id, new.status);

    -- Rad etilsa/bekor qilinsa promokod limiti qaytariladi.
    if new.status in ('rejected', 'cancelled') and new.promo_id is not null then
        update public.promo_codes set used_count = greatest(used_count - 1, 0) where id = new.promo_id;
    end if;

    -- Sotuvchi qabul qildi: eng yaqin bo'sh kuryerga avtomatik biriktiriladi.
    if new.status = 'accepted' then
        perform public.uy_assign_courier(new.id);
    end if;

    -- Yetkazildi: daromad yoziladi va bonus qoidalari tekshiriladi.
    if new.status = 'delivered' then
        v_pct   := public.uy_setting_num('commission_pct', 10);
        v_gross := new.subtotal;                       -- promokod chegirmasini platforma ko'taradi
        v_comm  := round(v_gross * v_pct / 100, 2);
        insert into public.seller_earnings (seller_id, order_id, gross, commission, net)
        values (new.seller_id, new.id, v_gross, v_comm, v_gross - v_comm)
        on conflict (order_id) do nothing;

        select count(*) into v_cnt from public.seller_earnings where seller_id = new.seller_id;
        for r in select * from public.bonus_rules where is_active loop
            if v_cnt >= r.every_n_orders and v_cnt % r.every_n_orders = 0 then
                if r.bonus_type = 'percent' then
                    select coalesce(sum(net), 0) into v_base from (
                        select net from public.seller_earnings where seller_id = new.seller_id
                        order by created_at desc, id desc limit r.every_n_orders) last_n;
                    v_amount := round(v_base * r.bonus_value / 100, 2);
                else
                    v_amount := r.bonus_value;
                end if;
                insert into public.seller_bonuses (seller_id, rule_id, milestone, amount)
                values (new.seller_id, r.id, v_cnt, v_amount)
                on conflict (seller_id, rule_id, milestone) do nothing;
            end if;
        end loop;
    end if;
    return null;
end $$;
create trigger orders_after_status after update of status on public.orders
    for each row when (old.status is distinct from new.status)
    execute function public.uy_orders_after_status();

-- ---------- Promokod hisoblash -----------------------------------------
-- Xaridor jadvalni o'qiy olmaydi: faqat shu funksiya orqali tekshiradi.
create function public.uy_promo_discount(p_code text, p_subtotal numeric)
returns table (promo_id uuid, discount numeric, error text)
language plpgsql stable security definer set search_path = '' as $$
declare p public.promo_codes;
begin
    select * into p from public.promo_codes where code = upper(trim(coalesce(p_code, '')));
    if not found or not p.is_active then
        return query select null::uuid, 0::numeric, 'Promokod topilmadi'::text; return;
    end if;
    if p.valid_from > now() or (p.valid_until is not null and p.valid_until < now()) then
        return query select null::uuid, 0::numeric, 'Promokod muddati tugagan'::text; return;
    end if;
    if p.usage_limit is not null and p.used_count >= p.usage_limit then
        return query select null::uuid, 0::numeric, 'Promokod limiti tugagan'::text; return;
    end if;
    if p_subtotal < p.min_order_total then
        return query select null::uuid, 0::numeric,
            ('Minimal buyurtma summasi: ' || p.min_order_total::bigint || ' so''m')::text; return;
    end if;
    return query select p.id,
        case when p.discount_percent is not null
             then round(p_subtotal * p.discount_percent / 100, 2)
             else least(p.discount_amount, p_subtotal) end,
        null::text;
end $$;

-- Xaridor uchun: savat summasiga promokod chegirmasini ko'rish (ishlatmaydi).
create function public.uy_preview_promo(p_code text, p_subtotal numeric)
returns table (valid boolean, discount numeric, message text)
language plpgsql stable security definer set search_path = '' as $$
declare r record;
begin
    if public.uy_role() is null then raise exception 'Kirish talab qilinadi'; end if;
    select * into r from public.uy_promo_discount(p_code, p_subtotal);
    return query select r.error is null, coalesce(r.discount, 0), coalesce(r.error, 'Promokod qo''llandi');
end $$;

-- ---------- Buyurtma berish --------------------------------------------
-- p_items: [{"food_id": "<uuid>", "portions": 10}, ...]; bitta sotuvchidan.
create function public.uy_place_order(
    p_seller uuid, p_items jsonb, p_ready_at timestamptz, p_pay public.uy_pay_method,
    p_promo text default null, p_address text default null,
    p_lat double precision default null, p_lng double precision default null,
    p_note text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
    v_uid uuid := auth.uid(); v_order uuid; v_item jsonb; f public.food_items;
    v_portions integer; v_subtotal numeric := 0; v_max_prep integer := 0; v_max_people integer := 0;
    v_fee numeric; v_promo record; v_promo_id uuid; v_discount numeric := 0; v_code text;
    s public.uy_profiles;
begin
    if public.uy_role() is distinct from 'buyer' then raise exception 'Faqat xaridor buyurtma bera oladi'; end if;
    select * into s from public.uy_profiles where id = p_seller and role = 'seller' and is_active;
    if not found then raise exception 'Sotuvchi topilmadi'; end if;
    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'Savat bo''sh';
    end if;
    if p_address is null or length(trim(p_address)) < 3 then raise exception 'Yetkazish manzilini kiriting'; end if;

    -- Birinchi o'tish: tekshirish va summani hisoblash.
    for v_item in select * from jsonb_array_elements(p_items) loop
        v_portions := (v_item ->> 'portions')::integer;
        select * into f from public.food_items where id = (v_item ->> 'food_id')::uuid;
        if not found or f.seller_id <> p_seller or not f.is_available then
            raise exception 'Taom mavjud emas yoki boshqa sotuvchiga tegishli';
        end if;
        if v_portions is null or v_portions < f.min_portions or v_portions > 500 then
            raise exception '"%" uchun kishilar soni noto''g''ri (kamida %)', f.name, f.min_portions;
        end if;
        v_subtotal := v_subtotal + f.price_per_portion * v_portions;
        v_max_prep := greatest(v_max_prep, f.prep_minutes);
        v_max_people := greatest(v_max_people, v_portions);
    end loop;

    if p_ready_at is null or p_ready_at < now() + make_interval(mins => v_max_prep) - interval '1 minute' then
        raise exception 'Tayyor bo''lish vaqti kamida % daqiqadan keyin bo''lishi kerak', v_max_prep;
    end if;
    if p_ready_at > now() + interval '30 days' then raise exception 'Tayyor bo''lish vaqti juda uzoq'; end if;

    -- Promokod
    if p_promo is not null and length(trim(p_promo)) > 0 then
        select * into v_promo from public.uy_promo_discount(p_promo, v_subtotal);
        if v_promo.error is not null then raise exception '%', v_promo.error; end if;
        v_promo_id := v_promo.promo_id; v_discount := v_promo.discount;
        -- Limitni atomar ishlatish (poyga holatidan himoya)
        update public.promo_codes set used_count = used_count + 1
        where id = v_promo_id and (usage_limit is null or used_count < usage_limit)
        returning code into v_code;
        if not found then raise exception 'Promokod limiti tugagan'; end if;
    end if;

    v_fee := public.uy_setting_num('delivery_fee', 0);

    insert into public.orders (buyer_id, seller_id, people_count, ready_at, payment_method,
        promo_id, promo_code, subtotal, discount_amount, delivery_fee, total,
        delivery_address, delivery_lat, delivery_lng,
        pickup_lat, pickup_lng, note)
    values (v_uid, p_seller, v_max_people, p_ready_at, p_pay,
        v_promo_id, v_code, v_subtotal, v_discount, v_fee, v_subtotal - v_discount + v_fee,
        trim(p_address), p_lat, p_lng,
        coalesce(s.lat, p_lat), coalesce(s.lng, p_lng), left(p_note, 500))
    returning id into v_order;

    for v_item in select * from jsonb_array_elements(p_items) loop
        select * into f from public.food_items where id = (v_item ->> 'food_id')::uuid;
        v_portions := (v_item ->> 'portions')::integer;
        insert into public.order_items (order_id, food_id, name, unit_price, portions, line_total)
        values (v_order, f.id, f.name, f.price_per_portion, v_portions, f.price_per_portion * v_portions);
    end loop;
    return v_order;
end $$;

-- ---------- Holat o'zgartirish RPC'lari --------------------------------
create function public.uy_cancel_order(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
    update public.orders set status = 'cancelled'
    where id = p_order and buyer_id = auth.uid() and status = 'new';
    if not found then raise exception 'Buyurtmani faqat sotuvchi qabul qilguncha bekor qilish mumkin'; end if;
end $$;

create function public.uy_seller_set_status(p_order uuid, p_status public.uy_order_status) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
    select * into o from public.orders where id = p_order and seller_id = auth.uid() for update;
    if not found then raise exception 'Buyurtma topilmadi'; end if;
    if not ((o.status = 'new'       and p_status in ('accepted', 'rejected'))
         or (o.status = 'accepted'  and p_status = 'preparing')
         or (o.status = 'preparing' and p_status = 'handed_to_courier')) then
        raise exception 'Bu holatga o''tib bo''lmaydi (% -> %)', o.status, p_status;
    end if;
    update public.orders set status = p_status where id = p_order;
end $$;

create function public.uy_courier_set_delivery(p_order uuid, p_status public.uy_delivery_status) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.courier_assignments; o public.orders;
begin
    select * into a from public.courier_assignments
    where order_id = p_order and courier_id = auth.uid() for update;
    if not found then raise exception 'Buyurtma sizga biriktirilmagan'; end if;
    select * into o from public.orders where id = p_order for update;

    if not ((a.delivery_status = 'assigned'   and p_status = 'picked_up')
         or (a.delivery_status = 'picked_up'  and p_status = 'on_the_way')
         or (a.delivery_status = 'on_the_way' and p_status = 'delivered')) then
        raise exception 'Bu holatga o''tib bo''lmaydi (% -> %)', a.delivery_status, p_status;
    end if;
    if p_status = 'picked_up' and o.status not in ('preparing', 'handed_to_courier') then
        raise exception 'Taom hali tayyorlanmagan: sotuvchi "tayyorlanmoqda" holatiga o''tkazishi kerak';
    end if;

    update public.courier_assignments set delivery_status = p_status,
        picked_up_at = case when p_status = 'picked_up' then now() else picked_up_at end,
        delivered_at = case when p_status = 'delivered' then now() else delivered_at end
    where id = a.id;

    if p_status = 'picked_up' and o.status = 'preparing' then
        update public.orders set status = 'handed_to_courier' where id = p_order;
    elsif p_status = 'delivered' then
        update public.orders set status = 'delivered', paid = true where id = p_order;
        -- Kuryer avtomatik "bo'sh" bo'ladi (kutayotgan buyurtma bo'lsa, trigger biriktiradi).
        update public.couriers set availability = 'free' where id = auth.uid();
    end if;
end $$;

-- ---------- Sharhlar ---------------------------------------------------
create function public.uy_reviews_before() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o public.orders; v_courier uuid;
begin
    select * into o from public.orders where id = new.order_id;
    if not found or o.buyer_id <> auth.uid() or o.status <> 'delivered' then
        raise exception 'Sharh faqat o''z yetkazilgan buyurtmangizga qoldiriladi';
    end if;
    new.reviewer_id := o.buyer_id;
    if new.target_kind = 'seller' then
        new.target_id := o.seller_id;
    else
        select courier_id into v_courier from public.courier_assignments where order_id = o.id;
        if v_courier is null then raise exception 'Bu buyurtmada kuryer yo''q'; end if;
        new.target_id := v_courier;
    end if;
    return new;
end $$;
create trigger reviews_before before insert on public.reviews
    for each row execute function public.uy_reviews_before();

create function public.uy_reviews_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    update public.uy_profiles p set
        rating_avg   = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where target_id = new.target_id), 0),
        rating_count = (select count(*) from public.reviews where target_id = new.target_id)
    where p.id = new.target_id;
    return null;
end $$;
create trigger reviews_after after insert on public.reviews
    for each row execute function public.uy_reviews_after();

-- ---------- Admin statistikasi -----------------------------------------
create function public.uy_admin_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_today date := (now() at time zone 'Asia/Tashkent')::date; r jsonb;
begin
    if not public.uy_is_admin() then raise exception 'Ruxsat yo''q'; end if;
    select jsonb_build_object(
        'today_orders',  (select count(*) from public.orders where (created_at at time zone 'Asia/Tashkent')::date = v_today),
        'today_revenue', (select coalesce(sum(total), 0) from public.orders
                          where (created_at at time zone 'Asia/Tashkent')::date = v_today and status not in ('rejected', 'cancelled')),
        'total_orders',  (select count(*) from public.orders),
        'delivered_orders', (select count(*) from public.orders where status = 'delivered'),
        'active_orders', (select count(*) from public.orders where status in ('new', 'accepted', 'preparing', 'handed_to_courier')),
        'total_revenue', (select coalesce(sum(total), 0) from public.orders where status = 'delivered'),
        'sellers',       (select count(*) from public.uy_profiles where role = 'seller'),
        'couriers',      (select count(*) from public.couriers),
        'free_couriers', (select count(*) from public.couriers where availability = 'free'),
        'buyers',        (select count(*) from public.uy_profiles where role = 'buyer'),
        'daily', coalesce((
            select jsonb_agg(jsonb_build_object('day', d.day, 'orders', coalesce(x.cnt, 0), 'revenue', coalesce(x.rev, 0)) order by d.day)
            from generate_series(v_today - 13, v_today, interval '1 day') as d(day)
            left join (
                select (created_at at time zone 'Asia/Tashkent')::date as day, count(*) as cnt,
                       sum(total) filter (where status not in ('rejected', 'cancelled')) as rev
                from public.orders group by 1) x on x.day = d.day::date
        ), '[]'::jsonb)
    ) into r;
    return r;
end $$;

create function public.uy_admin_seller_stats()
returns table (seller_id uuid, shop_name text, full_name text, phone text, rating_avg numeric,
               delivered_orders bigint, gross_total numeric, net_total numeric, bonus_total numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
    if not public.uy_is_admin() then raise exception 'Ruxsat yo''q'; end if;
    return query
    select p.id, p.shop_name, p.full_name, p.phone, p.rating_avg,
           (select count(*) from public.seller_earnings e where e.seller_id = p.id),
           (select coalesce(sum(e.gross), 0) from public.seller_earnings e where e.seller_id = p.id),
           (select coalesce(sum(e.net), 0) from public.seller_earnings e where e.seller_id = p.id),
           (select coalesce(sum(b.amount), 0) from public.seller_bonuses b where b.seller_id = p.id)
    from public.uy_profiles p where p.role = 'seller' order by p.created_at;
end $$;

-- ---------- Huquqlar ---------------------------------------------------
revoke all on function
    public.uy_role(), public.uy_is_admin(), public.uy_setting_num(text, numeric), public.uy_is_counterparty(uuid),
    public.uy_promo_discount(text, numeric), public.uy_preview_promo(text, numeric),
    public.uy_place_order(uuid, jsonb, timestamptz, public.uy_pay_method, text, text, double precision, double precision, text),
    public.uy_cancel_order(uuid), public.uy_seller_set_status(uuid, public.uy_order_status),
    public.uy_courier_set_delivery(uuid, public.uy_delivery_status),
    public.uy_admin_stats(), public.uy_admin_seller_stats()
from public, anon;
-- uy_promo_discount faqat ichki (uy_place_order / uy_preview_promo chaqiradi): mijozga yopiq.
revoke all on function public.uy_promo_discount(text, numeric) from authenticated;
revoke all on function public.uy_setting_num(text, numeric) from authenticated;
grant execute on function
    public.uy_role(), public.uy_is_admin(), public.uy_is_counterparty(uuid),
    public.uy_preview_promo(text, numeric),
    public.uy_place_order(uuid, jsonb, timestamptz, public.uy_pay_method, text, text, double precision, double precision, text),
    public.uy_cancel_order(uuid), public.uy_seller_set_status(uuid, public.uy_order_status),
    public.uy_courier_set_delivery(uuid, public.uy_delivery_status),
    public.uy_admin_stats(), public.uy_admin_seller_stats()
to authenticated;
