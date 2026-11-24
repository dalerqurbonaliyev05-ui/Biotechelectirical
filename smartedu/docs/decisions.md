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

## 2-bosqich: uch panel

1. **Oddiy ma'lumotnomalar (fakultet, kafedra, guruh, fan, auditoriya) brauzerdan, RLS ostida.**
   Bitta `CrudManager` + `lib/admin/resources.ts` konfiguratsiyasi — yangi jadval qo'shish 10 qator.
   Himoya UI'da emas, RLS'da: faqat admin yoza oladi (SQL testda tekshirilgan).
2. **Akkauntlar (o'qituvchi/talaba) faqat server API orqali** (auth foydalanuvchisi yaratish service role
   talab qiladi). Faolsizlantirish `profiles.is_active=false` + Auth `ban_duration` — kirish ham, mavjud
   sessiya yangilanishi ham to'xtaydi.
3. **Talaba kodini keyin o'zgartirib bo'lmaydi** (sintetik email unga bog'liq). Xato bo'lsa: talabani
   o'chirib qayta yarating (yoki faolsizlantiring). Kerak bo'lsa keyin qo'shiladi.
4. **Foydalanuvchini o'chirish natijalarini ham o'chiradi** (cascade) — UI ogohlantiradi, odatda
   "Faolsizlantirish" tavsiya etiladi.
5. **`profiles.email`** faqat o'qituvchi/admin uchun saqlanadi (admin ko'rsin deb); talabada bo'sh.
6. **Sozlamalar (`app_settings`)**: admin UI'da tahrirlanadi, serverda `clampSettings` bilan xavfsiz
   oraliqqa keltiriladi (noto'g'ri qiymat tizimni buzmasin). `MAX_SPEED_BONUS` boshlang'ich qiymati 10.

## 3-bosqich: savollar banki va nazorat dvigateli

1. **To'g'ri javob alohida jadvalda (`question_keys`).** `questions` ga talabaga hech qanday siyosat yo'q,
   `question_keys` ga ham. Talabaga savol faqat `toStudentQuestion()` DTO orqali (kalitsiz) boradi; testlar
   DTO'da `correct/formula/rubric/explanation` yo'qligini tekshiradi. Topshiriqdagi `questions.correct` va
   `questions.explanation` ustunlari shu sababli `question_keys` ga ko'chirildi.
2. **Vaqt manbai: DB soati.** `started_at`, `deadline_at`, javob qabul qilish chegarasi — hammasi Postgres `now()`
   bilan (`app_start_attempt`, `app_save_answers`). Taymer mijozda serverdan kelgan "hozir" va muddat
   farqidan hisoblanadi (`performance.now()` bilan), mijoz soati o'zgartirilsa ham ta'sir qilmaydi.
   Muddatdan keyin 5 soniya tarmoq kechikishi (`grace`) qabul qilinadi.
3. **Talaba yozmaydi, o'qimaydi (natija chiqmaguncha).** `answers/attempts` ga talaba SELECT'i faqat
   `student_can_see_results()` ruxsat bergandan keyin; yozish faqat `app_*` funksiyalari (service_role).
   Talaba jarayonda o'z urinishini ham API orqali oladi (kalitsiz va ballsiz).
4. **Natija ko'rinishi:** `show_score` = immediate | after_close | after_finalize (standart: tasdiqlagach);
   to'g'ri javob/izoh: `reveal_answers` = never | after_close | manual. Urinish tugamaguncha hech qachon.
   Qoida ikki joyda (SQL va `lib/assessment/policy.ts`) bir xil va ikkalasi alohida testlangan.
5. **Avto-tasdiqlash:** tekshirilishi kerak javob (short_text, lab_task natijasiz) bo'lmasa urinish darrov
   `finalized` bo'ladi. Aks holda `submitted` va o'qituvchi tasdiqlaguncha talabaga ko'rinmaydi
   ("yakuniy bahoni faqat o'qituvchi tasdiqlaydi").
6. **Ko'p javobli savol — "hammasi yoki hech narsa".** Qisman ball yo'q (taxmin). Keyin `gradeMcq` da o'zgartiriladi.
7. **Parametr generatori:** `seed = talaba_id:nazorat_id`, har savol uchun `:savol_id` qo'shiladi (mulberry32).
   Variant `answers.variant` ga yoziladi → qayta kirsa o'zgarmaydi, savol keyin tahrirlansa ham natija barqaror.
   Formula `eval`siz, o'z parserimiz bilan hisoblanadi (kod bajarishga urinishlar testlangan).
8. **Birliklar:** javobda birlik qo'yilmasa savol birligi deb olinadi; qo'shimcha (mA↔A, kV↔V) avtomatik o'giriladi.
   Tolerantlik — nisbiy (%). Kutilgan qiymat 0 bo'lsa javob ham aniq 0 bo'lishi kerak.
9. **Ishlatilgan savol qulflanadi** (DB trigger): matn/variant/formula/parametr o'zgarmaydi, faqat mavzu,
   qiyinlik, kitob havolasi va izoh. Boshlangan nazoratda savollar to'plami ham o'zgarmaydi (409).
