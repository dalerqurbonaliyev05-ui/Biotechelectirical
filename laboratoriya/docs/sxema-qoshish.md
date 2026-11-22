# Laboratoriyaga yangi sxema qo‘shish

> **Qoida:** yangi sxema faqat sayt egasi aniq «qo‘sh» deb buyruq berganda qo‘shiladi (loyiha ildizidagi `CLAUDE.md`).

Sxema uchun alohida sahifa yoki kod yozilmaydi. Sxema = bitta JSON fayl. Katalog kartochkasi,
`/laboratoriya/<id>` mashq sahifasi, 2D/3D ko‘rinish, simulyatsiya va tekshiruv — barchasini umumiy dvigatel bajaradi.

## Tuzilma

```
laboratoriya/
  index.html, katalog.js        # katalog (/laboratoriya/)
  mashq.html, mashq.js          # mashq sahifasi (/laboratoriya/<id> → vercel.json rewrite)
  lab.css                       # bo‘lim stillari
  engine/
    elements/                   # elementlar kutubxonasi (har biri: 2D belgi + 3D model + klemmalar + xatti-harakat)
    simulator.js                # tugun potensiallari (fazorlar), yuklamalar toki, qisqa tutashuv, holatli elementlar
    checker.js                  # xato turlarini aniqlovchi tekshiruvchi + to‘g‘ri yechim generatori
    state.js                    # umumiy holat (2D va 3D bitta holatni ishlatadi), ball, localStorage
    view2d.js                   # SVG ko‘rinish
    view3d.js                   # three.js ko‘rinish
    i18n.js                     # uz/ru/en matnlar
    ranglar.js                  # sim ranglari va ularning L/N/PE ga mosligi
  schemes/
    royxat.json                 # katalogdagi sxemalar ro‘yxati (tartib = katalogdagi tartib)
    yoritish-01.json …          # har bir sxema — bitta JSON
  vendor/three/                 # three.js 0.160.0 (importmap orqali)
```

## Yangi sxema qo‘shish tartibi

1. `schemes/<id>.json` faylini yarating (`id` — kichik lotin harflari, raqam va chiziqcha: `yoritish-02`).
2. `schemes/royxat.json` dagi `sxemalar` ro‘yxatiga `id` ni qo‘shing.
3. Kerakli element turi kutubxonada bo‘lmasa — quyidagi «Yangi element» bo‘limi bo‘yicha qo‘shing.
4. Tekshiring: `node --test tests/laboratoriya/*.test.mjs` (to‘g‘ri yechim tekshiruvdan o‘tishi kerak —
   yangi sxema uchun ham shunday test qo‘shing) va brauzerda `/laboratoriya/<id>`.

## JSON formati

| Maydon | Ma’nosi |
|---|---|
| `id`, `versiya` | Sxema identifikatori va versiyasi. Versiya o‘zgarsa, talabalarning saqlangan qoralamasi tashlanadi. |
| `yonalish` | `yoritish`, `uy_shiti`, `motorlar`, `rele`, `podstansiya`, `olchash`, `yerga_ulash` |
| `daraja` | 1–5 |
| `vaqt_min` | Taxminiy vaqt (daqiqa) |
| `rejimlar` | `["2d", "3d"]` yoki faqat `["2d"]` |
| `korinish2d` | SVG viewBox: `[x, y, kenglik, balandlik]` |
| `nomi`, `qisqacha`, `topshiriq` | `{uz, ru, en}` matnlar (qisqacha — kartochka uchun) |
| `elementlar` | `[{id, tur, parametr?, pozitsiya2d: [x,y], pozitsiya3d: [x,y,z], burilish3d?, masshtab3d?}]` |
| `togri_ulanishlar` | To‘g‘ri yechimdagi **potensial nuqtalar** (pastga qarang) |
| `maqsad` | Simulyatsiya holatlari va kutilgan natija |
| `xato_qoidalari` | Qaysi xato tekshiruvlari ishlashi (pastga qarang) |
| `maslahatlar` | `{uz: [...], ru: [...], en: [...]}` — ketma-ket beriladi, har biri −10 ball |
| `ranglar` | (ixtiyoriy) rol → ruxsat etilgan ranglar, masalan `{"L": ["jigarrang", "qora", "kulrang"]}` |
| `sahna3d` | `xona` o‘lchamlari, `masshtab`, `kamera` (pozitsiya/nishon), `bezaklar` (masalan `shit_korpus`) |

