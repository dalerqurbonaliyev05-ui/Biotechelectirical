# SmartEdu — interaktiv ta'lim tizimi

Kafedra uchun bepul serverlarda ishlaydigan tizim. Bitta hisob bilan:

- **Jonli ma'ruza:** o'qituvchi auditoriyada elektron doskada PDF slaydlarni ko'rsatadi; talabalar telefondan **QR yoki 6 xonali kod**
  bilan qo'shiladi, slaydga biriktirilgan savollarga javob beradi; ball (100 + tezlik bonusi), reyting va medallar real vaqtda.
- **Amaliyot va nazorat:** test, raqamli (har talabaga boshqa qiymat), yozma (rubrika) va laboratoriya savollari; avtosaqlash,
  server taymeri, shaffof natijalar, ball o'zgarishlari jurnali.
- **Boshqa saytlar bilan bog'lanish:** savollar kitob sahifasiga (`book_ref`) va 3D laboratoriyaga (`lab_task`, imzolangan so'rov).

**Texnologiyalar:** Next.js 15 (App Router, TypeScript strict) · Tailwind CSS 4 · Supabase (PostgreSQL, Auth, Realtime, Storage, RLS) ·
pdf.js · `qrcode` · zod · Vitest. Tashqi pullik xizmat ishlatilmaydi.

> Bu `Biotechelectirical` repozitoriysi ichidagi **alohida** loyiha (`smartedu/` papkasi). Ildizdagi EnergyVibe statik sayti unga
> bog'liq emas va `.vercelignore` orqali saytga joylanmaydi.

## Mundarija

