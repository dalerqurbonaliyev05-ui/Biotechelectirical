# HEMIS bilan integratsiya

## Hozir ishlaydigan yo'l: fayl orqali (CSV/Excel)

HEMIS'dan talabalar ro'yxatini Excel/CSV qilib yuklab oling va Amaliyot rahbari panelida «Talabalar» bo'limiga joylashtiring
(docs/ADMIN.md). Bu yo'l HEMIS'dan hech qanday ruxsat talab qilmaydi va **to'liq sinalgan**.
Jadval ustunlari: `HEMIS ID` (6–20 raqam), `F.I.SH`, `Guruh`, `Kurs`; ixtiyoriy `Fakultet`, `Yo'nalish`, `Kafedra`.

## Avtomatik yo'l: HEMIS REST API (ixtiyoriy, **HAQIQIY HEMIS'da sinalmagan**)

`server/src/hemis.js` HEMIS ochiq API hujjatlaridagi shaklga moslab yozilgan:
`GET {HEMIS_API_URL}/data/student-list?page=N&limit=200` + `Authorization: Bearer {token}`, javob `{ data: { items: [...], pagination: { pageCount } } }`,
talaba maydonlari: `student_id_number`, `full_name` (yoki `second_name/first_name/third_name`), `group.name`, `level.code|name`, `department.name`, `specialty.name`.
Portal HEMIS'ga **faqat o'qish so'rovlarini** yuboradi, HEMIS'ga hech narsa yozmaydi.

Ulash:
```sh
# .env ga: HEMIS_API_URL=https://student.universitet.uz/rest/v1   HEMIS_API_TOKEN=...   HEMIS_UNIVERSITY="Universitet nomi"
docker compose up -d
docker compose exec app node src/cli.js hemis-sync --dry-run                      # faqat ko'rish, bazaga yozmaydi
docker compose exec app node src/cli.js hemis-sync --codes-out /data/kodlar.csv   # yozish + yangi kodlar CSV
```
Muntazam yangilash uchun `hemis-sync` ni cron'dan kechasi ishga tushirish mumkin. Qayta ishga tushirish xavfsiz: mavjud talabalar yangilanadi,
faollashgan talabalarga kod berilmaydi, mavjud (muddati o'tmagan) kodlar o'zgarmaydi.

**Maydon nomlari boshqacha bo'lsa** faqat `mapHemisStudent` funksiyasini o'zgartirish yetadi. Sinovlar (`server/test/hemis.test.js`) soxta server bilan o'tkaziladi.

## HEMIS administratoriga savollar (topshirishdan oldin aniqlang)

1. Universitetimiz HEMIS'ida tashqi tizim uchun API token berish mumkinmi? Qaysi manzil (`student.<univ>.uz/rest/v1`?) va qaysi ruxsatlar (faqat `student-list` o'qish)?
2. Token muddati, almashtirish tartibi? IP bo'yicha cheklov bormi (portal serverining IP'si ro'yxatga qo'shilishi kerakmi)?
3. `student-list` javobida kurs (`level`), guruh, fakultet, yo'nalish maydonlari qaysi nomda? Talaba holati (o'qiydi / akademik ta'til / chetlashtirilgan) bo'yicha filtr (`HEMIS_QUERY`) qanday?
4. Talabalar uchun HEMIS orqali yagona kirish (OAuth/SSO) bormi? Bo'lsa — hujjati va ro'yxatdan o'tish tartibi (hozir portal o'z parol tizimidan foydalanadi; SSO ulash alohida ishdir).
5. Shaxsiy ma'lumotlarni boshqa tizimga uzatish uchun qanday kelishuv/ruxsatnoma kerak (Vazirlik/universitet ichki qoidalari)?
6. Portal HEMIS ma'lumotlar bazasiga to'g'ridan-to'g'ri ulanishi **tavsiya etilmaydi** (xavfsizlik, ma'lumotlar tuzilmasi o'zgarishi); faqat rasmiy API yoki fayl.
