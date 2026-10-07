# Tuzilma va xavfsizlik

## 1. Umumiy tuzilma

```
Brauzer ──HTTPS──> [teskari proksi: Caddy/nginx] ──> Node.js serveri ──> PostgreSQL
 (web/*.html, js)                                      │  └─ rasm fayllari: DATA_DIR/photos/
                                                       └─ statik sahifalar (web/)
```
- **Bitta jarayon**: server ham API, ham sahifalarni beradi. Tashqi CDN, shrift, analitika, bulut xizmati **yo'q**
  (sinov bilan tekshirilgan: sahifa ochilganda o'z serveridan boshqa manzilga so'rov ketmaydi).
- **Yagona tashqi kutubxona**: `pg` (PostgreSQL drayveri). Parol xeshlash (scrypt), JWT (HS256), HMAC — Node.js ichki `crypto` moduli.
- **Brauzer**: build bosqichi yo'q; PDF uchun `jsPDF` (vendor/ papkada, nusxasi loyihada).
- **Baza**: 15 ta jadval (`db/migrations/001_schema.sql`). Ilova ma'lumotlari + 4 ta maxfiy jadval (parol xeshlari, sessiyalar,
  faollashtirish kodlari, audit).

## 2. So'rov qanday ishlaydi

1. Foydalanuvchi `POST /api/auth/login` → server parolni tekshiradi, **access token** (JWT, 30 daqiqa) va **refresh token**
   (tasodifiy, bazada faqat SHA-256 xeshi) beradi.
2. Sahifalar ma'lumotni `POST /api/db` orqali oladi (tuzilmali JSON: jadval, amal, filtrlar). Server uni **parametrli SQL**ga
   aylantiradi (jadval/ustun nomlari bazadagi ro'yxatdan tekshiriladi, qiymatlar doim parametr) va **foydalanuvchi huquqi
   bilan** bajaradi: `SET LOCAL ROLE authenticated` + JWT da'volari. Shu paytdan boshlab har qanday qatorga ruxsatni
   **PostgreSQL RLS qoidalari** hal qiladi, serverdagi kod emas.
3. Parol, sessiya, faollashtirish kodi, import, audit — faqat serverning ichki (`service`) roli orqali; bu jadvallar
   oddiy foydalanuvchi roliga umuman berilmagan.

## 3. Himoya qatlamlari

| Qatlam | Nima qiladi |
|---|---|
| Server | Kirish, sessiyalar, so'rovlar chegarasi, kirish hajmi chegaralari, rol tekshiruvi (admin/amaliyot rahbari amallari), audit |
| PostgreSQL RLS | Har bir jadval uchun qator darajasidagi qoidalar: talaba faqat o'zinikini, RES rahbari davomatni yozadi, tasdiqni faqat RES rahbari/admin beradi va hokazo. **Serverda xato bo'lsa ham** foydalanuvchi ruxsatsiz qatorga yeta olmaydi |
| Maxfiy jadvallar | `credentials`, `sessions`, `activation_codes`, `audit_log` — `authenticated` roliga berilmagan (RLS yoqilgan, siyosat yo'q) |
| Brauzer | Qat'iy CSP (`script-src 'self'`; inline skript yo'q), barcha matnlar HTML-escape qilinadi (XSS sinovi bor), `X-Frame-Options: DENY`, `nosniff`, `no-referrer` |

### Parollar va sessiyalar
- Parol: **scrypt** (N=16384, r=8, p=1), har bir parol uchun tasodifiy tuz; 8–72 belgi.
- Mavjud bo'lmagan login uchun ham xuddi shu hisob-kitob bajariladi (vaqt farqi orqali loginlarni aniqlab bo'lmaydi);
  javob matni bir xil: «Login yoki parol noto'g'ri».
- Hisob bloki: 10 ketma-ket xato → 15 daqiqa. Kirish yo'llari uchun IP bo'yicha chegara (daqiqada 20).
- Refresh token **aylanadi** (har safar yangisi); eskisi qayta ishlatilsa (o'g'irlash belgisi) foydalanuvchining hamma sessiyasi yopiladi va audit yoziladi.
  Parallel yangilash uchun 30 soniyalik kechirim oynasi bor.
- Parol almashtirish: joriy parol shart, boshqa qurilmalardagi sessiyalar yopiladi. Administrator tiklagan parol — vaqtinchalik, almashtirish majburiy.
- JWT: faqat HS256 (`alg:none` va boshqa algoritmlar rad etiladi), muddati tekshiriladi. **Rol va faollik JWT'dan emas, har so'rovda bazadan** olinadi
  (≤3 soniya kesh): faolsizlantirilgan foydalanuvchi deyarli darhol chiqib ketadi.
