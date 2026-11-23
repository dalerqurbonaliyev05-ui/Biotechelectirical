# EnergyVibe (energyvibe.uz) — loyiha qoidalari

Statik sayt (HTML/CSS/JS, bundler yo‘q), Vercel'da joylashgan. Bosh sahifa: `index.html`, `style.css`, `script.js`
(menyu va uz/ru/en tarjimalari `script.js` dagi `I18N` obyektida, til kaliti `energyvibe-lang`).

## Laboratoriya bo‘limi (`/laboratoriya/`)

- Sahifalar: `/laboratoriya/` — bo‘lim bosh sahifasi (simulyatorga kirish tugmalari), `/laboratoriya/simulyator/` — sxemalar
  katalogi (yo‘nalish/daraja/rejim filtrlari, oq mavzu), `/laboratoriya/<id>` — mashq.
- Klemma yorliqlari o‘quvchiga tushunarli bo‘lsin: NO / NC / COM, kirish L1–L3, chiqish T1–T3, A1/A2 (raqamlar faqat izohda).
- Kod: `laboratoriya/` papkasi. Dvigatel `laboratoriya/engine/`, sxemalar `laboratoriya/schemes/*.json`,
  qo‘llanma `laboratoriya/docs/sxema-qoshish.md`.
- Har bir sxema = bitta JSON fayl + `schemes/royxat.json` dagi id. Sxema uchun alohida sahifa kodi yozilmaydi.
- three.js loyiha ichida: `laboratoriya/vendor/three/` (0.160.0), importmap orqali ulanadi.
- Sinovlar: `node --test tests/laboratoriya/*.test.mjs`.

### QAT’IY QOIDA: yangi sxema faqat egasining aniq buyrug‘i bilan

**Yangi sxema, modul yoki "Tez orada" kartochkasi FAQAT sayt egasi aniq «qo‘sh» deb buyruq berganda qo‘shiladi.**
O‘z tashabbusi bilan, "namuna uchun" yoki boshqa vazifa bilan birga sxema qo‘shilmaydi.
Hozir katalogdagi sxemalar (egasi «qo‘sh» deb buyurgan): `yoritish-01..04`, `uy-shiti-01..02`, `motor-01..13`,
`avtomatika-01`, `olchash-01` — jami 21 ta. Hammasi 2D va 3D: `yoritish-01` — qo‘lda sozlangan 3D xona (`sahna3d`),
qolganlari — avtomatik 3D (`engine/view3d-avto.js`). Ro‘yxat: `laboratoriya/schemes/royxat.json`.

### Boshqa qoidalar

- "Vositalar" bo‘limidagi eski trenajorlarga (`shit-montaji/`, `avtomat-yigish/`, `uy-elektr-shiti/` va h.k.)
  tegilmaydi, ular laboratoriyaga ko‘chirilmaydi — egasi alohida so‘ramaguncha.
- Laboratoriya ustidagi ish `laboratoriya` branch'ida olib boriladi, `main`'ga merge qilinmaydi
  (egasi Vercel preview'da tekshirib, o‘zi qaror qiladi).
