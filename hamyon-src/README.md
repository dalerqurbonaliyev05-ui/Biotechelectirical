# Hamyon — shaxsiy mablag'larni boshqarish (Android APK)

Xarajat yozasiz — ilova kategoriya bo'yicha diagramma chizadi va **bugun qancha sarflash va qancha jamg'arish mumkinligini** hisoblab, har kuni eslatadi.

**Texnologiyalar:** React + Vite (ekranlar), Node.js (build), Capacitor (APK), GitHub Actions (yig'ish).
Server va internet kerak emas — ma'lumot telefonning o'zida saqlanadi.

## APK ni qanday olaman

Manba kodi shu repo'dagi `hamyon-src/` papkasida (`.vercelignore` orqali saytga chiqmaydi).

1. `hamyon-src/` ichida o'zgarish `main`ga tushsa, **Actions → "Hamyon APK"** avtomatik ishlaydi (yoki **Run workflow** tugmasi).
2. 5–10 daqiqadan keyin run ichida pastda **Artifacts → Hamyon-apk** chiqadi. Yuklab oling (zip ichida `app-debug.apk`).
3. APK'ni telefonga o'tkazing va oching ("noma'lum manbadan o'rnatish"ga ruxsat bering).
4. Birinchi ochilganda **eslatmalarga ruxsat** so'raladi.

> APK saytga ham, repo'ga ham yozilmaydi — faqat Actions artifact'ida turadi (30 kun).

## Hisob qanday ishlaydi

```
erkin      = jami mablag'  −  maqsadlarga ajratilgan
qolgan     = erkin         −  hali to'lanmagan majburiy to'lovlar
zaxira     = qolgan × jamg'arma ulushi (%)      ← "saqlab qo'yiladi"
kunlik limit = (qolgan − zaxira) ÷ oyning qolgan kunlari
```

- Limitdan kam sarflasangiz, farq **"bugun shuncha jamg'arishingiz mumkin"** deb ko'rsatiladi va eslatma bo'lib keladi.
- Ko'p sarflasangiz, ertangi limit avtomatik kamayadi.
- Majburiy to'lov (ijara, kredit) "To'ladim" bosilganda xarajat bo'lib yoziladi, lekin kunlik limitni buzmaydi.

## Eslatmalar

Telefon ichida (internetsiz) ishlaydi:
- har kuni tanlangan vaqtda — jamg'arma eslatmasi;
- kechqurun — bugun xarajat kiritilmagan bo'lsa;
- har dushanba — haftalik tahlil; har oyning 1-sanasi — maqsadlar tekshiruvi.

Ilova har ochilganda yoki ma'lumot o'zgarganda keyingi 7 kunning eslatmalarini yangilaydi.
Agar ilovani 7 kundan ko'proq ochmasangiz, kunlik eslatmalar tugaydi (haftalik/oylik davom etadi).

## Kompyuterda sinash

```bash
npm install
npm run dev      # brauzerda ko'rish (eslatmalar faqat APK'da ishlaydi)
npm test         # hisob-kitob testlari
```

## Keyingi versiyalar uchun g'oyalar

PIN/barmoq izi · kategoriya limitlari · so'm/dollar · Excel/PDF eksport · Firebase zaxira nusxa.
APK **debug** kalit bilan imzolanadi — shaxsiy foydalanish uchun yetarli. Google Play uchun alohida release kalit kerak bo'ladi.
