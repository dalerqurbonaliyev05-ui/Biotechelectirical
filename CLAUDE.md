# EnergyVibe (energyvibe.uz) — loyiha qoidalari

Statik sayt (HTML/CSS/JS, bundler yo‘q), Vercel'da joylashgan. Bosh sahifa: `index.html`, `style.css`, `script.js`
(menyu va uz/ru/en tarjimalari `script.js` dagi `I18N` obyektida, til kaliti `energyvibe-lang`).

## Laboratoriya bo‘limi (`/laboratoriya/`)

- Kod: `laboratoriya/` papkasi. Dvigatel `laboratoriya/engine/`, sxemalar `laboratoriya/schemes/*.json`,
  qo‘llanma `laboratoriya/docs/sxema-qoshish.md`.
- Har bir sxema = bitta JSON fayl + `schemes/royxat.json` dagi id. Sxema uchun alohida sahifa kodi yozilmaydi.
- three.js loyiha ichida: `laboratoriya/vendor/three/` (0.160.0), importmap orqali ulanadi.
- Sinovlar: `node --test tests/laboratoriya/*.test.mjs`.

### QAT’IY QOIDA: yangi sxema faqat egasining aniq buyrug‘i bilan

**Yangi sxema, modul yoki "Tez orada" kartochkasi FAQAT sayt egasi aniq «qo‘sh» deb buyruq berganda qo‘shiladi.**
O‘z tashabbusi bilan, "namuna uchun" yoki boshqa vazifa bilan birga sxema qo‘shilmaydi.
Hozir katalogda faqat bitta sxema bor: `yoritish-01` (Yoritish 1: bir klavishali kalit orqali lampani boshqarish).

### Boshqa qoidalar

- "Vositalar" bo‘limidagi eski trenajorlarga (`shit-montaji/`, `avtomat-yigish/`, `uy-elektr-shiti/` va h.k.)
  tegilmaydi, ular laboratoriyaga ko‘chirilmaydi — egasi alohida so‘ramaguncha.
- Laboratoriya ustidagi ish `laboratoriya` branch'ida olib boriladi, `main`'ga merge qilinmaydi
  (egasi Vercel preview'da tekshirib, o‘zi qaror qiladi).
