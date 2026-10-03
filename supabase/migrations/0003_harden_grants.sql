-- =====================================================================
-- Xavfsizlikni mahkamlash: kirmagan (anon) foydalanuvchiga hech qanday huquq yo'q.
-- Supabase yangi jadval/funksiyalarga anon/authenticated huquqini o'zi beradi
-- (0001 dagi "revoke ... from public" bunga ta'sir qilmaydi). 0001 dan keyin
-- ishga tushirilgan; Supabase'ga 2026-10-03 da qo'llangan.
-- =====================================================================

-- Barcha kirish Supabase Auth orqali, keyin 'authenticated' rolida bo'ladi.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- activation_codes: faqat server (service_role). Brauzer rollari umuman tegmaydi.
revoke all on public.activation_codes from authenticated;

-- Kelajakda yaratiladigan jadval/funksiyalar uchun ham anon'ga avtomatik huquq berilmasin.
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
