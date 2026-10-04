# Fizika — o‘quvchi va abituriyentlar uchun ilova

Android ilova (Capacitor) + Supabase. Bitta kirish (Google), ikki xil panel: **maktab o‘quvchisi** (6–11-sinf) va **abituriyent**. Alohida **admin panel** (`admin.html`).

## Nimalar bor

| Bo‘lim | Tarkibi |
|---|---|
| Savollar bazasi | 3 699 ta savol: Milliy sertifikat to‘plami (745 variantli + 12 moslashtirish + 59 ochiq a/b, 6 ta haqiqiy imtihon 2024–2025), 6–11-sinf darsliklari bob testlari (~400), M. Usmonov fiz-mat to‘plami (1 443), M. Usmonov boshlang‘ich to‘plami (923 ta javobini o‘zi yozadigan masala), darsliklar asosida tuzilgan 105 ta savol |
| O‘quvchi paneli | O‘z sinfi testlari (10/20/30), mavzular bo‘yicha testlar, kunlik test, darajalar (Kvark → Koinot), XP, tangalar, seriya, nishonlar, sovg‘alar do‘koni (avatar, unvon, chop etiladigan faxriy yorliq) |
| Abituriyent paneli | 20/30/50 talik variantlar, kunlik test (osondan qiyinga, hamma uchun bir xil), mavzular bo‘yicha mashq, ochiq savollar |
| Milliy sertifikat (ikkala panelda) | 45 topshiriq formati (1–32 yopiq, 33–35 moslashtirish, 36–45 ochiq a/b), 150 daqiqa taymer, 6 ta haqiqiy imtihon, aralash sinov varianti, taxminiy ball (75 dan) va daraja |
| Laboratoriya | Sxema yig‘ish (elektr zanjir, ampermetr/voltmetr, Om qonuni), richag, Arximed, nishonga otish, linza tasviri, mayatnik, formula juftliklari, formula yig‘ish, birliklar poygasi, masala mashinasi (har safar yangi sonlar) |
| Reyting | O‘zbekiston / viloyat / sinf bo‘yicha, umumiy va haftalik, viloyatlar reytingi |
| Admin panel | Statistika, savollarni qidirish/tahrirlash/tasdiqlash/o‘chirish, bazani yuklash, JSON/CSV import, xatolik xabarlari, foydalanuvchilar (admin qilish, bloklash), sovg‘alar, e’lonlar |

Baholash serverda bajariladi (javoblar test tugaguncha mijozga yuborilmaydi), XP va tangalarni foydalanuvchi o‘zi o‘zgartira olmaydi.

## Tuzilishi va yig‘ish

- **Android ilova** (asosiy): Capacitor. `NATIVE=1 node build.mjs` → `dist-native/`, so‘ng `npx cap add android`, `node mobile/prepare-android.mjs`, `npx cap sync android`, `./gradlew assembleRelease`. Buni GitHub Actions o‘zi bajaradi: `.github/workflows/fizika-apk.yml` (`fizika-src/` o‘zgarganda yoki qo‘lda ishga tushirilganda). Tayyor APK `fizika/apk/fizika.apk` ga yoziladi.
- **Admin panel** (veb): `node build.mjs` → `dist/`, `bash mobile/deploy-admin.sh` → `fizika/admin/` (https://www.energyvibe.uz/fizika/admin/). Workflow buni ham yangilaydi.
- Google bilan kirish Android’da tizim brauzerida ochiladi va `uz.energyvibe.fizika://auth` orqali ilovaga qaytadi. Supabase → Authentication → URL Configuration → Redirect URLs ga qo‘shilishi shart: `uz.energyvibe.fizika://**` (ilova) va `https://www.energyvibe.uz/fizika/**` (admin panel).
- Supabase sxemasi: `supabase/fizika_setup.sql`. Savollar bazasi admin paneldagi «Bazani yuklash» bilan yuklanadi.

## Demo rejim
`?demo=1` qo‘shilsa yoki `config.js` da Supabase ma’lumoti bo‘lmasa, ilova Supabase’siz ishlaydi: natijalar faqat shu brauzerda saqlanadi, reytingda namuna foydalanuvchilar ko‘rsatiladi.

## Fayllar
```
src/main.jsx            ilova (o‘quvchi + abituriyent)
src/admin/main.jsx      admin panel
src/screens/            ekranlar: bosh sahifa, testlar, milliy, reyting, profil
src/games/              laboratoriya o‘yinlari
src/lib/remote.js       Supabase (RPC) qatlami;  src/lib/local.js — demo rejim
src/data/formulas.js    6–11-sinf formulalari va doimiylar
public/data/bank.json   savollar bazasi;  public/fig/ — savol rasmlari
supabase/fizika_setup.sql  to‘liq sxema + funksiyalar + mavzular/nishonlar
```

## Eslatmalar
- Usmonov fiz-mat to‘plami skanerlangan kitobdan olingan; tanlab tekshirilganda javoblar asosan to‘g‘ri chiqdi, lekin bu savollar admin panelda “tekshirilmagan” deb belgilangan. Kunlik testga faqat tekshirilgan savollar tushadi.
- Uzoqov to‘plamida javoblar “alohida qog‘ozda” berilgan, PDF ichida javob kaliti yo‘q — shuning uchun bazaga kiritilmadi. Admin panel orqali javoblari bilan qo‘shish mumkin.
- Milliy sertifikat bali taxminiy: haqiqiy imtihonda Rasch modeli ishlatiladi.
