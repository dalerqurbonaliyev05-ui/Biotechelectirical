-- =====================================================================
-- 4-qism: rasm cheklovlari, tasdiq muhri (data_hash), sessiyalarni bekor qilish.
-- =====================================================================

-- Storage: faqat rasm fayllari va hajm cheklovi (SVG ruxsat etilmaydi: ichida skript bo'lishi mumkin).
update storage.buckets
   set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'practice-photos';
update storage.buckets
   set file_size_limit = 2097152, allowed_mime_types = array['image/png', 'image/jpeg']
 where id = 'org-assets';

-- Tasdiqlash paytidagi ma'lumotlar muhri: RES rahbari tasdiqlaganda mijoz davomat
-- (hisobot uchun rasmlar ro'yxati ham) SHA-256 xeshini yozadi. Keyin davomat o'zgarsa,
-- xesh mos kelmaydi va PDF'ga pechat qo'yilmaydi ("qayta tasdiqlash kerak").
alter table public.approvals
    add column data_hash  text,
    add column days_count integer;

-- Parolni tiklash / hisobni o'chirishda barcha sessiyalarni bekor qiladi.
-- Faqat service_role (Edge Function) chaqira oladi.
create function public.revoke_user_sessions(p_user uuid) returns void
language sql security definer set search_path = '' as $$
    update auth.refresh_tokens set revoked = true where user_id = p_user::text and revoked is not true;
$$;
revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;
