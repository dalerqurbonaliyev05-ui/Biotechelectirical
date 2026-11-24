# Cheklovlar va ochiq gaplar

Bu hujjat tizimning **real** cheklovlarini yozadi: nima o'lchanmagan, nima brauzerga bog'liq, nima faqat taxminiy signal.

## Sinov holati

- **Supabase bilan to'liq E2E sinov o'tkazilmagan.** Ishlab chiqish muhitida Docker/PostgREST/GoTrue yo'q edi. Tekshirilgan: Vitest
  (toza mantiq), haqiqiy PostgreSQL 16 da migratsiyalar + RLS/funksiya testlari (Supabase `auth` sxemasi stub bilan), `next build`,
  smoke (kirmagan foydalanuvchi yo'llari). Birinchi haqiqiy darsdan oldin `docs/launch.md` dagi "birinchi sinov" ro'yxatini bajaring.
- **Realtime yuklamasi o'lchanmagan.** `scripts/load-realtime.mjs` yozilgan, lekin ishga tushirilmagan (Supabase loyihasi yo'q).
  Bepul tarifdagi kanal/ulanish chegaralari: https://supabase.com/docs/guides/realtime/limits — shu raqamlar bilan solishtiring.

## Brauzer imkoniyatlari (xato bermaydi, jimgina o'chadi)

| Imkoniyat                              | Qayerda ishlamasligi mumkin                             | Tizim nima qiladi                                                                                |
| -------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Wake Lock (ekran o'chmasin)            | eski Safari/Android brauzerlari, batareya tejash rejimi | dars davom etadi; ekran o'zi o'chishi mumkin, qaytganda heartbeat tiklanadi                      |
| Vibratsiya (`navigator.vibrate`)       | iOS Safari umuman qo'llab-quvvatlamaydi                 | faqat xira to'liq ekran chaqiruvi ko'rinadi                                                      |
| Sahifa ko'rinishi (`visibilitychange`) | ba'zi in-app brauzerlar                                 | ko'rinmas vaqt aniqlanmaydi → masofaviy talabaning "ko'rinish" vaqti biroz ortiq chiqishi mumkin |
| Heartbeat (JS taymer)                  | telefon ekrani o'chganda taymerlar to'xtaydi            | masofaviy talaba uchun o'sha vaqt hisoblanmaydi (120 s dan uzun uzilish nolga teng)              |
| Realtime (WebSocket)                   | korporativ tarmoq/proksi                                | 5 s da bir marta so'rov (polling) zaxirasi; heartbeat javobida ham chaqiruv/tanaffus keladi      |

## Davomat va NB — bu hukm emas, taxminiy signal

- **Auditoriyadagi talaba** QR bilan joyida ekani tasdiqlanadi va qo'shilgandan dars oxirigacha "bor" hisoblanadi.
  **Erta ketib qolishni tizim bilmaydi.** QR rasmga olinib, boshqa joydan ishlatilishi mumkin (token ~45 s yashaydi — himoya, lekin to'liq emas).
- **Masofaviy talaba** faqat sahifa ko'rinib turgan vaqt uchun hisoblanadi. Sahifani ochiq qoldirib ketish (yoki boshqa qurilma
  bilan "yurak urishi" yuborish) aniqlanmaydi.
- NB chegarasi `MIN_ATTENDANCE_RATIO` (standart 0.8, dars bo'yicha sozlanadi). Tanaffus davomiylikdan ayriladi.
- **O'qituvchi har doim qo'lda tuzatishi mumkin**; sabab majburiy va `audit_log` ga yoziladi. Yakuniy qaror — o'qituvchida.
- Mehmonlar (talabaga bog'lanmagan) NB ro'yxatiga va semestr reytingiga kirmaydi.

## Maxfiylik va saqlash muddati

- Sezgir ma‘lumot (reaksiyalar, kuzatish vaqti, NB): **faqat shu dars o'qituvchisi (va admin) hamda talabaning o'zi** ko'radi (RLS).
  NB ro'yxati doskada hech qachon ko'rsatilmaydi (testlar bilan himoyalangan: `tests/nb-privacy.test.ts`).
- Talabaga dars boshida kuzatish qoidasi ochiq ko'rsatiladi (`guests.notice`).
- Saqlash muddati: Admin → Sozlamalar → "Faollik ma'lumotini saqlash muddati" (standart 180 kun). Kunlik cron
  (`/api/cron/retention`) tugagan darslarning reaksiya/vaqt hisoblagichlarini o'chiradi; davomat **holati** (qatnashdi/NB) qoladi.
  Cron ishlashi uchun `CRON_SECRET` va Vercel Cron kerak.
- **Kuzatish qonuniy talablarga mos kelishi mas'uliyati muassasada**: talabalar roziligi/ichki reglamentni o'zingiz tekshiring.

## Mehmon rejimi

- Anonim kirish (Supabase Anonymous Sign-ins) yoqilgan bo'lishi kerak. IP bo'yicha cheklov ilova ichida (xotirada) — Vercel'ning
  ko'p nusxali muhitida har nusxada alohida hisoblanadi, ya'ni **kuchsiz himoya**. Haqiqiy bot himoyasi uchun Cloudflare Turnstile
  ulash tavsiya etiladi (kalitni siz kiritasiz; hozircha ulanmagan).

## Boshqa

- Slayd miniatyuralari brauzerda yaratiladi (juda katta PDF'da sekin bo'lishi mumkin).
- Foto/video translatsiya va AI yordamchi bu versiyaga kirmaydi (faqat 14-bosqichdagi bo'sh joy).
