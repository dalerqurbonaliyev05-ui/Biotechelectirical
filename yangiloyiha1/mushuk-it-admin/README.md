# Mushuk va It Top: administrator paneli

Statik sahifalar (Vercel'da `/yangiloyiha1/mushuk-it-admin/` manzilida) + Supabase. Dizayn, qobiq (yon menyu, yuqori panel, modal, toast) va CSS
`../css/app.css` (Amaliyot admin paneli) asosida; inline skript yo'q: qat'iy CSP (`<meta>` va `vercel.json`).
Mobil ilova: alohida repo `mushuk-it-top-app` (React + Vite + TypeScript + Capacitor).

Maket: to'q yon menyu (logo, bo'limlar, jami nishonlari, qizil «Xabarlar» nishoni), rangli ko'rsatkich kartalari, yashil urg'u.

| Bo'lim | Nima qiladi |
|---|---|
| Bosh sahifa | rangli kartalar (jami e'lonlar, foydalanuvchilar, layklar, izohlar), bugungi yangi e'lonlar, faol foydalanuvchilar (7/30 kun), 14 kunlik diagramma, hayvon turlari, so'nggi faollik |
| E'lonlar | rasm, sarlavha, joy (manzil, koordinata, Google Maps), sana, muallif; filtr/qidiruv; **bloklash** (sabab bilan, foydalanuvchilarga ko'rinmaydi), qayta ochish, **o'chirish** (rasm va kichik rasm bilan); e'lon ichidan izoh/laykni o'chirish |
| Foydalanuvchilar | Google orqali kirganlar, faolligi; **bloklash** (e'lon/layk/izoh yozolmaydi, tokenlari bekor), **o'chirish** (rasmlari, e'lonlari, layk va izohlari bilan) |
| Izohlar | eng yangi izohlar, qidiruv, o'chirish |
| Layklar | eng yangi layklar, bittadan yoki foydalanuvchi bo'yicha hammasini olib tashlash (bot layklari) |
| Xarita | barcha e'lonlar rasmli pinlar bilan (mushuk/it rangida, bloklanganlari kulrang), tur va holat filtri; pinni bosganda e'lon kartasi (bloklash/o'chirish shu yerdan ham) |
| Xabarlar | so'nggi 7 kundagi yangi e'lon, izoh, layk va ro'yxatdan o'tganlar lentasi; ko'rilmagan voqealar sonini yon menyuda qizil nishon ko'rsatadi |
| Statistika | to'rtta kunlik diagramma (e'lon, foydalanuvchi, layk, izoh), eng faol e'lonlar va foydalanuvchilar |
| Sozlamalar | hisob ma'lumoti, ulangan loyiha, adminlar ro'yxati va yangi admin qo'shish SQL'i |

## Sozlash (bir marta)
1. **Alohida Supabase loyihasi** (mavjud "res loyihasi"da `profiles` jadvali boshqa sxema bilan band, unga qo'llamang). Hozirgi loyiha: `mushuk-it-top-app` (`mjtdilcbwbqpibrooamz`).
2. Sxema (`profiles`, `posts`, `likes`, `comments`, `admins`, RLS, `animal-photos` bucket, admin funksiyalari) bu loyihaga qo'llangan, **faqat** [`supabase/admin_block_delete.sql`](supabase/admin_block_delete.sql) ni SQL Editor'da bir marta ishga tushiring (foydalanuvchini bloklash/o'chirish funksiyalari). Yangi loyiha uchun avval [`supabase/schema.sql`](supabase/schema.sql), so'ng shu fayl.
3. Authentication > Providers > Google'ni yoqing (Google Cloud Console'dan OAuth client ID/secret). Authentication > URL Configuration > Redirect URLs'ga qo'shing:
   - admin paneli: `https://<sayt>/yangiloyiha1/mushuk-it-admin/admin_panel.html` (lokal sinov uchun `http://localhost:PORT/admin_panel.html`)
   - mobil ilova: `uz.mushukit.top://auth/callback`
4. `js/config.js` da loyiha URL va publishable kalit allaqachon yozilgan. `service_role` kalitini hech qayerga yozmang.
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
- Panel: `cd tests && npm install && npm test` (haqiqiy Chromium, Supabase so'rovlari tarmoq darajasida taqlid qilinadi; `SHOTS=papka` bilan ekran rasmlari saqlanadi).

## Eslatma
- Xarita uchun Leaflet `vendor/leaflet/` ichida (CSP tashqi skriptga ruxsat bermaydi); xarita plitkalari `tile.openstreetmap.org` dan (CSP `img-src`da ruxsat berilgan, `vercel.json`da ham).
- Sxema fayllari: `supabase/schema.sql`, `supabase/0002_notifications_title.sql` (sarlavha va bildirishnomalar), `supabase/admin_block_delete.sql` (qo'lda).
