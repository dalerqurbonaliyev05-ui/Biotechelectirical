# Elektr muhandisi: bir ish kuni

Elektr ta'minoti yo'nalishi talabalari uchun **o'zbek tilidagi, bepul, brauzerda ishlaydigan ta'limiy o'yin**.
Talaba «Texnomash» mashinasozlik zavodida bir ish kuni (08:00–17:00 o'yin vaqti) elektr muhandisi bo'ladi: dvigatellar va tarmoqni asboblar bilan o'lchaydi, **sababni aniqlaydi**, xavfsiz tarzda ta'mirlaydi, iqtisodiy jihatdan **asoslangan qaror** qabul qiladi va energiya tejash taklifini beradi.

> ⚠️ Barcha raqamlar, narxlar, tariflar va chegaralar **o'quv maqsadidagi namunaviy (soddalashtirilgan)** qiymatlar. Ular PUE, PTE, PTB kabi me'yoriy hujjatlar o'rnini bosmaydi. Qiymatlarni `data/config.json`, `data/equipment.json`, `data/faults.json` da o'zgartiring va **elektr ta'minoti fani o'qituvchisi bilan tekshirib chiqing**.

## Ishga tushirish

Build qadami yo'q: sof HTML + CSS + JavaScript (ES modullari).

**Muhim:** brauzer xavfsizligi tufayli ES modullari va JSON ma'lumotlari `file://` orqali (faylni ikki marta bosib) ochilganda yuklanmaydi. Mahalliy server kerak:

```bash
cd muhandis-oyini
python3 -m http.server 8080      # yoki: npx serve .
# brauzerda: http://localhost:8080
```

Sahifa `file://` da ochilsa, buni o'zbekcha tushunarli xabar bilan ko'rsatadi.

## Joylashtirish (deploy)

Barcha yo'llar nisbiy, shuning uchun papkani istalgan joyga qo'yish mumkin:

- **Vercel:** papkani alohida loyiha sifatida (Root Directory = `muhandis-oyini`, Framework = Other, build yo'q) yoki mavjud saytingizning `/muhandis-oyini/` yo'liga joylang. Bu repozitoriyda `vercel.json` ga `/muhandis-oyini` → `/muhandis-oyini/` yo'naltirishi qo'shilgan (nisbiy yo'llar ishlashi uchun oxiridagi `/` kerak).
- **GitHub Pages:** `muhandis-oyini` papkasi tarkibini branch (yoki `/docs`) ga qo'ying, Settings → Pages dan yoqing. Saytingiz `https://<user>.github.io/<repo>/muhandis-oyini/` da ochiladi.
- Boshqa statik hosting (Netlify, nginx, Apache): papkani ko'chirish yetarli.

## O'ynash

1. **Bosh menyu:** yangi smena (qiyinlik: Oson / Oddiy / Qiyin; Kunlik smena yoki Mashq rejimi — barcha 15 topshiriq), davom ettirish (`localStorage`), «Qanday o'ynaladi», sozlamalar (ovoz — standart o'chiq, matn o'lchami).
2. **Smena boshlanishi:** bosh energetikdan topshiriqlar. Birinchi marta tutorial (T0) bor.
3. **Xarita:** binoni bosing yoki klaviaturada ←↑→↓ + Enter (M — xarita, T — topshiriqlar, Esc — oynani yopish). Yurish o'yin vaqtini sarflaydi.
4. **Uskuna paneli:** shildik (nominal ma'lumot), asboblar (tok qisqichi, multimetr, megommetr, termovizor, vibratsiya, ko'zdan kechirish, quvvat analizatori), o'lchov jurnali. Har bir o'lchov vaqt sarflaydi, ortiqcha o'lchov ballni kamaytiradi.
5. **Tashxis:** sababni tanlang. **Qaror:** ta'mirlash / almashtirish / yuklamani kamaytirish / kuzatuv — iqtisodiy panel bilan.
6. **Xavfsizlik:** ta'mirdan oldin ketma-ketlikni to'g'ri bajaring (kritik buzish — «Baxtsiz hodisa»). Megommetr faqat o'chirilgan va kuchlanishi tekshirilgan uskunada.
7. **Smena yakuni:** ball, daraja (Stajyor / Elektrik / Muhandis / Katta muhandis), 4 toifa, xatolar tahlili, yutuqlar va chop etishga mos «Ish kuni dalolatnomasi».

Topshiriqlar: T0 tutorial + M1–M4, P1–P3, N1–N3, V1–V3, E1–E2 (15 ta). Har birida yashirin sabab smena boshida tasodifiy (seed bilan) tanlanadi; **smena kodi** (seed) bir xil holatni takrorlash imkonini beradi.

## Papkalar

```
index.html
css/style.css
js/
  sim/    sof hisob-kitob (DOM yo'q): elektr formulalari, issiqlik, uskuna holati, zavod yuklamasi, o'lchov asboblari,
          iqtisod, energiya profillari, xavfsizlik ketma-ketligi, ball
  game/   o'yin holati, vaqt, topshiriqlar, qarorlar, hisobot, saqlash
  ui/     xarita, panellar, dialoglar, Canvas grafik, chop etish sahifasi
data/     config.json, equipment.json, faults.json, tasks.json, energy.json, safety.json, i18n.uz.json
tests/    Node testlari (node:test)
docs/GDD.md   o'yin dizayn hujjati
```

## Kodsiz kengaytirish

- **Yangi topshiriq:** `data/tasks.json` ga yozuv qo'shing (`symptom` = `faults.json` dagi alomat).
- **Yangi nosozlik / sabab:** `data/faults.json → symptoms` ga yashirin sabab qo'shing: `patches` (uskuna holatiga o'zgarishlar), `decisive`/`useful` (kerakli asboblar), `fixedBy`/`alsoWorks` (to'g'ri qarorlar), `explain` (izoh). Harakatlar (narx, to'xtash) `actions` da.
- **Yangi uskuna:** `data/equipment.json`.
- **Matnlar:** `data/i18n.uz.json`. **Narx, tarif, chegara, ball og'irliklari:** `data/config.json`.
- Ma'lumotlar yuklanganda tekshiriladi (`validateData`), xato bo'lsa aniq xabar chiqadi.

## Testlar

```bash
cd muhandis-oyini
npm test            # node --test tests/*.test.mjs  (Node 20+)
```

Testlar: tok formulasi (55 kW → ≈102 A), issiqlik modeli, transformator yuklanishi va kuchlanish, iqtisod (tejash, qoplanish, TCO), xavfsizlik qoidalari, ball tizimi, energiya takliflari; hamda **barcha topshiriq × sabab × variant** juftliklarining ideal o'yinda yechilishi, baxtsiz hodisa/jarima stsenariylari, kuyish, saqlash va i18n to'liqligi.

## Qabul qilingan soddalashtirishlar

`docs/GDD.md` oxiridagi «Qabul qilingan taxminlar» bo'limiga qarang (skalyar faza toklari, doimiy cosφ, himoya shikastlanishni to'xtatmaydi va h.k.).
