# Ishga tushirish yo'riqnomasi va keyin o'zgartiriladigan joylar

## A) Bosqichma-bosqich (0 dan ishlaguncha)

1. **Supabase loyihasi** yarating (bepul tarif). `URL`, `anon`, `service_role` kalitlarini yozib oling. _(README §2A)_
2. **Auth sozlamalari:** "Enable sign ups" — o'chiq; "Confirm email" — o'chiq; Site URL — kelajakdagi domeningiz.
   **Mehmon rejimi uchun:** Authentication → Sign In / Providers → **"Allow anonymous sign-ins" — yoqing** (aks holda mehmonlar kira olmaydi; lokalda `config.toml`da yoqilgan).
   Bot himoyasi kerak bo'lsa Cloudflare Turnstile'ni keyin ulang (hozir ulanmagan: `docs/limitations.md`).
3. **Migratsiyalar:** `npx supabase link --project-ref <ref>` → `npx supabase db push` (yoki SQL Editor'da `0001…0013` tartib bilan).
4. **Kodni oling va sozlang:**
   ```bash
   cd smartedu && npm install && cp .env.example .env.local
   ```
   `.env.local` ni to'ldiring (README §3). `ATTENDANCE_SECRET`, `LAB_SHARED_SECRET`, `CRON_SECRET` uchun `openssl rand -base64 32`.
5. **Lokal tekshiruv:** `npm run dev` → `npm run create-admin -- admin@kafedra.uz "Familiya Ism"` → `/login` dan kiring.
6. **Ma'lumotlar tuzilmasi (admin):** Fakultet → Kafedra → Guruh → Fan → O'qituvchi (fan+guruh biriktirish) → Talabalar (CSV/Excel, `/admin/students/import`).
   Natija jadvalidagi **vaqtinchalik parollarni** yuklab olib talabalarga bering (qayta ko'rsatilmaydi; yo'qolsa "Parolni tiklash").
7. **Vercel'ga joylash:** Root Directory = `smartedu`, env o'zgaruvchilari, deploy (README §4). Supabase Site URL ni domenga o'zgartiring.
8. **Qo'lda tekshirish ro'yxati** (README §10) — birinchi marta Supabase bilan to'liq oqimni sinab ko'ring. Ayniqsa: oflayn avtosaqlash,
   Realtime ulanishi (doskada "ulangan"), talaba konsolida `question_keys` bo'sh ekani.
9. **Birinchi jonli dars sinovi** (5–10 kishi bilan): ma'ruza PDF → savol biriktirish → dars → doska → QR. Realtime ulanishlar limitini
   Supabase panelidan kuzating.
10. **Keep-alive va saqlash muddati:** Vercel Cron avtomatik (`/api/cron/keepalive` va `/api/cron/retention`); qo'shimcha sifatida GitHub Actions
    secrets (`SMARTEDU_URL`, `CRON_SECRET`). Admin → Sozlamalar → "Faollik ma'lumotini saqlash muddati" (standart 180 kun). _(README §6)_
11. **Laboratoriya ulash:** `docs/lab-integration.md` bo'yicha laboratoriya serveringizda imzolash kodini qo'shing; `LAB_SHARED_SECRET` ikkala tomonda bir xil.
12. **Realtime yuklama sinovi (ixtiyoriy, tavsiya):** sinov loyihasida `node scripts/load-realtime.mjs --clients 100 --yes` (`docs/limitations.md`).
13. **Zaxira rejasi:** semestr oxirida Admin → Zaxira (CSV) va `supabase db dump`. _(README §7)_

## B) Keyin o'zgartiradigan joylar (qayerda)

| Nimani                                                                                               | Qayerda                                                                                                                                                                   | Eslatma                                                                                                        |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Fan nomlari**, guruhlar, kafedralar                                                                | Admin panel → tegishli bo'lim                                                                                                                                             | Kodsiz. `seed.sql` faqat demo                                                                                  |
| **Ball qoidalari** (to'g'ri javob balli, `MAX_SPEED_BONUS`, savol vaqti, tarmoq imtiyozi, QR oynasi) | Admin → **Sozlamalar**                                                                                                                                                    | Kodsiz; keyingi savollardan kuchga kiradi                                                                      |
| **Murakkab ball qoidasi** (masalan, ketma-ket to'g'ri javob bonusi)                                  | `src/lib/live-score.ts`                                                                                                                                                   | Toza funksiya; `tests/live-score.test.ts` ni yangilang                                                         |
| **Semestr formulasi** va nazorat og'irligi                                                           | `src/lib/semester.ts`; nazorat formasida "og'irlik"                                                                                                                       | `tests/analytics.test.ts`                                                                                      |
| **Test qisman ballmi?** (ko'p javobli)                                                               | `gradeMcq` — `src/lib/assessment/grade.ts`                                                                                                                                | Hozir "hammasi yoki hech narsa"                                                                                |
| **Natija/javob qachon ko'rinadi**                                                                    | Nazorat formasida (3 variant)                                                                                                                                             | Qoida **ikki joyda** bir xil bo'lishi shart: `src/lib/assessment/policy.ts` va SQL `student_can_see_results()` |
| **Savol turlari** (yangi tur qo'shish)                                                               | `question_type` enum (yangi migratsiya) + `lib/assessment/schemas.ts`, `grade.ts`, `dto.ts`, `result-view.ts`, `csv-import.ts`, `app/teacher/questions/question-form.tsx` | Jonli rejim uchun: `lib/lecture-schemas.ts → LIVE_TYPES`, `lib/live-question.ts`                               |
| **Interfeys matnlari / til**                                                                         | `src/lib/i18n/uz.ts` (hammasi shu yerda)                                                                                                                                  | Boshqa til: `ru.ts` yarating, `i18n/index.ts` da tanlang                                                       |
| **Dizayn** (ranglar, shrift)                                                                         | `src/app/globals.css` (`@theme`, `@utility`)                                                                                                                              | Tailwind 4                                                                                                     |
| **Doska ko'rinishi** (katta ekran)                                                                   | `src/components/board-question.tsx`, `src/app/board/[sessionId]/board-view.tsx`                                                                                           |                                                                                                                |
| **Loyiha nomi ("SmartEdu")**                                                                         | `uz.ts → app.name`, `package.json`, `README.md`, `layout.tsx` metadata                                                                                                    |                                                                                                                |
| **Parol siyosati**                                                                                   | `src/lib/auth/password.ts`                                                                                                                                                |                                                                                                                |
| **Talaba kirishi** (kod+parol)                                                                       | `src/lib/auth/identifier.ts`, `app/api/auth/login`                                                                                                                        | Boshqa usul (HEMIS ID/SSO): `docs/roadmap.md`                                                                  |
| **Tashqi manzillar** (laboratoriya, kutubxona)                                                       | `.env`: `LAB_BASE_URL`, `BOOKS_BASE_URL`; kitob havola formati: `src/lib/books.ts`                                                                                        |                                                                                                                |
| **Reytingda ismlar ko'rinishi**                                                                      | `src/lib/live-rating.ts → shortName`; talaba reyting sahifasi `loadStudentSemester`                                                                                       | To'liq yashirish ham mumkin                                                                                    |
| **NB chegarasi** (`MIN_ATTENDANCE_RATIO`, standart 0.8)                                              | Dars boshlangach: boshqaruv sahifasi → sozlamalar; standart: `src/lib/presence.ts → DEFAULT_MIN_ATTENDANCE_RATIO`                                                         | Auditoriya/masofa hisobi qoidasi ham shu faylda                                                                |
| **Faollik ma'lumoti saqlash muddati**                                                                | Admin → Sozlamalar (`activity_retention_days`)                                                                                                                            | Davomat holati qoladi, reaksiya/vaqt hisoblagichlari o'chadi                                                   |
| **Reaksiya chegaralari, "eng faol" soni, bonus savol**                                               | `src/lib/reactions.ts` (`BATCH_MAX`, `TAP_MIN_GAP_MS`), SQL `app_add_reactions` (jami 20); dars sozlamalari: `top_reactors`, `bonus_enabled`                              | Mijoz va SQL chegaralari bir xil bo'lsin                                                                       |
| **Nazorat nuqtasi qoidasi** ("Keyingi" bosilganda to'xtash)                                          | `src/lib/checkpoint-flow.ts → decideAdvance`                                                                                                                              | `tests/checkpoint-flow.test.ts`                                                                                |
| **Kitob qatlami / kutubxona**                                                                        | `docs/books-integration.md`, `.env: BOOKS_BASE_URL` (o'zgarsa qayta build: CSP `frame-src`)                                                                               |                                                                                                                |
| **Tezlik cheklovlari**                                                                               | Har API route'ida `limit(kalit, soni, oyna_ms)`                                                                                                                           |                                                                                                                |

## C) Ma'lum cheklovlar (halol ro'yxat)

- Supabase bilan E2E sinov o'tkazilmagan (muhit sababli) — README §10 ro'yxatini bajaring. Topilgan xato bo'lsa `docs/decisions.md` ga yozib boring.
- Talaba kodini keyin o'zgartirib bo'lmaydi (sintetik email unga bog'liq).
- Laboratoriya: talaba boshqa kod bilan natija yubora oladi (kuchaytirish: `roadmap.md` §5).
- Realtime kanali ochiq (xabarlar maxfiy emas, holat DB'dan tekshiriladi).
- PowerPoint yuklash yo'q (PDF'ga o'tkazish kerak). Jonli video va AI yordamchi — `roadmap.md`.
- Tezlik cheklovi instansiya bo'yicha xotirada ("yaxshi harakat").
- **NB — taxminiy signal, hukm emas** (erta ketishni bilmaydi, ko'rinish vaqti brauzerga bog'liq): to'liq ro'yxat `docs/limitations.md`.
- Mehmon rejimida bot himoyasi kuchsiz (Turnstile ulanmagan); Realtime yuklama o'lchanmagan (skript yozilgan, ishga tushirilmagan).
