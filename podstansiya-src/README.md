# Elektr energetika podstansiyasi simulyatori (`/podstansiya-simulyatori/`)

«Nazariya amaliyot bilan mustahkamlanadi» — talabalar podstansiyada ishlashni o'rganadigan interaktiv
o'quv o'yini: dispetcher buyrug'ini qabul qilish, bir chiziqli sxemani tahlil qilish, kommutatsiyani
to'g'ri tartibda bajarish, blokirovkalar, yerlash, plakatlar, naryad-ruxsatnoma va operativ jurnal.

Next.js 16 (App Router) + TypeScript (strict) + Tailwind CSS 4 + Zustand + Framer Motion + Vitest.
**Serversiz**: hamma narsa brauzerda, progress `localStorage` da. Asosiy sayt build bosqichisiz statik
HTML bo'lgani uchun loyiha `output: "export"` + `basePath: "/podstansiya-simulyatori"` bilan statik
fayllarga yig'iladi va `../podstansiya-simulyatori/` ga ko'chiriladi (`oyinlar-src` → `oyinlar` kabi).

> O'quv simulyatori. Aniq me'yorlar uchun amaldagi qoidalar va yo'riqnomalarga qarang.
> Barcha raqamlar ro'yxati: [`docs/TEKSHIRUV-RO'YXATI.md`](docs/TEKSHIRUV-RO'YXATI.md).

## Ishga tushirish

```bash
cd podstansiya-src
npm install
npm run dev        # http://localhost:3000/podstansiya-simulyatori/
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest: engine, stsenariylar, sxema chizmasi, tekshiruv ro'yxati
npm run docs:tekshiruv  # docs/TEKSHIRUV-RO'YXATI.md jadvallarini data/ dan qayta yozish
npm run deploy     # next build + out/ -> ../podstansiya-simulyatori/ (shu papkani commit qiling)
```

Vercel'ga alohida sozlash shart emas: `podstansiya-simulyatori/` statik papka sifatida beriladi,
`vercel.json` da redirectlar bor, `podstansiya-src/` esa `.vercelignore` orqali saytga chiqmaydi.
CI: `.github/workflows/podstansiya.yml` (lint, typecheck, test, build).

## Tuzilma

```
app/                                   marshrutlar: / (menyu), /stsenariylar, /oyin/[id], /mashqlar, /ensiklopediya, /sozlamalar, /natijalar
src/features/substation-sim/
  engine/        sof TypeScript, UI'ga bog'liq emas, to'liq testlangan
    types.ts         topologiya, holat, amal turlari
    state.ts         boshlang'ich holat
    network.ts       galvanik seksiyalar: kuchlanish, yerlanganlik, iste'molchilar, transformator yuklamasi
    interlocks.ts    blokirovkalar ("bajarilsa nima bo'ladi" tahlili)
    sequence.ts      qadamlar DAG'i: bir nechta to'g'ri tartib, tartib xatolari
    simulator.ts     reduktor: holat + amal → yangi holat, jarimalar, xabarlar
    thermal.ts       moy harorati va izolyatsiya eskirishi (IEC 60076-7 asosida)
    rpn.ts           RPN: kuchlanish, pauza, blokirovka
    parallel.ts      parallel ishlash shartlari va aylanma tok
    faults.ts        6–35 kV yerga tutashuv, 110 kV QT + APV
    events.ts        seed'li RNG, ob-havo, kunlik yuklama grafigi
    journal.ts       operativ jurnal yozuvini tekshirish
    permit.ts        naryad-ruxsatnoma va ish joyi tayyorligi
    blank.ts         kommutatsiya blankasi
    protocol.ts      izolyatsiya sinov protokoli
    timeline.ts      stsenariy vaqt chizig'i (hodisalar, xabarlar)
    alarms.ts        signal paneli holati
    protection.ts    himoyalar: ortiqcha yuklanish, moy harorati, yerga tutashuv, muddatlar
    automation.ts    ABR (zaxirani avtomatik ulash)
    scoring.ts       ball, yulduzlar, uzilish zarari
    markDecoder.ts   transformator markasini o'qish
    quiz.ts          markalar viktorinasi
    minigames.ts     mini-o'yinlar mantig'i (gaz turi, moy xulosasi, ko'rik, termometr, megger)
    scenario.ts      stsenariy sxemasi (turlar)
  data/          BARCHA texnik ma'lumot shu yerda (kodda emas)
    equipment.ts     podstansiya topologiyasi (uskunalar va bog'lanishlar)
    equipment35.ts   35/10 kV podstansiya (S18), layout35.ts — uning chizmasi, topologies.ts — reyestr
    automation.ts    ABR sozlamalari
    layout.ts        sxema chizmasi koordinatalari
    norms.ts         raqamli me'yorlar {value, unit, verify, note, kind}
    rules.ts         qoidalar jiddiyligi, jarimalar, rejimlar, kommutatsiya tartibi
    procedures.ts    tartib bo'yicha qadamlar quruvchilari (rules.ts dan)
    transformers.ts  transformator modellari (pasport)
    loadCurves.ts    yuklama grafiklari, ob-havo ehtimollari
    glossary.ts      atamalar
    markLetters.ts   marka harflari ma'nosi
    minigames.ts     mini-o'yinlar ma'lumoti (gaz turlari, ko'rik nuqtalari)
    scenarios/       SXX.ts — har bir stsenariy, index.ts (reyestr), catalog.ts (S01–S21 ro'yxati)
  store/         Zustand: settings (persist), progress (persist), session (o'yin)
  ui/            sxema, panellar, telefon, hujjatlar, natija, menyu, minigames/ (kechiktirib yuklanadi)
  i18n/uz.ts     barcha interfeys matnlari (o'zbekcha, lotin)
docs/TEKSHIRUV-RO'YXATI.md   tekshirilishi kerak bo'lgan raqam va qoidalar
```

## Rejimlar

| Rejim | Maslahat | Xato harakat |
|---|---|---|
| O'qitish | to'liq: keyingi qadam, maslahat, blokirovka ogohlantirishi | qoidabuzarlik va kritik xato to'siladi, izoh darhol |
| Sinov | cheklangan: qadamlar tartibsiz ko'rsatiladi | kritik xato to'siladi, qoidabuzarlik bajariladi va jarimalanadi |
| Imtihon | yo'q | hech narsa to'silmaydi; kritik xato — stsenariy to'xtaydi; oxirida umumiy tahlil |

## Yangi stsenariy qo'shish

Engine kodini o'zgartirish shart emas.

1. `src/features/substation-sim/data/scenarios/S06.ts` yarating va `ScenarioDef` ni eksport qiling:
   - `situation` (vaqt, ob-havo, yuklama), `initial` (boshlang'ich apparat holatlari, plakatlar, RPN);
   - `messages` — dispetcher xabarlari: `trigger` (`"start"` yoki `{ afterStep }`), `readback` variantlari
     (`correct`, `why`), `isOrder`, `expectsReport`, ixtiyoriy `at` (soatni surish);
   - `steps` — qadamlar: `match` (amal yoki `anyOf` massivi), `after` (oldingi qadamlar — DAG),
     `optional`, `explain`, `hint`. Tipik kommutatsiyalar uchun `data/procedures.ts` quruvchilaridan foydalaning;
   - `goals` (yakuniy holat), `journal`, `allowedOutages`, `analysis`;
   - hujjatlar (ixtiyoriy): `permit` (`PermitSpec`: talab qilinadigan va formadagi variantlar), `blank`
     (`BlankSpec`: `blankStepIds(steps)` + chalg'ituvchi kartalar), `protocol` (`ProtocolSpec`: asbob ko'rsatkichlari).
2. `scenarios/index.ts` dagi `SCENARIOS` ga qo'shing va `catalog.ts` da `playable: true` qiling.
3. `scenarios.test.ts` ga kamida bitta "to'g'ri yo'l" va bitta "kritik xato" testini yozing
   (`engine/testkit.ts`: `run`, `sw`, `journalNow`).
4. Yangi raqam kerak bo'lsa — faqat `data/norms.ts` ga (`verify: true`) va `docs/TEKSHIRUV-RO'YXATI.md` ga.

Yangi uskuna kerak bo'lsa: `data/equipment.ts` (topologiya) va `data/layout.ts` (chizma). `layout.test.ts`
ikkalasining mosligini tekshiradi.

## Dizayn

`docs/reference/infografika.png` (9 ekran maketi) loyihada topilmadi — dizayn topshiriq tavsifidan olingan:
to'q ko'k gradiyent fon, yorqin ko'k aksent, yashil/qizil holat ranglari, yumaloq kartalar. Infografika
qo'shilsa (`podstansiya-src/docs/reference/infografika.png`), ranglar `app/globals.css` dagi `@theme`
tokenlarida moslanadi. Sxemada holat rang bilan birga shakl bilan ham ko'rsatiladi (to'ldirilgan/ochiq
kvadrat, to'g'ri/qiyshiq pichoq, plakat belgilari), apparatlar klaviatura bilan tanlanadi (Tab, Enter).

## Holat va keyingi bosqichlar

Bajarildi (1–3-bosqichlar):
- [x] Poydevor: tuzilma, dizayn tizimi, matnlar fayli, menyu, sozlamalar, saqlash, saytga ulash
- [x] Engine va 100+ unit test
- [x] Interaktiv sxema (zoom/pan, pinch), reja, uskuna paneli, dispetcher telefoni, topshiriq kartasi,
      soddalashtirilgan naryad va operativ jurnal, natija va ball; S01–S05 to'liq o'ynaladi

Qoldi:
- [x] **4-bosqich — hujjatlar**: to'liq naryad-ruxsatnoma (mas'ul shaxslar va guruhlari, brigada, o'chiriladigan
      apparatlar, yerlagichlar, plakatlar, kuchlanish ostidagi qismlar, muddat, dopusk/yakun qaydlari), kommutatsiya
      blankasi (surib-tartiblash, DAG bo'yicha tekshiruv, blanka bo'yicha bajarish), izolyatsiya sinov protokoli,
      hujjatlarni chop etish
- [x] **5-bosqich — S06–S21**: vaqt chizig'i hodisalari (`timeline.ts`), signallar (`alarms.ts`), himoyalar va muddatlar
      (`protection.ts`), ABR (`automation.ts`), qaror/o'lchov/ish/qo'ng'iroq/fazirovka/kutish amallari, ventilyator va RPN
      nosozliklari, parallel ishlash tekshiruvi, yuklamani toifa bo'yicha cheklash, uzilish va shartli zarar hisobi,
      35 kV podstansiya varianti (`equipment35.ts`, `layout35.ts`, `topologies.ts`), S21 — urug' bo'yicha smena;
      UI: signal paneli, qaror kartalari, o'lchov natijalari, moy harorati trendi, «Keyingi voqeagacha»
- [x] **6-bosqich — mini-o'yinlar va ensiklopediya**: obxod (SVG transformator ko'rigi), megger (ulanish, kuchlanish,
      R15/R60, razryadlash — S03 protokoliga ulangan), moy sinovi (namuna, probiv apparati, baholash), gaz relesi
      (rang, yonuvchanlik, xulosa), termometr — `next/dynamic` bilan alohida bo'laklar; stsenariy o'lchovlari
      (S08, S10, S12, S13, S18, S21) mini-o'yin orqali, `/mashqlar` sahifasida mustaqil mashq; `/ensiklopediya` —
      marka dekoderi (`engine/markDecoder.ts`), harflar jadvali, modellar katalogi, viktorina (`engine/quiz.ts`)
- [ ] **7-bosqich**: yutuqlar, ovoz effektlari (sozlama tayyor), glossariy sahifasi (`glossary.ts` tayyor),
      3D transformator (Three.js, ixtiyoriy)
- [ ] **8-bosqich (ixtiyoriy)**: reyting va hisoblar (Supabase yoki Vercel KV)
- [ ] Boshqa tillar (ru/en) — hozir faqat `uz.ts`