10. **Chiqish signali** (`visibilitychange`) faqat sanaladi (`leave_count`), 2 soniyada bir martadan ko'p emas. Jazo yo'q.
11. **Avtosaqlash:** 700 ms debounce → partiyalab yuborish; xatoda eksponensial qayta urinish; javoblar
    `localStorage` da ham saqlanadi va sahifa qayta ochilganda yuboriladi; `online` hodisasida darrov.
12. **Muddati o'tgan, topshirilmagan urinishlar** lazy topshiriladi: talaba qaytsa yoki o'qituvchi baholash/
    tasdiqlash sahifasini ochsa (`submitExpiredAttempts`). Alohida cron kerak emas.
13. **Savol arxivlash yo'q** (ustun bor, UI yo'q): ishlatilgan savol o'chirilmaydi (FK restrict), "Nusxa" bilan yangi yaratiladi.
14. **Tekshirilmagan narsa:** bu muhitda Supabase (PostgREST/GoTrue) ishga tushirib bo'lmadi (Docker yo'q,
    GitHub yuklab olish yopiq). Shuning uchun SQL (haqiqiy Postgres'da) va toza mantiq sinalgan, API route'lar
    esa tur tekshiruvi + smoke test bilan; Supabase'ga ulangach qo'lda tekshirish ro'yxati README'da.

## 4-bosqich: shaffof natijalar va jurnal

1. **Talaba natijasi RLS orqali o'qiladi** (o'z sessiyasi bilan): `attempts/answers/audit_log` faqat natija e'lon
   qilingandan keyin qaytadi. Savol matni va kalitlar uchun service role faqat `canRevealAnswers` ruxsat
   bergandagina ishlatiladi. Ya'ni dastur xatosi bo'lsa ham, e'lon qilinmagan natija DB darajasida yopiq.
2. **To'g'ri javob "talabaning o'z qiymatlari" bo'yicha** ko'rsatiladi (numeric: formula + o'sha talabaning
   o'zgaruvchilari, tolerantlik bilan).
3. **Guruhdagi o'rin** — faqat tasdiqlangan urinishlar orasida, musobaqa reytingi (1, 2, 2, 4). Talabaga
   boshqalarning ismi/bali ko'rsatilmaydi, faqat "o'rin / jami".
4. **Kitob havolasi** to'liq to'g'ri bo'lmagan javoblarda chiqadi (to'g'ri javobni oshkor qilmaydi, shuning
   uchun reveal'dan oldin ham ko'rinadi). Format: `BOOKS_BASE_URL/#/kitob/<id>/<bet>` (kutubxona sayti
   bilan mos; `lib/books.ts` da o'zgartiriladi). `book_ref.slug` = kutubxonadagi kitob id (fayl nomi).
5. **Ball o'zgartirish sababi shart** (DB funksiyasi `reason_required`); har o'zgarish `audit_log` ga
   (kim, qachon, eski/yangi, sabab) va talabaga ko'rinadi. Birinchi baholashda sabab shart emas.
6. **Eksport:** CSV (BOM + formula-inyeksiyadan himoya) va Excel. Ustunlar savollar bo'yicha (tasodifiy tanlov
   bo'lsa, talaba olmagan savol bo'sh). O'qituvchi faqat o'z nazoratini oladi (RLS).
7. **Anonim baholash:** yozma javoblarni baholashda ismlar standart yashirin (#1, #2 ...), xohlasa ko'rsatiladi.

## 5-bosqich: ma'ruza va PDF

1. **PDF brauzerda yuklanadi (Storage'ga to'g'ridan-to'g'ri)**, shaxsiy bucket (`lectures`, 50 MB, faqat
   `application/pdf`). Storage RLS: o'qituvchi faqat `<o'z_id>/` papkasiga yozadi/o'qiydi. Server (Vercel)
   fayl oqimini ko'tarmaydi — bepul tarifda funksiya hajm/vaqt chegarasi bor.
2. **Haqiqiy PDF tekshiruvi:** yuklashdan oldin pdf.js bilan ochiladi (betlar soni ham shundan olinadi);
   PowerPoint/boshqa fayl rad etiladi va "PDF ga o'tkazing" xabari chiqadi. Server esa yo'l formati
   (`<uid>/<fayl>.pdf`) va fayl Storage'da borligini tekshiradi.
3. **PDF'ni ko'rsatish:** server qisqa muddatli (1 soat) imzolangan havola beradi, faqat ma'ruza egasi/
   o'qituvchi/admin ga. Talabalar PDF ni olmaydi (doskada ko'rinadi). pdf.js "legacy" build — eski brauzerlar uchun.
   Haqiqiy Chromium'da sinalgan (matn va grafika to'g'ri chizildi, konsol xatosi yo'q).
4. **Jonli savol turlari:** faqat `mcq` va `numeric` (avtomatik tekshiriladi). `short_text`/`lab_task` jonli
   rejimda ma'noga ega emas. Raqamli savolda butun auditoriyaga BIR XIL qiymatlar (doskada ko'rinishi uchun).
5. **Slaydga biriktirish `lecture_questions` da (reja)**; dars paytida `session_questions` ga nusxalanadi (6–8-bosqich).
6. **Ma'ruza o'chirilsa** Storage'dagi fayl ham o'chadi; dars (sessiya) o'tkazilgan ma'ruza o'chirilmaydi (FK restrict).
