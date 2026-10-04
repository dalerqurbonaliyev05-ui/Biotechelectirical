-- =====================================================================
-- "Uy ovqatlari bozori": Row Level Security, huquqlar, Storage, Realtime.
-- Xaridor faqat o'z buyurtmalarini; sotuvchi faqat o'z taomlari/buyurtmalarini;
-- kuryer faqat o'ziga biriktirilgan buyurtmalarni ko'radi. Yozish deyarli
-- hammasi 0006 dagi RPC'lar orqali (to'g'ridan-to'g'ri INSERT/UPDATE yopiq).
-- =====================================================================

-- Kirmagan (anon) foydalanuvchiga hech narsa; barcha jadvallarda RLS yoqiladi.
revoke all on
    public.uy_profiles, public.categories, public.food_items, public.promo_codes, public.orders,
    public.order_items, public.order_status_log, public.couriers, public.courier_assignments,
    public.reviews, public.uy_settings, public.seller_earnings, public.bonus_rules, public.seller_bonuses
from anon;
revoke all on
    public.uy_profiles, public.categories, public.food_items, public.promo_codes, public.orders,
    public.order_items, public.order_status_log, public.couriers, public.courier_assignments,
    public.reviews, public.uy_settings, public.seller_earnings, public.bonus_rules, public.seller_bonuses
from authenticated;

alter table public.uy_profiles        enable row level security;
alter table public.categories         enable row level security;
alter table public.food_items         enable row level security;
alter table public.promo_codes        enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.order_status_log   enable row level security;
alter table public.couriers           enable row level security;
alter table public.courier_assignments enable row level security;
alter table public.reviews            enable row level security;
alter table public.uy_settings        enable row level security;
alter table public.seller_earnings    enable row level security;
alter table public.bonus_rules        enable row level security;
alter table public.seller_bonuses     enable row level security;

-- ---------- uy_profiles ------------------------------------------------
grant select on public.uy_profiles to authenticated;
grant update (full_name, phone, address, lat, lng, shop_name, avatar_url) on public.uy_profiles to authenticated;
create policy uy_profiles_select on public.uy_profiles for select to authenticated
    using (id = auth.uid() or public.uy_is_admin() or public.uy_is_counterparty(id));
create policy uy_profiles_update_own on public.uy_profiles for update to authenticated
    using (id = auth.uid()) with check (id = auth.uid());

-- Ommaviy sotuvchi ko'rinishi: xaridor taom kartasida sotuvchi nomi/reytingini ko'radi (telefon/manzilsiz).
create view public.uy_sellers with (security_invoker = false) as
    select id, coalesce(nullif(shop_name, ''), full_name) as display_name, rating_avg, rating_count
    from public.uy_profiles where role = 'seller' and is_active;
revoke all on public.uy_sellers from anon;
grant select on public.uy_sellers to authenticated;

-- ---------- categories -------------------------------------------------
grant select, insert, update, delete on public.categories to authenticated;
create policy categories_select on public.categories for select to authenticated
    using (is_active or public.uy_is_admin());
create policy categories_admin_write on public.categories for all to authenticated
    using (public.uy_is_admin()) with check (public.uy_is_admin());

-- ---------- food_items -------------------------------------------------
grant select, insert, update, delete on public.food_items to authenticated;
create policy food_items_select on public.food_items for select to authenticated
    using (is_available or seller_id = auth.uid() or public.uy_is_admin());
create policy food_items_insert on public.food_items for insert to authenticated
    with check (seller_id = auth.uid() and public.uy_role() = 'seller');
create policy food_items_update on public.food_items for update to authenticated
    using (seller_id = auth.uid() and public.uy_role() = 'seller')
    with check (seller_id = auth.uid());
create policy food_items_delete on public.food_items for delete to authenticated
    using ((seller_id = auth.uid() and public.uy_role() = 'seller') or public.uy_is_admin());

-- ---------- promo_codes (faqat admin; xaridor uy_preview_promo orqali) --
grant select, insert, update, delete on public.promo_codes to authenticated;
create policy promo_admin_all on public.promo_codes for all to authenticated
    using (public.uy_is_admin()) with check (public.uy_is_admin());

