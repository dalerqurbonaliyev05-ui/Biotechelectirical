# Topshirish ro'yxati (Vazirlik / universitet uchun)

Topshiriladigan paket — faqat `amaliyot-portal/` papkasi (repozitoriydagi boshqa papkalar bu loyihaga aloqasiz).
Paket mustaqil: Supabase, Vercel va boshqa bulut xizmatlariga bog'liq emas.

## Paket tarkibi
- Kod: `server/` (Node.js), `web/` (sahifalar), `db/migrations/` (PostgreSQL sxemasi va RLS)
- Joylashtirish: `Dockerfile`, `docker-compose.yml`, `.env.example`, `deploy/` (HTTPS, systemd), `scripts/` (zaxira/tiklash)
- Hujjatlar: `README.md`, `docs/INSTALL.md`, `docs/ADMIN.md`, `docs/ARCHITECTURE.md`, `docs/HEMIS.md`, shu fayl
- Sinovlar: `server/test` (60), `tests/e2e` (48)

## Nima tekshirilgan (bu muhitda bajarilgan)
| Tekshiruv | Natija |
|---|---|
| Server sinovlari (haqiqiy PostgreSQL 16): kirish, bloklash, refresh aylanishi, parol almashtirish, faollashtirish va parallel hujum, RLS rollar matritsasi, shlyuz inyeksiya urinishlari, import, rasm yuklash/havola, sarlavhalar, yo'l o'tish, so'rov chegarasi, HEMIS xaritasi | 60/60 |
| Brauzer sinovlari (Chromium + server + PostgreSQL): barcha 4 rol uchun to'liq oqimlar, PDF (pechat faqat tasdiqlangan va o'zgarmagan ma'lumotga), XSS, CSP, tashqi tarmoqqa so'rov yo'qligi, sessiya saqlash, avtomatik yangilanish | 40/40 + import 8/8 |
| Docker: tasvir yig'ildi, `docker compose up` (baza + server, migratsiya avtomatik), `healthy`, administrator yaratildi, kirish ishladi | O'tdi |
| Zaxira → ma'lumotni buzish → tiklash (baza + fayllar), tiklangandan keyin kirish | O'tdi |
| `docker compose config` (oddiy va `--profile https`) | O'tdi |

## Nima tekshirilmagan / sizning tomoningizda tekshirilishi kerak
1. **HAQIQIY HEMIS API** — mavjud emas edi; `hemis-sync` faqat soxta server bilan sinalgan (docs/HEMIS.md). CSV/Excel yo'li to'liq sinalgan.
2. **HTTPS profili** (Caddy) va nginx namunasi — sozlama fayllari sintaksis jihatdan tekshirilgan, lekin haqiqiy domen/sertifikat bilan ishga tushirilmagan.
3. **Docker'siz o'rnatish** (systemd) — qo'llanma yozilgan, lekin alohida mashinada qadam-baqadam bajarib ko'rilmagan.
4. **Yuklama**: yuzlab bir vaqtdagi foydalanuvchi bilan sinov o'tkazilmagan. Kutilayotgan hajm (bitta kafedra / bir necha yuz talaba) uchun yetarli, deb baholanadi, lekin o'lchanmagan.
5. **Mustaqil xavfsizlik auditi / penetratsion sinov** o'tkazilmagan (docs/ARCHITECTURE.md, 4-bo'lim). Vazirlikka topshirishdan oldin o'tkazing.
6. **Brauzerlar**: sinovlar faqat Chromium'da; Safari/Firefox/eski telefonlarda qo'lda tekshiring.
7. Sinovlar bajarilgan muhitda tashqi tarmoq cheklangan edi: Docker tasvirini yig'ishda npm reestriga ulanish uchun muhitning o'z sertifikati vaqtincha qo'shilgan (faqat sinov nusxasida; `Dockerfile` o'zgarmagan). Oddiy tarmoqda `docker compose up -d --build` shundoq ishlashi kerak.

## Qaror va ma'lumot kutayotgan masalalar
1. **Pechat va imzo**: hozir namunaviy (to'qib chiqarilgan) rasmlar — `web/assets/pechat.svg`, `imzo.svg`. Rasmiy pechat/imzo yoki **ERI (E-IMZO)** integratsiyasi kerakmi?
2. **Kirish usuli**: hozir HEMIS ID + bir martalik kod + o'z paroli. HEMIS yagona kirish (SSO/OAuth) mavjud bo'lsa ulash alohida ish.
3. **Joylashtirish joyi**: Vazirlik/universitet serveri? Zaxira va monitoring kim tomonidan yuritiladi? (docs/ADMIN.md)
4. **Shaxsiy ma'lumotlar**: saqlash muddati, rozilik, ma'lumotlarni lokalizatsiya talablari — tashkilotning huquqiy bo'limi bilan kelishing.
5. **Ko'p universitet**: hozir bitta tashkilot uchun (bitta `settings` qatori, bitta RES). Bir nechta universitet/korxona uchun ko'p-ijarachilik (multi-tenant) alohida ishlab chiqiladi.
6. **Tillar**: interfeys faqat o'zbek tilida (lotin).

## Narx ta'siri (avvalgi smetaga nisbatan)
Bulutli xizmat qatorlari (Supabase, Vercel, VPS — taxminan 20,16 mln so'm) olib tashlanadi; qolgan ishlab chiqish va joriy etish
qatorlari taxminan 81,8 mln so'm (≈ $6 900) atrofida qoladi. Server (VPS/o'z serveri), SSL sertifikati, administrator ish haqi va
xavfsizlik auditi — endi qabul qiluvchi tomonning xarajati; ularni qabul qiluvchi bilan alohida kelishing. (Yangilangan smeta alohida hujjatda.)

## Mualliflik va litsenziya
Litsenziya hozircha belgilanmagan (`LICENSE` fayli yo'q): Vazirlik bilan kelishuvga qarab (mulk huquqi, foydalanish, qo'llab-quvvatlash shartlari) qo'shiladi.
Uchinchi tomon komponentlari: `pg` (MIT), `jsPDF` + `jspdf-autotable` (MIT) — `web/vendor/`.