- «Meni eslab qol» belgilanmasa token `sessionStorage`da (oyna yopilsa o'chadi), belgilansa `localStorage`da (30 kun).

### Faollashtirish kodlari
8 belgi (taxminan 40 bit), `crypto.randomInt` bilan, bazada faqat **HMAC-SHA256(pepper)** xeshi (baza sizib chiqsa ham kodni topib bo'lmaydi: kalit serverda).
30 kun amal qiladi, 5 urinish, urinish **alohida tranzaksiyada** sanaladi (parallel so'rovlar bilan aylanib o'tib bo'lmaydi; 20 parallel so'rov sinovi bor).
Hisob, kod belgisi va talabaga bog'lash bitta tranzaksiyada. «ID yo'q» va «kod xato» javoblari bir xil.

### Rasmlar
Serverning diskida (`DATA_DIR/photos/<talaba_id>/<sana>/<uuid>.jpg`), papka ruxsati 0700. Yuklash: faqat o'z papkasiga, 5 MB gacha, **fayl mazmuni** tekshiriladi
(JPEG/PNG/WebP "magic bytes"; kengaytma bilan mos bo'lishi shart), mavjud faylni ustiga yozib bo'lmaydi. O'qish: faqat bazadagi `photos` qatoriga (RLS orqali) ruxsati bor
foydalanuvchiga **imzolangan vaqtinchalik havola** (HMAC, 1 soat) beriladi.

### Tasdiq va pechat
RES rahbari tasdiqlaganda davomat (hisobotda rasmlar ro'yxati ham) SHA-256 xeshi saqlanadi. PDF'ga pechat/imzo faqat tasdiqlangan **va keyin o'zgarmagan** ma'lumotga tushadi.
Hujjat kodi (`ID-xesh`) orqali haqiqiyligi tekshiriladi.

## 4. Ma'lum cheklovlar (halol ro'yxat)

1. **Pechat/imzo grafik belgi**, elektron raqamli imzo (ERI/E-IMZO) emas. Rasmiy ERI kerak bo'lsa, qo'shimcha integratsiya (ERI kutubxonasi/xizmati) kerak.
2. **Bitta server**: so'rovlar chegarasi va 3 soniyalik profil keshi jarayon xotirasida. Bir nechta nusxa ishga tushirilsa, chegara har nusxada alohida hisoblanadi (teskari proksida ham chegara qo'ying). Katta yuklama uchun gorizontal masshtablash rejalashtirilmagan (bir universitet doirasida ortig'i bilan yetarli).
3. **Ikki bosqichli autentifikatsiya (2FA) yo'q**; parol e-pochta/SMS orqali tiklanmaydi (administrator/amaliyot rahbari tiklaydi). Talaba parollari uchun «eng ko'p ishlatiladigan parollar» ro'yxati tekshirilmaydi (faqat uzunlik).
4. **Hisobni bloklash orqali xizmatni to'xtatish**: begona odam boshqa foydalanuvchi loginini bilsa, uni 15 daqiqaga bloklay oladi (10 xato urinish bilan). Bu parol terib topishdan himoyaning ma'lum evazi; audit jurnalida «Kirish muvaffaqiyatsiz» yozuvlari ko'rinadi.
5. **TLS serverning o'zida yo'q** — teskari proksi (Caddy/nginx) yoki tashkilotning o'z shlyuzi ta'minlaydi. HTTPS'siz ishlatmang.
6. Server `service` roli (RLS'ni chetlab o'tadigan) bilan ham bog'lana oladi (parol/sessiya amallari uchun). Shuning uchun serverdagi kod xatosi/inyeksiyasi ma'lumotlar bazasini ochishi mumkin; shlyuz jadval/ustun nomlarini ro'yxatdan tekshiradi va qiymatlarni parametrlaydi (inyeksiya sinovlari bor), lekin bu **mustaqil xavfsizlik auditi o'rnini bosmaydi**.
7. **Mustaqil penetratsion sinov o'tkazilmagan.** Vazirlikka topshirishdan oldin o'tkazish tavsiya etiladi (docs/HANDOVER.md).
8. CSP `style-src` da `'unsafe-inline'` qoldirilgan (sahifalardagi `style=` atributlari uchun); skriptlar uchun yo'q.
9. Rasm saqlash — mahalliy disk. Ko'p serverli muhitda umumiy fayl tizimi (NFS) yoki S3 mos xizmat kerak bo'ladi (`storage.js` bitta fayl, almashtirish oson).
10. Shaxsiy ma'lumotlar (F.I.SH, HEMIS ID, guruh) — O'zbekiston «Shaxsga doir ma'lumotlar to'g'risida»gi qonuni talablari (saqlash joyi, kelishuv, muddat) tashkilot tomonidan alohida ko'rib chiqilishi kerak; bu hujjat huquqiy maslahat emas.

## 5. Sinovlar
- `server/test`: 60 ta (kirish, blok, refresh aylanishi va qayta ishlatish, parol almashtirish, faollashtirish va parallel hujum, RLS rollar matritsasi, shlyuz inyeksiya urinishlari, import, rasm yuklash/havola, xavfsizlik sarlavhalari, yo'l o'tish, so'rovlar chegarasi, HEMIS xaritasi).
- `tests/e2e`: 48 ta brauzer sinovi (haqiqiy Chromium + server + PostgreSQL): hamma rollar uchun to'liq oqimlar, PDF mazmuni, XSS, CSP, tashqi so'rovlarning yo'qligi, sessiya saqlash.
