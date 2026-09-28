# Elektr tarmoqlari kurs loyihasi — tekshiruvchi sayt

**Nima uchun bu papka?** Talabalar o'z kurs ishlarini tekshirishi uchun static web-sayt qurish uchun tayyor topshiriq va ma'lumotlar to'plami. Butun ishni Claude Code yordamida qilib beradi.

## Qanday ishlatish

1. **`PROMPT.md` faylni ochib o'qing** — Claude Code'ga qanday buyruq berishni tushuntirilgan
2. Terminalni oching, shu papkaga o'ting: `cd kurs-loyihasi-tekshiruvchi`
3. Claude Code'ni ishga tushiring: `claude`
4. `PROMPT.md` dagi promptni copy qilib, birinchi xabar sifatida yuboring
5. Claude Code hamma faylni yozib bo'lgach, `index.html` ni brauzerda ochib tekshiring
6. Yakuniy saytni web-serveringizga (yoki GitHub Pages / Netlify) yuklang

## Fayl tarkibi

| Fayl | Ta'rif |
|------|--------|
| `PROMPT.md` | Claude Code uchun boshlang'ich buyruq |
| `SPEC.md` | To'liq texnik topshiriq (Claude Code o'qiydi) |
| `data/wires.json` | AC/ACO simlar katalogi |
| `data/transformers.json` | Transformatorlar (35/110/220 kV) |
| `data/voltage-regulation.json` | RPN shahobchalari, SK, BK |
| `data/tm-tau-table.json` | Tm↔τ jadvali |
| `data/schemas.json` | 12 sxema, variantlar |

## Kutilayotgan yakuniy sayt

Talaba oqimi:
1. Sxema tanlaydi (masalan Sxema №6)
2. Variantni tanlaydi (masalan B-1) — p/st ma'lumotlari avtomatik yuklanadi
3. Liniya masofalarini (km) kiritadi
4. «Hisoblash» tugmasini bosadi
5. Natijalarni ko'radi (transformatorlar, simlar, quvvat va energiya isrofi, RPN)
6. «DOCX yuklab olish» tugmasi bilan to'liq hisobotni oladi

Sayt sof static (HTML+CSS+JS), server kerak emas.

## Sayt fayllari

| Fayl | Vazifasi |
|------|----------|
| `index.html` | Asosiy sahifa (Bootstrap 5 va docx.js CDN dan) |
| `style.css` | Dizayn, mobil moslashuv, chop etish uslubi |
| `calculations.js` | Sof hisoblash (1–7 bosqichlar), DOM ga bog'liq emas |
| `app.js` | Forma, natijalar jadvallari, SVG chizmalar, yuklab olish |
| `docx-builder.js` | DOCX hisobot (docx.js v8); sxemalar A4 landshaft sahifalarda |
| `schema-components.js` | SVG elementlari: R, X, Q_c/2, tuproq, transformator, Γ/Π-simon sxemalar, strelkalar |
| `schema-layout.js` | Sxemalar uchun avtomatik joylashuv (p/st va generatorlar soniga qarab) |
| `schema-drawer.js` | 1-rasm (prinsipial) va 2-rasm (ekvivalent almashtiruv) sxemalari, zoom/pan, tooltip |
| `data/data-bundle.js` | `data/*.json` ning nusxasi — `index.html` ni ikki marta bosib (file://) ochganda ishlatiladi |
| `tools/bundle_data.py` | JSON tahrirlangandan keyin `data-bundle.js` ni yangilash: `python tools/bundle_data.py` |

Hisoblash algoritmi ToshDTU uslubiy qo'llanmasi (Rasulov A.N. va boshq., 2014) bo'yicha; `data/schemas.json` da 12 sxema × 5 variantning hammasi bor
(qo'llanmaning 1-ilovasidan). Qo'llanma jadvalidagi shubhali qiymatlar `variantlar._ogohlantirishlar` da sanab o'tilgan.

Mahalliy tekshirish: `index.html` ni ikki marta bosib oching yoki `python -m http.server` bilan ishga tushiring.
DOCX yaratish uchun internet kerak (docx.js `cdn.jsdelivr.net` dan yuklanadi).