Klemma manzili: `"<element id>.<klemma id>"`, masalan `"Q1.in"`, `"HL1.markaz"`, `"X1.A2"`.

### `togri_ulanishlar` — klemma raqamlariga bog‘lanmagan

Har bir yozuv — bir potensialda bo‘lishi kerak bo‘lgan qurilma klemmalari:

```json
{"nuqtalar": ["Q1.out", "SA1.L"], "orqali": "X1", "rang": "jigarrang"}
```

- `nuqtalar` — bir-biriga ulanishi kerak bo‘lgan klemmalar.
- `orqali` — ulanish shu taqsimlash qutisi ichida bajarilishi shart (`quti_orqali` qoidasi tekshiradi).
  Qutidagi qaysi blok yoki port ishlatilganining ahamiyati yo‘q: tekshiruvchi potensial nuqtalarni solishtiradi.
- `rang` — «To‘g‘ri javobni ko‘rsatish» tugmasi chizadigan sim rangi.

### `maqsad`

```json
[
  {"holat": {"SA1": {"yoqilgan": true}},  "kutilgan": {"HL1": "yonadi"}},
  {"holat": {"SA1": {"yoqilgan": false}}, "kutilgan": {"HL1": "ochgan"}}
]
```

Har bir holatda barcha avtomatlar yoqilgan (tok berilgan) deb hisoblanadi.

### `xato_qoidalari`

| `tur` | Parametrlar | Nimani tekshiradi |
|---|---|---|
| `ochiq_zanjir` | `yuklama`, `faza_yoli`, `nol_yoli` | Yuklama yonmasa, yo‘l bo‘yidagi nuqtalarni «indikator»dek tekshirib, uzilish joyini aytadi |
| `avtomat_himoyasi` | `avtomat`, `yuklama` | Avtomat o‘chirilganda yuklamada faza qolmasligi |
| `kalit_fazada` | `kalit`, `yuklama` | Kalit fazani uzishi (nolni emas) |
| `faza_markazga` | `lampa` | Faza patronning markaziy kontaktida, rezbada emas |
| `pe_ulangan` | `klemmalar` | PE klemmalari manba PE siga ulangan; N va PE birlashtirilmagan |
| `sim_rangi` | (`ranglar`) | L — jigarrang/qora, N — ko‘k, PE — sariq-yashil |
| `quti_orqali` | `quti` | `orqali` ko‘rsatilgan ulanishlar qutini chetlab o‘tmagan |

Qisqa tutashuv (L–N yoki L–PE) va «kalit lampani boshqarmayapti» har doim tekshiriladi.
Hech qanday aniq xato topilmasa, potensial nuqtalar `togri_ulanishlar` bilan solishtiriladi
(ortiqcha yoki yetishmayotgan ulanish). Yangi qoida turi kerak bo‘lsa — `engine/checker.js` dagi `QOIDALAR`
reestriga funksiya va `engine/i18n.js` ga uch tilda xabar qo‘shiladi.

## Yangi element qo‘shish

`engine/elements/<tur>.js` faylini yarating va `engine/elements/index.js` ga qo‘shing.