1. [Tezkor boshlash (lokal)](#1-tezkor-boshlash-lokal)
2. [Supabase sozlash](#2-supabase-sozlash)
3. [Muhit o'zgaruvchilari](#3-muhit-ozgaruvchilari)
4. [Joylash: Vercel](#4-joylash-vercel-tavsiya) va [Cloudflare](#5-joylash-cloudflare)
5. [Keep-alive (bepul tarifda to'xtab qolmaslik)](#6-keep-alive)
6. [Zaxira va tiklash](#7-zaxira-va-tiklash)
7. [Cheklovlar (bepul tarif)](#8-cheklovlar-bepul-tarif)
8. [Sinovlar](#9-sinovlar) · [Qo'lda tekshirish ro'yxati](#10-qolda-tekshirish-royxati-supabase-ulangach)
9. [Hujjatlar](#11-hujjatlar)

## 1. Tezkor boshlash (lokal)

Talab: **Node.js 22** (pdf.js 5 uchun; 20.12+ ishlashi mumkin), npm. Lokal Supabase uchun Docker (ixtiyoriy).

```bash
cd smartedu
npm install
cp .env.example .env.local     # qiymatlarni to'ldiring (3-bo'lim)
npm run dev                    # http://localhost:3000
```

Barcha tekshiruvlar bir buyruqda (lint, tur, birlik sinovlari, SQL/RLS, embed tekshiruvi, build, smoke):

```bash
npm run verify
```

`.env.local` va kalitlar **hech qachon** gitga tushmaydi (`.gitignore`). `SUPABASE_SERVICE_ROLE_KEY` ga `NEXT_PUBLIC_` qo'shmang.

## 2. Supabase sozlash

### A) Bulutdagi (bepul) loyiha — productionga mos

1. [supabase.com](https://supabase.com) da loyiha yarating. **Project Settings → API** dan `URL`, `anon`/publishable va `service_role` kalitlarini oling.
2. **Authentication → Providers → Email:** "Enable sign ups" ni **o'chiring** (akkauntlarni faqat admin yaratadi), "Confirm email" ni o'chiring
   (talabalar sintetik email bilan kiradi). **URL Configuration → Site URL** = sayt manzili.
3. Migratsiyalarni qo'llang (ikki yo'l):
   - **CLI:** `npx supabase login` → `npx supabase link --project-ref <ref>` → `npx supabase db push`
   - **Qo'lda:** SQL Editor'da `supabase/migrations/0001…0007_*.sql` fayllarini **tartib bilan** ishga tushiring.
4. **Storage** bucket (`lectures`, shaxsiy, 50 MB, faqat PDF) va **Realtime** migratsiya/standart bilan tayyor — qo'shimcha amal shart emas.
5. Birinchi administratorni yarating (productionda `seed.sql` **ishlatilmaydi**):
   ```bash
   npm run create-admin -- admin@kafedra.uz "Familiya Ism Sharif"
   ```
   Skript vaqtinchalik parolni bir marta chop etadi; birinchi kirishda almashtirish talab qilinadi.
6. Admin panelida: fakultet → kafedra → guruh → fan → o'qituvchi (fan+guruh biriktirib) → talabalar (CSV/Excel). Namuna CSV ustunlari:
   `student_code, full_name, group` (ixtiyoriy `password`).

### B) Lokal Supabase (Docker bilan)

```bash
npx supabase start          # migratsiyalar + seed.sql avtomatik qo'llanadi
npx supabase status         # URL va kalitlarni ko'rsatadi → .env.local
```

`seed.sql`: 1 admin, 1 o'qituvchi, 1 guruh (EE-21), 10 talaba (S001–S010), 1 fan ("Elektr ta'minoti"). **Parollari ochiq yozilgan —
faqat lokal/demo** (fayl boshida ro'yxati bor).

## 3. Muhit o'zgaruvchilari

| O'zgaruvchi                     | Majburiy | Izoh                                                                                                       |
| ------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ha       | Supabase loyiha URL'i (brauzerga chiqadi)                                                                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ha       | anon/publishable kalit (brauzerga chiqadi, RLS himoyasida)                                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | ha       | **Faqat server.** RLS'ni chetlab o'tadi. Hech qachon `NEXT_PUBLIC_` qilmang                                |
| `NEXT_PUBLIC_SITE_URL`          | ha       | Sayt manzili (QR havolalari uchun), masalan `https://smartedu.example.uz`                                  |
| `SYNTHETIC_EMAIL_DOMAIN`        | yo'q     | Talaba kodi → email domeni (standart `students.smartedu.example`). **Talabalar yaratilgach o'zgartirmang** |
| `ATTENDANCE_SECRET`             | ha*      | QR davomat tokeni imzo kaliti (≥16 belgi). Yo'q bo'lsa hamma `masofadan` bo'ladi                           |
| `LAB_SHARED_SECRET`             | ha*      | Laboratoriya bilan HMAC sir (≥16 belgi). Yo'q bo'lsa `/api/lab/submit` 503 qaytaradi                       |
| `LAB_BASE_URL`                  | yo'q     | Laboratoriya sayti (`<LAB_BASE_URL>/<lab_id>` havolasi)                                                    |
| `BOOKS_BASE_URL`                | yo'q     | Kutubxona (`<BOOKS_BASE_URL>/#/kitob/<id>/<bet>`)                                                          |
| `CRON_SECRET`                   | ha*      | Keep-alive himoyasi (≥16 belgi)                                                                            |

\* tegishli funksiya ishlashi uchun. Tasodifiy qiymat: `openssl rand -base64 32`.

## 4. Joylash: Vercel (tavsiya)

1. Repozitoriyni Vercel'ga ulang → **Root Directory = `smartedu`**, Framework = Next.js (avto).
2. **Environment Variables:** 3-bo'limdagi barcha qiymatlar (Production). `NEXT_PUBLIC_SITE_URL` = domen.
3. Deploy. So'ng Supabase → Authentication → **Site URL** ni domenga o'zgartiring.
4. `smartedu/vercel.json` dagi cron (kuniga bir marta) keep-alive'ni chaqiradi (`CRON_SECRET` o'rnatilgan bo'lsa Vercel uni avtomatik yuboradi).
5. Eslatma: Vercel **Hobby** rejasi shartlarini (tijoriy bo'lmagan foydalanish, funksiya vaqti, cron chastotasi) joriy shartlardan tekshiring.

## 5. Joylash: Cloudflare

> **Diqqat: bu yo'l shu muhitda SINALMAGAN.** Cloudflare Pages Next.js'ni to'g'ridan-to'g'ri ishga tushirmaydi; hozirgi tavsiya —
> **Workers + OpenNext adapteri**. Kamida quyidagilar kerak:

```bash
npm i @opennextjs/cloudflare wrangler
```

`wrangler.jsonc`: `"compatibility_flags": ["nodejs_compat"]` (kodda `node:crypto` ishlatiladi), `"main": ".open-next/worker.js"`,
`assets` → `.open-next/assets`. Build: `npx opennextjs-cloudflare build`, deploy: `npx opennextjs-cloudflare deploy`.
Muhit o'zgaruvchilari — Workers → Settings → Variables (3-bo'lim). Cron: Workers Cron Trigger → `/api/cron/keepalive` ga
`Authorization: Bearer <CRON_SECRET>` bilan so'rov (yoki GitHub Actions zaxirasi, 6-bo'lim). Kod `export const runtime` ishlatmaydi,
shuning uchun Node.js ish vaqtiga mos. Birinchi joylashda `npm run verify` natijasini va asosiy oqimlarni (10-bo'lim) qayta tekshiring.

## 6. Keep-alive

Bepul Supabase loyihasi taxminan **1 hafta faolsiz** bo'lsa to'xtatiladi (pause). `GET /api/cron/keepalive` (sarlavha
`Authorization: Bearer <CRON_SECRET>`) bazaga oddiy so'rov yuboradi. Ikki mustaqil yo'l:

- **Vercel Cron:** `smartedu/vercel.json` (kuniga 1 marta).
- **GitHub Actions:** `.github/workflows/smartedu-keepalive.yml` (har 3 kunda). Repository secrets: `SMARTEDU_URL`, `CRON_SECRET`.

Tekshirish: `curl -H "Authorization: Bearer $CRON_SECRET" https://<domen>/api/cron/keepalive` → `{"ok":true,...}`.

## 7. Zaxira va tiklash

- **Admin → Zaxira:** asosiy jadvallar CSV (maxfiy `join_token` chiqmaydi). Semestr oxirida va nazoratlardan keyin oling.
- **To'liq nusxa:** `npx supabase db dump --linked -f zaxira.sql` (sxema + ma'lumot) yoki `pg_dump "<DATABASE_URL>"`. Storage'dagi PDF'lar
  alohida (Supabase panelidan yoki `supabase storage`).
- **Tiklash:** yangi Supabase loyihasida migratsiyalarni qo'llang → `psql "<DATABASE_URL>" -f zaxira.sql` (faqat ma'lumot qismi) →
  PDF'larni qayta yuklang. Auth foydalanuvchilari uchun `auth` sxemasi ham dump'da bo'lishi kerak (`--schema auth`) yoki talabalarni
  CSV'dan qayta yarating (yangi vaqtinchalik parollar bilan).
- Zaxira fayllarida talabalar ma'lumoti bor — xavfsiz saqlang.

## 8. Cheklovlar (bepul tarif)

Aniq raqamlarni **joriy shartlardan o'zingiz tekshiring** (ular o'zgaradi). Loyiha quyidagilarni hisobga olib yozilgan:

| Resurs                                                                        | Ta'siri va nima qilingan                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Supabase Realtime** (bir vaqtdagi ulanishlar, xabar/soniya, oylik xabarlar) | Sessiya uchun **bitta** kanal; xabar ~50 bayt; talabalar xabar kelganda so'raydi; savol yo'q paytda slayd almashishi so'rov yaratmaydi. Katta oqim (yuzlab talaba) bepul chegaradan oshishi mumkin — dars oldidan sinab ko'ring |
| **Supabase DB hajmi**                                                         | Matn ma'lumotlari kichik; eng katta jadval — `answers`, `session_answers`. PDF bazada emas, Storage'da                                                                                                                          |
| **Supabase Storage hajmi / fayl hajmi**                                       | Bucket 50 MB/fayl; PDF'larni siqing. Foydalanilmagan ma'ruzani o'chirsangiz fayl ham o'chadi                                                                                                                                    |
| **Faollik (pause)**                                                           | Keep-alive (6-bo'lim)                                                                                                                                                                                                           |
| **Vercel funksiya vaqti / chaqiruvlar**                                       | Import 20 tadan bo'laklanadi; PDF brauzerdan to'g'ridan-to'g'ri Storage'ga; og'ir hisoblar yo'q                                                                                                                                 |
| **Supabase Auth (MAU, email)**                                                | Parollar bilan, email yuborilmaydi (sintetik email)                                                                                                                                                                             |
| **Bandwidth**                                                                 | PDF imzolangan havola orqali faqat doska kompyuteriga; talabalar PDF yuklamaydi                                                                                                                                                 |

## 9. Sinovlar

```bash
npm test                # Vitest: 180+ sinov (ball, generator, tekshirish, HMAC, QR token, CSV ...)
npm run test:rls        # SQL migratsiya + RLS testlari (haqiqiy PostgreSQL kerak)
npm run check:embeds    # PostgREST embed noaniqligi tekshiruvi (test:rls dan keyin)
npm run smoke           # build qilingan serverda asosiy yo'llar (Supabase'siz)
```

`test:rls` uchun lokal PostgreSQL 15/16: `PGURL=postgresql://postgres:postgres@localhost:5432 npm run test:rls`
(Supabase'ni taqlid qiluvchi stub bilan; CI'da avtomatik). CI: `.github/workflows/smartedu.yml`.

## 10. Qo'lda tekshirish ro'yxati (Supabase ulangach)

Bu muhitda Supabase (PostgREST/GoTrue) ishga tushirib bo'lmadi, shuning uchun API'ni uchidan-uchiga birinchi ulashda shularni bajaring:

1. [ ] Admin kirdi → parol almashtirdi → guruh/fan/o'qituvchi/talabalar (CSV) yaratildi; talaba kod+vaqtinchalik parol bilan kirib, parol almashtirdi.
2. [ ] O'qituvchi 4 turdagi savol yaratdi (+CSV import); raqamli savolda "Boshqa variant" tugmasi ishlaydi.
3. [ ] Nazorat yaratildi → talaba boshladi → **internetni uzib** javob berdi (brauzerda saqlandi) → qaytarib ulandi (yuborildi) → topshirdi.
4. [ ] Yozma javob baholandi → tasdiqlandi → talabaga natija ko'rindi; ball o'zgartirishda sabab so'raladi va talabaga jurnal ko'rinadi.
5. [ ] **Talaba brauzer konsolida** `supabase.from('question_keys').select()` → bo'sh `[]` (to'g'ri javob ko'rinmaydi).
6. [ ] Ma'ruza PDF yuklandi → slaydga savol biriktirildi → dars boshlandi → doska ochildi → telefonda QR skanerlandi → "Auditoriyada" ko'rindi.
7. [ ] Slaydga yetganda savol avtomatik chiqdi → javob → vaqt tugadi → to'g'ri javob + reyting; dars tugagach medallar.
8. [ ] Doskada "Real vaqt: ulangan" ko'rinadi (Realtime ishlayapti).
9. [ ] `node scripts/lab-sign.mjs ...` bilan laboratoriya natijasi yuborildi → talaba oynasida "qabul qilindi".
10. [ ] Keep-alive `curl` → 200. Admin → Zaxira → CSV yuklanadi.

## 11. Hujjatlar

| Fayl                                                 | Mazmuni                                                                                 |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [`docs/launch.md`](docs/launch.md)                   | Ishga tushirish bo'yicha bosqichma-bosqich yo'riqnoma va keyin o'zgartiriladigan joylar |
| [`docs/decisions.md`](docs/decisions.md)             | Har bosqichdagi qarorlar va taxminlar (nima, nima uchun, qanday o'zgartirish)           |
| [`docs/security.md`](docs/security.md)               | Xavfsizlik: nima tekshirilgan, nima yo'q                                                |
| [`docs/lab-integration.md`](docs/lab-integration.md) | Laboratoriya saytini ulash kontrakti (imzo, namunalar)                                  |
| [`docs/attendance.md`](docs/attendance.md)           | QR/davomat va uning chegaralari                                                         |
| [`docs/roadmap.md`](docs/roadmap.md)                 | Kelajak: video, AI, HEMIS, ko'p universitet                                             |

## Papka tuzilmasi

```
src/app/            sahifalar va API (App Router): /admin /teacher /student /board /live /rating /api
src/components/     umumiy komponentlar (CRUD, PDF, QR, doska savoli ...)
src/lib/            mantiq: assessment/ (generator, tekshirish), live-score.ts, semester.ts, lab.ts, i18n/uz.ts (BARCHA matnlar)
src/lib/server/     faqat server kodi (service role, DB funksiyalari)
supabase/           migrations/ (0001–0007), seed.sql, tests/ (SQL), config.toml
scripts/            test-rls.sh, smoke.sh, create-admin.mjs, lab-sign.mjs, check-embeds.py
tests/              Vitest sinovlari
```
