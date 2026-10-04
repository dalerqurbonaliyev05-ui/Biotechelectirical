-- Kuryer joylashuvi maxfiyligi: xaridor kuryerni FAQAT o'z buyurtmasini kuryer olib, yo'lga chiqqan
-- paytda (picked_up / on_the_way) ko'radi. Yetkazilgach yoki oldin ko'rinmaydi.
-- (Avval uy_is_counterparty() har qanday o'tgan buyurtma bo'yicha kuryerning joriy joylashuvini ochib qo'ygan.)
-- Kuryer ismi/telefoni (uy_profiles) esa avvalgidek hamkorlarga ko'rinadi.
create function public.uy_can_track_courier(p_courier uuid) returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (
        select 1
        from public.courier_assignments ca
        join public.orders o on o.id = ca.order_id
        where ca.courier_id = p_courier
          and o.buyer_id = auth.uid()
          and o.status = 'handed_to_courier'
          and ca.delivery_status in ('picked_up', 'on_the_way')
    )
$$;
revoke all on function public.uy_can_track_courier(uuid) from public, anon;
grant execute on function public.uy_can_track_courier(uuid) to authenticated;

drop policy couriers_select on public.couriers;
create policy couriers_select on public.couriers for select to authenticated
    using (id = auth.uid() or public.uy_is_admin() or public.uy_can_track_courier(id));
