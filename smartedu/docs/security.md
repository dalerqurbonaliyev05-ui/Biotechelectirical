# Xavfsizlik: nima tekshirilgan, nima tekshirilmagan

## Tamoyillar

1. **Talaba hech narsa yozmaydi** — barcha talaba yozuvlari serverdagi API (service role) orqali, holat tekshirilgandan keyin.
2. **To'g'ri javob alohida jadvalda** (`question_keys`), talabaga siyosat yo'q; talaba DTO'sida kalit yo'q (testlangan).
3. **Vaqt va ball faqat serverda** (nazorat: DB soati; jonli: ilova server soati, toza hisoblash funksiyasi).
4. **Rol har doim DB'dagi `profiles.role`** dan (JWT dagi da'vo faqat qo'pol yo'naltirish uchun).
5. **Fail-closed:** `ATTENDANCE_SECRET`, `LAB_SHARED_SECRET`, `CRON_SECRET` yo'q/qisqa bo'lsa tegishli funksiya YOPIQ.
6. **Shaxsiy ma'lumot minimal:** ism, kod, guruh, natija. Loglarga ism/kod/parol/javob chiqmaydi (`lib/log.ts`: faqat xato turi/kodi).

## Avtomatik tekshiruvlar (CI'da ham ishlaydi)

| Tekshiruv                                                                                                                        | Qayerda                                                              |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Barcha `public` jadvalda RLS yoqilgan; yangi jadval himoyasiz qolsa yiqiladi                                                     | `supabase/tests/80_security_matrix.sql`                              |
| `app_*` server funksiyalarini foydalanuvchi chaqira olmaydi                                                                      | shu fayl                                                             |
| `anon` hech narsa ko'rmaydi                                                                                                      | shu fayl                                                             |
| **Talaba boshqa talabaning natijasini/ballini/tokenini ola olmaydi** (ikki talabada ma'lumot bor, har biri faqat o'zini ko'radi) | shu fayl + `20_rls_assessments.sql`                                  |
| Talaba to'g'ri javoblarni (`question_keys`), savollarni, urinishlarni (natija chiqmaguncha) o'qiy olmaydi                        | `20_…`, `80_…`                                                       |
| Vaqt chegarasi, takroriy topshirish, ball o'zgartirishda sabab shartligi, audit                                                  | `20_rls_assessments.sql`                                             |
| Ma'ruza/PDF/Storage: o'qituvchi faqat o'z papkasiga yozadi                                                                       | `30_rls_lectures.sql`                                                |
| Ikki marta javob DB darajasida taqiqlangan; reyting yig'indisi                                                                   | `60_rls_live_questions.sql`                                          |
| Laboratoriya replay (`nonce`)                                                                                                    | `70_rls_lab.sql`, `tests/lab.test.ts`                                |
| Imzo/HMAC, vaqt oynasi, validatsiya (lab, QR token, cron)                                                                        | `tests/lab.test.ts`, `attendance-token.test.ts`, `cron-auth.test.ts` |
| Xavfsiz formula hisoblagich (kod bajarish urinishlari)                                                                           | `tests/assessment-core.test.ts`                                      |
| Talaba DTO'sida kalit sizib chiqmaydi                                                                                            | `tests/assessment-plan.test.ts`, `live-question.test.ts`             |
| CSP sarlavhasi PDF/QR/worker'ni buzmaydi                                                                                         | haqiqiy Chromium'da qo'lda sinalgan (11-bosqich)                     |

## So'rovlar cheklovi va validatsiya

- **zod** barcha API kirishida (`readJson`); URL parametrlari UUID bo'lishi shart (`idParam`), aks holda 404.
- **Tezlik cheklovi** (`lib/rate-limit.ts`, xotirada): kirish (IP + identifikator), qo'shilish, javob berish, saqlash,
  laboratoriya, import, eksport va h.k. Serverless'da instansiya bo'yicha — "yaxshi harakat" himoyasi (cheklov: `roadmap.md`).
- **Sarlavhalar:** CSP (production), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **CSV eksport:** formula inyeksiyasidan himoya (`=`, `+`, `-`, `@` oldiga `'`).

## TekshirilMAGAN (halollik)

- **Supabase bilan uchidan-uchiga (E2E) sinov o'tkazilmagan:** muhitda Docker/PostgREST/GoTrue yo'q edi. SQL/RLS haqiqiy
  PostgreSQL'da, toza mantiq Vitest'da, sahifalar (PDF, doska, QR, CSP) Chromium'da sinalgan; API route'lari tur va smoke
  darajasida. Ulangach README'dagi "Qo'lda tekshirish ro'yxati" ni bajaring.
- RLS testlari Supabase'ni **taqlid qiluvchi stub** (`supabase/tests/00_supabase_stub.sql`) ustida; haqiqiy Supabase'da
  `auth.uid()` JWT'dan keladi — siyosatlar shu funksiyaga tayanadi (standart usul).
- Realtime kanallari ochiq (private emas): xabarlar maxfiy emas va holat DB'dan tekshiriladi (`decisions.md`, 6-bosqich).
- Tashqi penetratsion test o'tkazilmagan.
