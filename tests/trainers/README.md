# 3D trenajyorlar sinovlari (07–11)

07 Elektr shit montaji, 08 Avtomat yig'ish, 09 Chastota o'zgartirgich, 10 Reversiv yuritma va 11 Uy elektr shiti
uchun funksional va tezlik sinovlari. Trenajyor fayllariga tegilmaydi: sahifa haqiqiy Chromium'da ochiladi va
sichqoncha yoki barmoq bilan boshqariladi.

```bash
cd tests/trainers
npm install
npm test                 # funksional sinovlar (golden/*.json bilan solishtirish), ~15 daqiqa
npm run measure          # tezlik o'lchovi -> out/measure-*.json va jadval
```

Bir nechta trenajyor uchun: `TRAINERS=shit-montaji,chastota-yigish npm test`,
`node measure.mjs shit-montaji phone 5`.

Brauzer: `CHROMIUM_PATH` yoki `/opt/pw-browsers/chromium`.

## Qanday ishlaydi

- `harness.mjs` — lokal statik server, brauzer, profillar. three.js r128 CDN o'rniga `node_modules/three@0.128.0` dan
  beriladi, shu faylning oxiriga o'lchov qo'shimchasi (probe) qo'shiladi. U har bir ekranga chiziladigan kadr uchun
  draw call, uchburchak va `renderer.render()` vaqtini yozadi. Qisqichlarni bosish uchun HTML'dagi `const T={};` ga
  `window.__T=T;` qo'shib beriladi: bu faqat test serverida, fayl o'zgarmaydi.
- `specs.mjs` — har bir trenajyor uchun kuzatiladigan elementlar, to'g'ri yechim (barcha simlar yoki detallar tartibi)
  va ssenariylar (o'rganish va imtihon rejimlari: noto'g'ri ulanishlarning har bir turi, maslahat, orqaga qaytarish,
  tekshirish, kuchlanish, nosozliklar).
- `run.mjs` — ssenariyni bajaradi. Har bir qadamdan keyin shu qadamda chiqqan holat xabarlarini (aniq matn va
  ohang: ok/bad), qadamlar ro'yxatini, hisobotni va tugmalar holatini yozib oladi.
- `functional.test.mjs` — natijani `golden/<trenajyor>.json` bilan to'liq solishtiradi. Golden fayllar 2-bosqichda
  eski (ko'chirishdan oldingi) kod bo'yicha yozilgan. Ko'chirishdan keyin ular o'zgarmasligi kerak.
  Ataylab qayta yozish uchun: `UPDATE_GOLDEN=1 npm test`. Buni faqat xulq-atvor o'zgarishi tasdiqlanganda qiling.
- `measure.mjs` — tezlik o'lchovi (sinov emas). Qaysi ko'rsatkich nimani anglatishi fayl boshida yozilgan.

Natijalar: `docs/trainer-baseline.md`.

## Cheklovlar

- Brauzer dasturiy GPU'da (SwiftShader) ishlaydi. Shuning uchun ms qiymatlari "oldin/keyin" solishtirish uchun yaraydi,
  telefondagi haqiqiy vaqtni ko'rsatmaydi. Draw call va uchburchak sonlari esa GPU'ga bog'liq emas.
- Ovoz va telefonda haqiqiy barmoq bilan boshqarish (pinch, sudrash) avtomatik tekshirilmaydi. Ularni qo'lda
  tekshirish kerak.