```js
export default {
  tur: 'rozetka',
  belgi: 'XS',
  nomi: { uz: 'Rozetka', ru: 'Розетка', en: 'Socket outlet' },
  standart: { tok: 16 },                         // parametrlar (JSON'dagi "parametr" ustidan yoziladi)

  klemmalar: (param) => [                         // xy — 2D da element markaziga nisbatan
    { id: 'L', yorliq: 'L', nomi: {uz: 'faza', ru: 'фаза', en: 'phase'}, xy: [-30, 40], dir2d: [0, 1], maks: 2 },
    // dir2d: simning chiqish yo‘nalishi (null — avtomatik), maks: klemmaga ulanadigan simlar soni, r3d: 3D bosish radiusi
  ],
  boshlangich: (param) => ({}),                   // boshlang‘ich holat; kalitlarda {yoqilgan: false}
  ichki: (holat, param) => [],                    // ichki ulanishlar (yopiq kontaktlar): [['L', 'L1']]

  // Ixtiyoriy xususiyatlar:
  // manba: {L, N, PE}             — tarmoq manbai
  // yuklama: {faza, nol, korpus}  — iste’molchi (lampa)
  // himoya: true                  — qisqa tutashuvda o‘chadigan avtomat
  // bosiladi: true, bosish(h)     — 2D/3D da bosib holatini almashtirish
  // passiv: true, bloklar(param)  — taqsimlash qutisi kabi ulovchi (tekshiruvda hisobga olinmaydi)

  svg({ el, holat, param, yonadi }) { return '<circle class="e-body" r="20"/>'; },   // GOST/IEC belgisi

  model3d(c) {                                     // c: THREE, el, param, xona, mat(), peMat(), quti(), vint(), yorliq()
    const g = new c.THREE.Group();
    // ... primitivlardan model
    return {
      obj: g,
      klemmalar: { L: { pos: [x, y, z], dir: [0, 1, 0] } },   // lokal koordinata va simning chiqish yo‘nalishi
      bosish: [],                                            // bosiladigan meshlar
      yangila(holat, { yonadi }) {},                         // holat o‘zgarganda
    };
  },
};
```

### 2D ko‘rinish uslubi

Ish maydoni qora nuqtali to‘r; qurilmalar old ko‘rinishda oq korpus sifatida chiziladi. `svg()` ichida tayyor sinflardan foydalaning:
`d-body` (oq korpus), `d-face` (old panel), `d-slot`/`d-tog` (richag), `d-brass` (mis klemma plastinasi), `d-quti` (to‘q quti),
`d-wago` (klemma bloki), `d-kolba` (lampa, `on` bilan yonadi), `d-txt`/`d-mini`/`d-katta` (korpusdagi yozuv), `d-lbl` (element ostidagi kulrang nom).
Klemma doirachalarini dvigatel o‘zi chizadi — `klemmalar()` dagi `xy` korpusdagi vint joyiga to‘g‘ri kelsin, `dir2d` sim qaysi tomonga chiqishini bildiradi.
Talaba elementni surib joyini o‘zgartira oladi; JSON'dagi `pozitsiya2d` — boshlang‘ich joy, `korinish2d` — "ekranga sig‘dirish" chegarasi.

Element qo‘shilgach, uni ishlatadigan sxema uchun `tests/laboratoriya/` ga to‘g‘ri yechim va bir nechta xato testi yozing.

## Simulyatsiya (dvigatel v2) va ssenariylar

Simulyator tarmoqni tugunlarga ajratadi (union-find), so‘ng har bir tugun kuchlanishini **kompleks fazor** sifatida
hisoblaydi: L1/L2/L3 — 230 V, 120° siljish bilan; N va PE — 0 V. Yuklamalar (lampa, g‘altak, motor chulg‘ami) —
qarshilik. Holatli elementlar (kontaktor, rele, vaqt relesi, issiqlik relesi, avtomat) qayta-qayta hisoblanib,
barqaror holatga keltiriladi (40 iteratsiya; barqarorlashmasa — «tebranish» xatosi).

- **Qisqa tutashuv**: faza–faza, faza–N yoki faza–PE bitta tugunda. Uni uzadigan eng kichik nominalli avtomat o‘chadi;
  himoyasiz qisqa tutashuv — alohida xato.
- **Kuyish**: g‘altak 1,35·Un dan yuqori kuchlanishda kuyadi (masalan, 230 V g‘altakka 400 V berilsa) va qayta tortilmaydi.
- **Vaqt**: mashq sahifasi har 0,2 s da `vaqtQadam()` chaqiradi — vaqt relesi va taymerlar real vaqtda ishlaydi.

### Sxema JSON'idagi qo‘shimcha maydonlar

