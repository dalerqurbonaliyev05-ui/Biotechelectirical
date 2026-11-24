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

## 6-bosqich: elektron doska va sinxronlash

1. **Holat manbai — DB, Realtime faqat "signal".** Teacher slaydni API orqali o'zgartiradi (DB: `current_slide`,
   `rev + 1`), so'ng kanalga `{rev, slide, status}` yuboradi. Doska xabar kelganda **haqiqiy holatni DB'dan**
   qayta oladi. Shuning uchun kanalga soxta xabar yuborgan talaba doskani aldab bo'lmaydi. Qo'shimcha: aloqa
   uzilsa har 10 s da so'rov bilan tiklanadi.
2. **Nega private kanal/Realtime Authorization emas:** u `realtime.messages` RLS'ni talab qiladi va bu muhitda
   sinab bo'lmaydi. Hozirgi sxema bunga muhtoj emas (xabarlarda maxfiy ma'lumot yo'q, holat DB'dan tekshiriladi).
   Keyin kerak bo'lsa: kanalni `private: true` qilib, `realtime.messages` ga "faqat sessiya egasi yuboradi"
   siyosatini qo'shish mumkin.
3. **Bepul tarif tejamkorligi:** sessiya uchun BITTA kanal (`session:<id>`), xabar ~40 bayt, slayd almashtirishda
   bitta xabar. Doska/boshqaruv 10 s polling (bitta mijoz); talabalar uchun polling faqat aloqa uzilganda.
4. **Doska faqat sessiya egasi (yoki admin) hisobi bilan ochiladi** — auditoriya kompyuterida o'qituvchi kiradi.
   Doskaga maxsus token berish (kirishsiz) keyinroq mumkin; hozircha PDF havolasi ham shu hisob bilan beriladi.
