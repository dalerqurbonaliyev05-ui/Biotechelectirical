-- =====================================================================
-- 2-bosqich: faollashtirish kodlari uchun yordamchi funksiya.
-- 0001_schema.sql dan KEYIN ishga tushiriladi.
--
-- Noto'g'ri kod urinishlarini ATOMAR hisoblaydi (parallel so'rovlar bilan
-- aylanib o'tib bo'lmasin). Faqat service_role (Edge Function) chaqira oladi:
-- talaba/xodim/anon brauzeridan chaqirib bo'lmaydi.
-- =====================================================================

create function public.bump_code_attempt(p_student uuid) returns smallint
language sql security definer set search_path = '' as $$
    update public.activation_codes
       set attempts = least(attempts + 1, 100)
     where student_id = p_student and used_at is null
 returning attempts
$$;

revoke all on function public.bump_code_attempt(uuid) from public, anon, authenticated;
grant execute on function public.bump_code_attempt(uuid) to service_role;
