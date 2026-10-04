# Mushuk va It Top: administrator paneli

Statik sahifalar (Vercel'da `/yangiloyiha1/mushuk-it-admin/` manzilida) + Supabase. Dizayn, qobiq (yon menyu, yuqori panel, modal, toast) va CSS
`../css/app.css` (Amaliyot admin paneli) bilan bir xil; inline skript yo'q: qat'iy CSP (`<meta>` va `vercel.json`).
Mobil ilova: alohida repo `mushuk-it-top-app` (React + Vite + TypeScript + Capacitor).

| Bo'lim | Nima qiladi |
|---|---|
| Bosh sahifa | jami postlar, bugungi yangi postlar, faol foydalanuvchilar (7/30 kun), jami foydalanuvchi/layk/izoh, 14 kunlik diagramma |
| Postlar | rasm, joy (manzil + koordinata + Google Maps), sana, muallif; filtr/qidiruv; **bloklash** (sabab bilan, foydalanuvchilarga ko'rinmaydi), qayta ochish, **o'chirish** (Storage fayli bilan); post ichidan izoh/laykni o'chirish |
| Foydalanuvchilar | Google orqali kirganlar, faolligi; **bloklash** (post/layk/izoh yozolmaydi, tokenlari bekor), **o'chirish** (rasmlari, postlari, layk va izohlari bilan) |
| Izohlar | eng yangi izohlar, qidiruv, o'chirish |
| Layklar | eng yangi layklar, bittadan yoki foydalanuvchi bo'yicha hammasini olib tashlash (bot layklari) |

## Sozlash (bir marta)
1. **Alohida Supabase loyihasi** oching (mavjud "res loyihasi"da `profiles` jadvali boshqa sxema bilan band, unga qo'llamang).
2. SQL Editor'da [`supabase/schema.sql`](supabase/schema.sql) ni ishga tushiring: jadvallar (`profiles`, `posts`, `likes`, `comments`, `admins`), RLS, `animal-photos` bucket, admin funksiyalari. Qayta ishga tushirish xavfsiz.
3. Authentication > Providers > Google'ni yoqing (Google Cloud Console'dan OAuth client ID/secret). Authentication > URL Configuration > Redirect URLs'ga qo'shing:
   - admin paneli: `https://<sayt>/yangiloyiha1/mushuk-it-admin/admin_panel.html` (lokal sinov uchun `http://localhost:PORT/admin_panel.html`)
   - mobil ilova: `uz.mushukit.top://auth/callback`
4. `js/config.js` ga loyiha URL va publishable (anon) kalitini yozing. `service_role` kalitini hech qayerga yozmang.
5. Admin tayinlash: avval shu Google hisob bilan ilovaga yoki panelga bir marta kiring, so'ng SQL Editor'da
   `insert into public.admins (user_id) select id from auth.users where email = 'sizning@gmail.com';`
   (Email+parol bilan kirish uchun: Authentication > Users > Add user, so'ng shu SQL.)

## Xavfsizlik modeli
- Admin huquqi faqat `admins` jadvali (mijoz o'qiy/yoza olmaydi) orqali; barcha admin RPC'lari (`admin_stats`, `admin_list_users`, `admin_set_user_blocked`, `admin_delete_user`) ichida `is_admin()` tekshiriladi.
- Foydalanuvchi o'zini admin qila olmaydi, bloklanganini olib tashlay olmaydi (ustun darajasidagi `grant`lar). Bloklangan foydalanuvchi RLS tufayli darhol post/layk/izoh/rasm yozolmaydi.
- Post rasmi faqat egasining Storage papkasidagi fayl bo'la oladi (`posts_image_in_bucket` cheklovi), panel esa faqat shunday havolalarni rasm sifatida ko'rsatadi.
- Foydalanuvchi matnlari (izoh, ism, manzil) `esc()` bilan chiqariladi (sinov bor).

## Sinash
- Baza qoidalari (lokal Postgres, Supabase kerak emas): `supabase/tests/run.sh` (postgres foydalanuvchisi bilan).
- Panel: `cd tests && npm install && npm test` (haqiqiy Chromium, Supabase so'rovlari tarmoq darajasida taqlid qilinadi).
