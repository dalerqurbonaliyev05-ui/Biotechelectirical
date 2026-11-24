# Qarorlar jurnali (taxminlar va sabablari)

Har yozuv: **nima** → **nima uchun** → **qanday o'zgartirish mumkin**.

## 0-bosqich

1. **Loyiha joyi: `smartedu/` papkasi, shu repo ichida.**
   Topshiriq "bo'sh papka" deydi, lekin bu repo EnergyVibe statik sayti. Ildizga Next.js qo'yish saytni
   buzardi. Papka `.vercelignore` ga qo'shildi (repo odatiga mos, `*-src` papkalari kabi).
   O'zgartirish: papkani yangi repoga ko'chirish mumkin, hech narsa ildizga bog'liq emas.
2. **Next.js 15 (16 emas).** 16 da `middleware.ts` → `proxy.ts` ga o'zgargan va ekotizim hali yangi;
   15.5 barqaror va hujjatlari to'liq. Keyin ko'tarish oson.
3. **ESLint 9 / TypeScript 5 / Vitest 3.** Eng yangi major'lar (ESLint 10, TS 7) `eslint-config-next@15`
   bilan mos kelmasligi mumkin, shuning uchun mos versiyalar qotirildi.
4. **Supabase turlari qo'lda (generatsiya qilinmagan).** Bu muhitda Docker/Supabase CLI yo'q, shuning
   uchun `supabase gen types` ishlatilmadi; mijoz turlanmagan, qator turlari `src/lib/types.ts` da.
   Keyin: `supabase gen types typescript --linked > src/lib/database.types.ts` va mijozga ulash.
5. **Shriftlar tizimniki.** `next/font/google` build vaqtida tarmoq so'raydi — bepul/offline muhit uchun
   ishonchsiz. Keyin o'zgartirish mumkin.

## 1-bosqich: hisob va guruhlar

1. **Talaba kirishi: `kod + parol` → sintetik email** (`s001@<SYNTHETIC_EMAIL_DOMAIN>`). Supabase Auth email
   talab qiladi. Xaritalash serverda (`/api/auth/login`), shuning uchun domen brauzerga chiqmaydi va kirishga
   tezlik cheklovi qo'yish oson. Kod katta-kichik harfga bog'liq emas (unikal indeks `lower(student_code)`).
   O'zgartirish: domenni `.env` da; boshqa kirish usuli (SMS/OTP) uchun faqat `login` route'i o'zgaradi.
2. **Rol manbai: DB (`profiles.role`), JWT emas.** `app_metadata.role` faqat middleware'da qo'pol
   yo'naltirish uchun; layout/API/RLS har doim DB'dagi rolga qaraydi. Rol o'zgarsa (yoki hisob o'chirilsa)
   keyingi so'rovdayoq kuchga kiradi.
3. **Talaba hech narsa YOZMAYDI (RLS'da yozish siyosati yo'q).** Barcha talaba yozuvlari (javob, qo'shilish,
   ball) serverdagi API orqali, service role bilan, foydalanuvchi va holat tekshirilgandan keyin.
   Sabab: to'g'ri javob, vaqt va ball mijozga ishonmaslik talabi; RLS'ni oddiy va tekshiriladigan qiladi.
4. **Import: server tomonda parse, mijoz 20 tadan bo'lib yuboradi.** Vercel bepul funksiya vaqti ~10 s;
   akkaunt yaratish sekin. Tasodifiy 10 belgili vaqtinchalik parol faqat javobda bir marta qaytadi
   (DB'da saqlanmaydi), `must_change_password=true`. Takror kod → `exists` (mavjud akkauntga tegilmaydi).
5. **`groups.department_id` bo'sh bo'lishi mumkin** — import guruhni avtomatik yaratganda kafedra noma'lum.
6. **Seed'dagi parollar ochiq** (`seed.sql`) — faqat lokal/demo. Production'da seed ishlatilmaydi.
7. **Tezlik cheklovi xotirada** (`src/lib/rate-limit.ts`). Serverless'da instansiyalar alohida, shuning uchun
   bu "yaxshi harakat" himoyasi. Kirish uchun Supabase Auth'ning o'z cheklovlari ham ishlaydi.
   Qat'iy kerak bo'lsa: Postgres'da hisoblagich jadvali (RPC) — pullik xizmatsiz.
8. **zod 4: `z.guid()`** ishlatiladi (`z.uuid()` qat'iy RFC versiya tekshiradi; seed UUID'lari oddiy).