| Maydon | Ma’nosi |
|---|---|
| `rejimlar` | `["2d"]` yoki `["2d","3d"]`. 3D model hozircha faqat `yoritish-01` uchun bor. |
| `rang_rejimi` | `"3f"` — uch fazali sxemalar: faza simi uchun jigarrang, qora, kulrang (va boshqaruv zanjiri uchun qizil, sariq, yashil) ruxsat etiladi. |
| `ssenariylar` | Sxemaning ishlashini tekshiruvchi ketma-ketliklar (pastda). |
| `topologiya` | `true` bo‘lsa, aniq xato topilmaganda ulanishlar `togri_ulanishlar` bilan solishtiriladi. Standart: faqat `maqsad` bor sxemalarda (yoritish-01); ssenariyli sxemalarda ishlash bo‘yicha tekshiriladi, shuning uchun boshqacha, lekin to‘g‘ri yig‘ilgan sxema ham qabul qilinadi. |

### `ssenariylar`

```json
"ssenariylar": [{
  "nomi": {"uz": "Ishga tushirish va to‘xtatish", "ru": "Пуск и останов", "en": "Start and stop"},
  "qadamlar": [
    {"kutilgan": {"M1": "toxtagan"}},
    {"amal": "SB2", "qiymat": "bos"},
    {"kutilgan": {"M1": "ishlaydi", "KM1": "tortilgan"}},
    {"kut": 5},
    {"kutilgan": {"M1": "uchburchak", "KM2": "!tortilgan"}}
  ]
}]
```

- Har bir ssenariy boshida barcha avtomatlar yoqiladi.
- `amal` + `qiymat`: `bos` (lahzali tugmani bosib qo‘yib yuborish), `yoq`/`och` (avtomat, kalit), selektor uchun pozitsiya (`"I"`, `"0"`, `"II"`),
  elementning o‘z amallari (`test`, `reset`, `karta`, `suv`, `k1`, …).
- `kut`: sekund — simulyatsiya vaqti oldinga suriladi (vaqt relesi uchun).
- `kutilgan`: element → holat belgisi; oldida `!` — «bu holat bo‘lmasligi kerak».
- Holat belgilari (`engine/i18n.js` dagi `st.*`): `yonadi`, `ochgan`, `ishlaydi`, `toxtagan`, `oldinga`, `teskari`, `yulduz`, `uchburchak`,
  `tortilgan`, `qoyilgan`, `hisoblamoqda`, `ochiq`, `yopiq`, `kuchlanish_bor`, `kuchlanish_yoq`, `tok_bor`, `ishladi`, `normal`, `kuydi`,
  `bosilgan`, `suv_yuqori`, `suv_past`, `karta_bor`, `karta_yoq`, `poz_I`, `poz_0`, `poz_II` va h.k.

### Element API (v2) — qo‘shimcha xususiyatlar

```js
yuklamalar: (h, p) => [{ a: 'A1', b: 'A2', R: 2000, nom: 'galtak' }],   // qarshilik sifatidagi iste’molchilar
kichikR: (h, p) => [['1', '2']],          // nol qarshilikli zanjir (ampermetr, hisoblagich) — tok o‘lchanadi
manba: (h, p, id) => ...,                  // tarmoq manbai (A/B/C fazalar, N, PE)
hisobla(ctx, h, p) {                       // ctx: vaqt, kuchlanish(a,b), fazor(a,b), tok(nom), fazasi(t)
  return { holat: { ...h, tortilgan: true }, natija: { holatlar: ['tortilgan'] } };
},
tugmalar: { bos: 'lahzali' },              // data-amal="bos" → bosib turilganda ishlaydi; 'almash' — har bosishda almashadi
amal(h, qiymat, tugma, p) { ... },          // ssenariy va 2D tugmalar shu orqali holatni o‘zgartiradi
svg({ el, holat, param, yonadi, natija })  // natija — hisobla() qaytargan natija
```

2D'da bosiladigan qism `<g data-amal="...">` bilan belgilanadi. Animatsiya sinflari: `d-aylan` (parrak), `d-yur` (konveyer),
`d-oqim` (suv oqimi), `teskari` — teskari yo‘nalish.

## Natijalar

- Ball: 100 dan boshlanadi; har bir maslahat −10, to‘g‘ri javobni ko‘rish −50, har bir xato tekshiruv −5.
- Natija `localStorage` da `energyvibe-lab-natijalar` kalitida saqlanadi → katalogda «Bajarildi ✓».
- Talabaning chala ishi `energyvibe-lab-qoralama-<id>` da saqlanadi (sahifa yangilansa yo‘qolmaydi).
