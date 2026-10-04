# /mushuk-it/: Mushuk va Itlarni Top yuklab olish sahifasi

Saytning `style.css` uslubida (`../uyovqat/` kabi), **o'zbek / русский / English** (til tugmalari saytdagi bilan bir xil `energyvibe-lang` kalitini ishlatadi; saqlangan til bo'lmasa brauzer tiliga qaraydi).

| Fayl | Vazifasi |
|---|---|
| `index.html` | sahifa (o'zbekcha matn shu yerda; boshqa tillar `lang.js` dan) |
| `lang.js` | uz/ru/en tarjimalari (`data-i18n` matn, `data-i18n-h` esa `<b>`/`<code>` bilan) |
| `config.js` | APK versiyasi, hajmi (bayt) va SHA-256 |
| `page.css`, `page.js` | uslub, til almashtirish, navigatsiya, reveal |
| `img/{uz,ru,en}-*.webp` | qo'llanma ekran rasmlari |
| `apk/mushuk-it-top.apk` | yuklab olinadigan APK |

## Yangi APK chiqqanda (faqat 2 ta narsa)
1. `apk/mushuk-it-top.apk` ni almashtiring (nomi o'sha-o'sha).
2. `config.js` da `VERSION`, `BYTES`, `SHA256` ni yangilang:
   `sha256sum apk/mushuk-it-top.apk` (PowerShell: `Get-FileHash apk\mushuk-it-top.apk`), hajm: `ls -l apk/mushuk-it-top.apk`.

`vercel.json` da `/mushuk-it/apk/*` uchun `application/vnd.android.package-archive` + `attachment` sarlavhalari va `/mushuk-it` → `/mushuk-it/` yo'naltirishi bor.

## Ekran rasmlarini yangilash
Ilova repo'sida (`mushuk-it-top-app`): `npm run build:test`, so'ng `cd tests && GUIDE_SHOTS=papka npm test` uchala tilda 9 ta ekran rasmini yaratadi; `convert x.png -resize 480x -quality 76 x.webp` bilan siqilib `img/` ga qo'yiladi.

## Reklama videosi

`reklama.mp4` (20 soniya, 720x1280, o‘zbekcha) sahifadagi `#promo` bo‘limida ko‘rsatiladi; poster: `img/promo-poster.webp`.