5. **Boshqaruv:** doska klaviaturasi (← → bo'sh joy) va telefondan alohida boshqaruv sahifasi — ikkalasi bir xil API.
   `rev` eskirgan hodisalarni tashlab yuboradi.
6. **Qo'shilish kodi:** 6 xonali, faqat FAOL sessiyalar orasida noyob (qisman unikal indeks); band chiqsa DB
   funksiyasi qayta urinadi. Sessiya tugagach kod qayta ishlatilishi mumkin.
7. **Brauzerda sinalgan:** doska (PDF + QR + kod) haqiqiy Chromium'da chizilgan, QR dekodlanib havola tekshirilgan.

## 7-bosqich: qo'shilish va davomat

1. **Ikki jadval:** `session_participants` (runtime: token, qayta kirishlar) va `attendance` (hisobot uchun
   doimiy yozuv). Ikkalasi bitta DB funksiyasida (`app_join_session`) atomik yoziladi.
2. **"Bir martalik, vaqt chegarali token" talqini:** QR tokeni vaqt oynasi bilan cheklangan (har oynada yangilanadi),
   har talabaga bir marta qo'shilish yozuvi (unique), va har qo'shilishda yangi shaxsiy `join_token` — eski
   qurilma tokeni bekor bo'ladi. Umumiy QR bitta talabaga emas, butun auditoriyaga mo'ljallangan, shuning uchun
   "bir martalik" talabaga nisbatan ma'noda.
3. **Fail-closed:** `ATTENDANCE_SECRET` yo'q yoki 16 belgidan qisqa bo'lsa, hech bir token yaroqli emas →
   hamma `remote`. Doska ogohlantirish chiqaradi.
4. **QR muddati o'tgan bo'lsa** talaba rad etilmaydi: `remote` sifatida qo'shiladi va qayta skanerlash
   tavsiya qilinadi (chegarada skanerlagan talaba zarar ko'rmasin).
5. **Talaba holati:** Realtime ulangan bo'lsa so'rov yo'q (bepul tarif); uzilsa 10 s polling. `token_replaced` —
   javob yuborilganda (8-bosqich) yoki polling'da aniqlanadi.
6. **Doska ishtirokchilar sonini 5 s polling bilan oladi** (Realtime xabar tejash uchun har qo'shilishda xabar yuborilmaydi).
7. **IP/geo saqlanmaydi** (shaxsiy ma'lumotni minimal saqlash). Qo'shimcha signal sifatida keyin ko'rib chiqiladi.

## 8-bosqich: jonli savollar va reyting

1. **Ball hisoblash — toza funksiya** (`lib/live-score.ts`), DB'da emas: 100 (to'g'ri) / 0, tezlik bonusi
   0..`max_speed_bonus` (standart **10**), savol ochilgandan beri o'tgan server vaqtiga chiziqli, `.5` yuqoriga.
   `scoreLiveAnswer` 20+ sinovda tekshirilgan: vaqt tugagan, ikki marta javob, kech kelgan, erta yopilgan, soat og'ishi.
2. **Tarmoq kechikishi imtiyozi (`live_grace_ms`, 1500 ms):** muddatdan keyin shu oraliqda kelgan javob QABUL qilinadi
   (bonus 0), undan keyin rad. Sekin internet/arzon telefon talabani ortiqcha jazolamasin.
3. **Vaqt manbai:** savol ochilgan vaqt ham, javob kelgan vaqt ham ilova serveri soati (`Date.now()`); mijoz soati
   ishlatilmaydi. Instansiyalar orasidagi og'ish (odatda ms) imtiyoz ichida yutiladi. (Test-nazoratda esa DB soati.)
4. **Ikki marta javob 3 qavatda to'siladi:** ilovada tekshiruv → toza funksiya `duplicate` → DB `unique(savol, talaba)`
   (poyga holatida ham ikkinchisi ballga tegmaydi: `app_record_live_answer` → `duplicate`).
5. **Javob to'g'riligi savol yopilguncha ko'rinmaydi** (talabaga ham, javob yuborish natijasida ham): qo'shnidan
   ko'chirish ma'nosiz. Doskada ochiq paytda faqat variantlar bo'yicha SONLAR ko'rinadi (to'g'ri ajratilmaydi).
6. **Doska "to'xtaydi":** slaydga yetilganda shu slayddagi hali so'ralmagan birinchi savol avtomatik ochiladi
   (ochiq savol avval yopiladi); qolganlari qo'lda. Vaqt + 1.8 s tugagach doska (yoki boshqaruv sahifasi) savolni
   o'zi yopadi va natijani ko'rsatadi. Savol faqat shu slayd ko'ringan paytda doskada turadi.
7. **Rejalashtirilgan savol dars davomida bir marta** so'raladi (qisman unikal indeks) — qayta so'rab ikki
   barobar ball olib bo'lmaydi.
8. **Reyting:** ball ↓, teng ballda to'g'ri javoblarga KAM vaqt ketgani yuqori, hammasi teng bo'lsa — teng o'rin.
   Medallar 1–3-o'rinlarga (teng o'rinda teng medal). Ismlar qisqartiriladi ("Aliyev A.") — shaxsiy ma'lumot minimal.
   Talaba telefonida faqat o'z o'rni; reyting savol YOPILGANDAN keyin ko'rinadi.
9. **Realtime tejamkorligi:** savol ochish/yopish/slayd — har biri bitta ~50 baytlik xabar; talabalar xabar
   kelganda serverdan so'raydi (soxta xabar zarar qilmaydi). Savol yo'q va slayd oddiy almashsa talabalar so'rov
   yubormaydi. Doska statistikani 2 s polling bilan oladi (xabar emas). Reyting 2 s xotirada keshlanadi.
10. **Raqamli jonli savol:** butun auditoriyaga bir xil qiymatlar (doskada ko'rinadi), urug' = sessiya + savol.

## 9-bosqich: laboratoriya va kitob integratsiyasi

1. **HMAC-SHA256 (JWT emas):** imzo tananing aynan baytlariga qo'yiladi (`X-Signature: sha256=<hex>`), shuning uchun
   server tanani xom matn sifatida o'qiydi; imzo JSON tahlilidan OLDIN, vaqt-doimiy taqqoslash bilan tekshiriladi.
   JWT'ga nisbatan: kutubxona kerak emas, laboratoriya tomonida 3 qator kod. Kontrakt, namunalar (curl/Node/Python)
   va test skripti: `docs/lab-integration.md`, `scripts/lab-sign.mjs`.
2. **Replay himoyasi:** `time` ±5 daqiqa + `nonce` DB'da unikal. Qayta yuborilgan so'rov xato emas, idempotent
   `{duplicate:true}` (tarmoq qayta urinishi xavfsiz).
3. **Fail-closed:** `LAB_SHARED_SECRET` yo'q yoki < 16 belgi → 503; tana > 8 KB → 413 (imzodan oldin).
4. **DB xatosi ≠ "topilmadi":** qidiruv xatosi 5xx (laboratoriya serveri qayta urinadi), 404 faqat talaba haqiqatan
   yo'q bo'lganda. Shu naqsh `requireUser`, `getSessionProfile`, kirishda ham tuzatildi (aks holda DB uzilishida
   foydalanuvchi "kirmagan" ko'rinar va /login tsikli bo'lardi). Buni haqiqiy serverda soxta DB manzili bilan topdik.
5. **Ball oynasi:** natija nazorat OCHILGANIDAN keyin kelgan bo'lsa hisobga olinadi (eski natijani qayta
   ishlatib bo'lmasin; uy topshirig'i kabi uzoq oynalarga ham mos). Bir `lab_id` bo'yicha eng yaxshi natija.
   Ball = `max_points × score/max_score`. Natija kelmasa — o'qituvchi qo'lda; kech kelgan natija baholash
   sahifasida ball sifatida TAKLIF qilinadi (o'qituvchi tasdiqlaydi, audit'ga tushadi).
6. **Ma'lum cheklov:** `student_code` laboratoriya saytidan keladi (havoladagi `?student=`), ya'ni talaba boshqa
   kod bilan natija yuborishi mumkin. Kuchaytirish — SmartEdu imzolagan "ishga tushirish tokeni" (roadmap).
7. **Kitob havolalari** 4-bosqichda qilingan (`BOOKS_BASE_URL/#/kitob/<id>/<bet>`); o'qituvchi savollar ro'yxatida ham bosiladigan.

## 10-bosqich: tahlil va semestr reytingi

1. **Semestr jami = jonli ballar yig'indisi + nazorat hissalari.** Nazorat hissasi = (olingan/maksimal) × `assessments.weight`
   (standart 100; o'qituvchi nazorat formasida o'zgartiradi, masalan oraliq nazorat uchun 500). Faqat TASDIQLANGAN
   urinishlar. Bu — taxmin: jonli ballar xom (har to'g'ri javob ~100–110), nazorat esa og'irlik bilan shkalalanadi.
   Boshqacha shkala kerak bo'lsa faqat `lib/semester.ts` o'zgaradi (sinovlar bor).
2. **Mavzu bo'yicha o'zlashtirish:** jonli savollar + nazoratlarning baholangan javoblari birga; mavzu nomi katta-kichik
   harf va probelga bog'liq emas. "Yomon" mavzu = kamida 5 ta javob asosida to'g'ri ulushi < 60% (mavzusizlar
   kirmaydi, kichik namuna belgilanadi). Chegaralar `topicBreakdown` parametrlari.
3. **Talaba reytingida boshqalarning ismlari qisqartirilgan** ("Aliyev A."), faqat eng yaxshi 5 ta + o'z o'rni; ballari
   ochiq. Jonli darsda doskada ham shunday. Xohlansa to'liq yashirish oson (`top` ni qaytarmaslik).
4. **1000 qator tuzog'i (haqiqiy xato topildi):** Supabase API bir so'rovda 1000 qatordan ortig'ini JIMGINA kesadi.
   Natijalar eksporti (talaba × savol) shundan oshishi mumkin edi. Endi katta o'qishlar `fetchAll` (sahifalash) bilan,
   uzun `in(...)` ro'yxatlari o'rniga join filtri/embed ishlatiladi (URL uzunligi chegarasi).
5. **PostgREST embed noaniqligi (haqiqiy xato topildi):** `attempts` ning `profiles` ga IKKITA FK'si bor
   (`student_id`, `finalized_by`) — `profiles(...)` deb yozish ish vaqtida xato beradi, TypeScript esa ko'rmaydi.
   3 joyda `profiles!attempts_student_id_fkey(...)` qilindi va `scripts/check-embeds.py` (haqiqiy FK'lar bilan solishtiradi)
   qo'shildi — CI'da ishlaydi.
6. **Jonli sinov uchun halollik:** shu ikki xato Supabase'siz yetarli sinalmaganligining oqibati edi. Ulangach
   README'dagi qo'lda tekshirish ro'yxatini bajaring.

## 11-bosqich: mustahkamlash va ishga tushirish

1. **Xavfsizlik matritsasi testi** (`80_security_matrix.sql`): barcha jadvalda RLS, `app_*` funksiyalar yopiqligi, anon, va
   ikki talaba izolyatsiyasi. Birinchi urinishda test o'zi xatoni ko'rsatdi: `app_role()` RLS yordamchisi `app_%` nomiga mos
   keladi, lekin foydalanuvchi uchun ochiq BO'LISHI shart (siyosatlar chaqiradi) — aniq istisno sifatida yozildi.
2. **CSP (production) + HSTS** qo'shildi; PDF (worker), QR (`data:` rasm) haqiqiy Chromium'da sinalgan: qoidabuzarlik 0.
   `'unsafe-inline'` skript — Next.js gidratatsiyasi uchun (nonce'siz); keyinroq nonce'li CSP (roadmap).
3. **Keep-alive:** `CRON_SECRET` (fail-closed) + Vercel Cron + GitHub Actions zaxirasi. Endpoint bazaga oddiy `head` so'rov yuboradi.
4. **Zaxira:** admin CSV eksport (whitelist). Meta-test migratsiyalarni o'qib, har bir jadval eksportda yoki sababi bilan
   istisnoda ekanini tekshiradi — yangi jadval unutilmaydi. `join_token` chiqmaydi.
5. **Admin bootstrap skripti** (`create-admin.mjs`): productionda `seed.sql` ishlatilmaydi, birinchi adminni yaratish uchun.
6. **CI:** lint → tur → Vitest → SQL/RLS (haqiqiy Postgres xizmati) → embed tekshiruvi → build → smoke.
7. **Cloudflare:** faqat yo'riqnoma (OpenNext/Workers); SINALMAGAN deb belgilangan.

# v2 (kengaytirilgan talablar) — 5-bosqich: slayd muharriri

1. **Nazorat nuqtasi (`lecture_checkpoints`) = "shu slayddan KEYIN"** so'raladigan savol(lar). Bir slaydda bitta nuqta, ichida tartiblangan
   bir necha savol (`lecture_questions.position`); `is_bonus` — bonus savol belgisi (9-bosqich); oxirgi slayddan keyingi nuqta `final`.
   Eski `lecture_questions.slide_no` endi "after_slide" ma'nosida (denormalizatsiya, kod har ikkisini bir xil yozadi).
2. **Miniatyuralar brauzerda yuklashda bir marta chiziladi** (pdf.js → JPEG ~240 px) va Storage'ga `<uid>/<papka>/<n>.jpg` sifatida yoziladi.
   Server PDF'ni qayta ishlamaydi (bepul tarif). Miniatyura chiqmasa ma'ruza baribir yaratiladi (raqamli plitkalar).
3. **Yangi savol muharrirdan to'g'ridan-to'g'ri** (2–6 variant) yaratiladi va savollar bankiga ham tushadi; bankdan ham tanlash mumkin.
   Muharrirda faqat test (mcq) yoziladi; raqamli savol uchun savollar banki ishlatiladi.
4. **Slayd kitoblari (`slide_books`)** hozircha qo'lda (nom, slug, bet); kutubxona API kontrakti 12-bosqichda.

## v2 — 6-bosqich: doska paneli

1. **Ingichka panel (`BoardStrip`, 56 px) slayd maydonidan TASHQARIDA**, alohida qator — slayd ustini hech qachon yopmaydi. Chapda kitob
   belgisi (12), o'rtada reaksiyalar (9), o'ngda hisoblagichlar uchun joy. Pastki QR/kod paneli ixchamlashtirildi (QR 110 px).
2. **Doska faqat sessiya egasi (yoki admin) hisobi bilan ochiladi**, shuning uchun o'qituvchi asboblari (slayd boshqaruvi, kodni yangilash)
   boshqa hech kimga ko'rinmaydi. Darsni o'qituvchi bosh sahifasidan (`QuickStart`) yoki ma'ruza sahifasidan (guruh/auditoriya bilan) boshlaydi.

## v2 — 7-bosqich: mehmon rejimi

1. **Mehmon = Supabase anonim foydalanuvchisi** (`signInAnonymously`, profili yo'q). Dars jadvallaridagi `student_id` FK'si `profiles`dan
   `auth.users`ga ko'chirildi (0009), shunda javob/ball/davomat talaba ham, mehmon ham uchun bir xil ishlaydi. Mehmon faqat `/api/live/*` ga
   kira oladi (`requireLiveUser`); boshqa API/sahifalar rol talab qiladi → mehmon 403/yo'naltirish. RLS testida mehmon hech narsani ko'rmaydi.
2. **Semestr reytingi** faqat guruh ro'yxatidagi talabalar (profiles) bo'yicha → bog'lanmagan mehmon reytingga kirmaydi (qo'shimcha kod kerak emas).
   Dars reytingi/medallarida mehmon kiritgan ismi bilan ishtirok etadi.
3. **Bog'lash faqat dars TUGAGACH** (`app_link_guest`): javoblar, ballar, davomat talabaga ko'chadi. Talaba shu darsga o'z hisobi bilan
   ham kirgan bo'lsa — rad (`student_already_joined`), ikki marta hisoblanmasin.
4. **Bloklash** (`blocked`): qayta kira olmaydi; mehmonlarni o'chirish (`allow_guests=false`) YANGI mehmonni to'xtatadi. Kodni yangilash
   eski kodni darhol bekor qiladi (mavjud ishtirokchilar sessiya id bilan ishlayveradi).
5. **Suiiste'molga qarshi:** mehmon qo'shilishiga IP bo'yicha tezlik cheklovi (bizning API'da) + foydalanuvchi bo'yicha. Anonim akkaunt YARATISH
   Supabase Auth'da (brauzerdan) bo'lgani uchun uning cheklovi Supabase tomonida (anonim kirish uchun IP limiti — panelda ko'ring).
   **Cloudflare Turnstile** (ixtiyoriy, bepul): `signInAnonymously({ options: { captchaToken } })` + Supabase Auth → Attack Protection → CAPTCHA.
   Hozir YOQILMAGAN (tashqi xizmat qo'shmaslik talabi); ommaviy hujum kuzatilsa yoqiladi.
6. **Shaffoflik matni qo'shilishdan OLDIN** ko'rsatiladi (qatnashish qanday kuzatilishi); qo'shilish tugma bilan (QR skanerlansa ham).
7. **Ismlar:** `session_participants → profiles` embed endi noto'g'ri bo'lardi (FK `linked_student_id`ga qolgan) — shuning uchun ismlar
   `participantNames()` orqali olinadi (profil yoki `guest_name`).

## v2 · 8-bosqich — nazorat nuqtasi doskani to'xtatadi

- **Trigger "slaydga yetganda" emas, "keyingi slaydga o'tmoqchi bo'lganda".** `POST /api/sessions/[id]/next`
  qaror mantig'i toza funksiyada (`lib/checkpoint-flow.ts`, `decideAdvance`) va Vitest bilan sinalgan:
  ochiq savol → yopiladi; nuqtada so'ralmagan oddiy savol → keyingisi ochiladi (slayd o'zgarmaydi);
  hammasi tugagach → keyingi slayd (oxirgisida joyida qoladi). Bonus savol (9-bosqich) shu ketma-ketlikka
  "oddiy savollardan keyin, slayd almashishidan oldin" bosqichi sifatida ulanadi (`bonusReady` hozircha `false`).
- **O'tkazib yuborish:** `{skip:true}` — ochiq savol yopiladi va nuqta o'tkaziladi; doskada `S` tugmasi,
  boshqaruvda "O'tkazib yuborish" tugmasi.
- **Orqaga/sakrash nuqtani ishga tushirmaydi** (`/slide` faqat ochiq savolni yopadi): o'qituvchi o'tgan
  slaydga qaytganda savol qayta chiqib ketmasin. Oldingi `autoOpenForSlide` (slaydga yetganda ochish) olib tashlandi.
- **Cheklov:** `/next` ochiq savolni yopishda va keyingisini ochishda bir nechta so'rov ketma-ket ishlaydi
  (bitta tranzaksiya emas); ikki marta tez bosish holatida `app_*` funksiyalaridagi tekshiruvlar
  (bitta ochiq savol) himoya qiladi. Supabase E2E bilan sinalmagan.

## v2 · 9-bosqich — reaksiyalar va eng faol talabaga bonus savol

- **Ikki kanal:** har bosishda doskaga darhol Realtime *signali* ketadi (faqat animatsiya, ishonchsiz: doska uni
  soniyasiga ~8 tagacha qabul qiladi). Haqiqiy hisob esa talaba telefonida yig'ilib, **~5 s da bir paket**
  bo'lib `POST /api/live/[sessionId]/reaction` orqali DB'ga yoziladi; doska/boshqaruv DB'dan har 4 s da o'qiydi.
- **Spamga qarshi 3 qatlam:** mijozda bosishlar orasida ≥400 ms va paketda ≤5; serverda daqiqasiga 30 paket;
  SQL'da (`app_add_reactions`) chaqiruvga ≤5 va talaba/slayd/tur uchun jami ≤20. Bloklangan, ishtirokchi bo'lmagan,
  tugagan sessiya — rad. `confused_enabled` o'chiq bo'lsa "tushunmadim" yozilmaydi.
- **Maxfiylik:** `session_reactions` — RLS: faqat shu dars o'qituvchisi/admin va talabaning o'zi o'qiydi; yozish yo'q.
  Doskaga ismlar faqat "ismlarni ko'rsatish" yoqilganda chiqadi, aks holda faqat son.
- **Eng faol:** dars boshidan jami reaksiyalar yig'indisi (bloklanganlarsiz), teng bo'lsa talaba id bo'yicha
  (deterministik). `top_reactors` (1–10) nafar talaba bonus savolga nishonlanadi. Bir talaba bir necha bonusni
  olishi mumkin (kumulyativ hisob) — keyin o'zgartirish mumkin.
- **Bonus savol oqimi:** nuqtadagi oddiy savollar tugagach, `bonus_enabled` va nishonlanadigan talaba bo'lsa
  `app_open_targeted_question` bilan ochiladi (`audience='targeted'`, `target_ids`). Boshqalar savolni ko'radi,
  lekin javob bera olmaydi (`not_target`, serverda tekshiriladi); nishon id'lari mijozga yuborilmaydi.
  Reaksiya yo'q bo'lsa bonus savol o'tkazib yuboriladi (slayd almashadi).
- **Cheklov:** realtime signal ishonchsiz bo'lgani uchun animatsiya hajmi haqiqiy bosishlar sonini aks ettirmasligi
  mumkin; son DB'dan keladi. Supabase E2E bilan sinalmagan.
