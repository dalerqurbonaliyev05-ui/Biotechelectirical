-- Supabase advisor topilmalari bo'yicha mahkamlash (0005-0007 dan keyin).
-- Trigger funksiyalarini hech kim RPC sifatida chaqira olmasin (triggerlar uchun EXECUTE kerak emas).
revoke all on function
    public.uy_couriers_after(), public.uy_couriers_guard(), public.uy_handle_new_user(),
    public.uy_orders_after_insert(), public.uy_orders_after_status(),
    public.uy_reviews_after(), public.uy_reviews_before(), public.uy_touch_updated_at()
from public, anon, authenticated;

-- Sof hisob funksiyasi: search_path qat'iy.
alter function public.uy_haversine_km(double precision, double precision, double precision, double precision) set search_path = '';

-- Eslatma: public.uy_sellers ko'rinishi ataylab SECURITY DEFINER (security_invoker = false):
-- xaridorlarga faqat sotuvchi nomi va reytingini ko'rsatadi (telefon/manzil/joylashuvsiz).