-- ---------- orders, order_items, order_status_log (faqat o'qish) -------
grant select on public.orders, public.order_items, public.order_status_log to authenticated;
-- orders <-> courier_assignments o'zaro RLS rekursiyasini oldini olish uchun SECURITY DEFINER yordamchilar.
create function public.uy_is_assigned_courier(p_order uuid) returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.courier_assignments where order_id = p_order and courier_id = auth.uid())
$$;
create function public.uy_can_see_order(p_order uuid) returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from public.orders o
        where o.id = p_order and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    ) or public.uy_is_admin() or public.uy_is_assigned_courier(p_order)
$$;
revoke all on function public.uy_is_assigned_courier(uuid), public.uy_can_see_order(uuid) from public, anon;
grant execute on function public.uy_is_assigned_courier(uuid), public.uy_can_see_order(uuid) to authenticated;

create policy orders_select on public.orders for select to authenticated
    using (buyer_id = auth.uid() or seller_id = auth.uid() or public.uy_is_admin()
           or public.uy_is_assigned_courier(id));
create policy order_items_select on public.order_items for select to authenticated
    using (public.uy_can_see_order(order_id));
create policy order_status_log_select on public.order_status_log for select to authenticated
    using (public.uy_can_see_order(order_id));

-- ---------- couriers ---------------------------------------------------
grant select on public.couriers to authenticated;
grant update (availability, lat, lng, vehicle) on public.couriers to authenticated;
create policy couriers_select on public.couriers for select to authenticated
    using (id = auth.uid() or public.uy_is_admin() or public.uy_is_counterparty(id));
create policy couriers_update_own on public.couriers for update to authenticated
    using (id = auth.uid() and public.uy_role() = 'courier')
    with check (id = auth.uid());

-- ---------- courier_assignments (faqat o'qish) -------------------------
grant select on public.courier_assignments to authenticated;
create policy courier_assignments_select on public.courier_assignments for select to authenticated
    using (courier_id = auth.uid() or public.uy_can_see_order(order_id));

-- ---------- reviews ----------------------------------------------------
grant select, insert on public.reviews to authenticated;
grant delete on public.reviews to authenticated;                    -- faqat admin siyosati
create policy reviews_select on public.reviews for select to authenticated using (true);
create policy reviews_insert on public.reviews for insert to authenticated
    with check (reviewer_id = auth.uid() and public.uy_role() = 'buyer');
create policy reviews_admin_delete on public.reviews for delete to authenticated
    using (public.uy_is_admin());

-- ---------- uy_settings, bonus_rules -----------------------------------
grant select, insert, update on public.uy_settings to authenticated;
create policy uy_settings_select on public.uy_settings for select to authenticated using (true);
create policy uy_settings_admin_write on public.uy_settings for all to authenticated
    using (public.uy_is_admin()) with check (public.uy_is_admin());

grant select, insert, update, delete on public.bonus_rules to authenticated;
create policy bonus_rules_select on public.bonus_rules for select to authenticated using (true);
create policy bonus_rules_admin_write on public.bonus_rules for all to authenticated
    using (public.uy_is_admin()) with check (public.uy_is_admin());

-- ---------- seller_earnings, seller_bonuses (faqat o'qish) -------------
grant select on public.seller_earnings, public.seller_bonuses to authenticated;
create policy seller_earnings_select on public.seller_earnings for select to authenticated
    using (seller_id = auth.uid() or public.uy_is_admin());
create policy seller_bonuses_select on public.seller_bonuses for select to authenticated
    using (seller_id = auth.uid() or public.uy_is_admin());

-- ---------- Storage: taom rasmlari -------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('food-images', 'food-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public,
    file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- O'qish ommaviy URL orqali (bucket public). Yozish: sotuvchi faqat o'z papkasiga "<uid>/...".
create policy food_images_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'food-images' and public.uy_role() = 'seller'
                and (storage.foldername(name))[1] = auth.uid()::text);
create policy food_images_update on storage.objects for update to authenticated
    using (bucket_id = 'food-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy food_images_delete on storage.objects for delete to authenticated
    using (bucket_id = 'food-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.uy_is_admin()));

-- ---------- Realtime ---------------------------------------------------
-- postgres_changes RLS'ni hisobga oladi: har kim faqat o'z qatorlarini oladi.
do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        alter publication supabase_realtime add table public.orders, public.courier_assignments, public.couriers;
    end if;
end $$;
