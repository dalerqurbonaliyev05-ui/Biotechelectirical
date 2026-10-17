# Tekshiruv ro'yxati — Podstansiya simulyatori

Bu — o'quv ilovasi: noto'g'ri ma'lumot talabaga zarar qiladi. Quyidagi **barcha raqamlar va qoidalar**
o'qituvchi hamda amaldagi PTE, PUE, mehnat muhofazasi qoidalari va mahalliy yo'riqnomalar bilan
solishtirilishi kerak. Har bir qiymat kodda faqat `data/` papkasida saqlanadi va
`{ value, unit, verify, note, kind }` ko'rinishida yozilgan:

- **verify ✅** — tekshirilishi SHART (tipik yoki taxminiy qiymat);
- **kind = norm** — me'yoriy hujjatdan olinishi kerak bo'lgan qiymat;
- **kind = model** — simulyatorning soddalashtirishi (o'yin modeli parametri), lekin u ham real ko'rinishi uchun tekshirilsin.

Qiymatni o'zgartirish: tegishli `data/*.ts` faylida `value` ni tuzating, `note` ga manbani yozing
(masalan: "PTE 5.3.x, 2025-yil tahriri"), tekshirilgan bo'lsa `verify: false` qiling va shu jadvalni yangilang.
1–3-bo'lim jadvallari avtomatik: `npm run docs:tekshiruv` ularni `data/` fayllaridan qayta yozadi ("Holat" ustunidagi belgilaringiz saqlanadi). `npm test` har bir kalit shu faylda borligini tekshiradi.

Holat ustuni — o'qituvchi bilan tekshirgach belgilash uchun: ☐ tekshirilmagan · ☑ tasdiqlandi · ✎ tuzatildi.

## 1. Raqamli me'yorlar va model parametrlari (`src/features/substation-sim/data/norms.ts`)

<!-- AUTO:NORMS:START -->
| Kalit | Qiymat | Birlik | Tur | verify | Izoh / manba | Qayerda ishlatiladi | Holat |
|---|---|---|---|---|---|---|---|
| `NORMS.fanAutoOnOilC` | 55 | °C | norm | ✅ | D sovutishli transformatorda ventilyatorlar avtomatik yoqiladigan moy harorati (yo'riqnomalarda tipik qiymat) | `engine/thermal.ts` | ☐ |
| `NORMS.fanAutoOnLoadFactor` | 1 | × Inom | norm | ✅ | D sovutishda ventilyatorlar avtomatik yoqiladigan yuklama (nominal tok) — tipik qiymat | `engine/state.ts`, `engine/thermal.ts` | ☐ |
| `NORMS.fanOffRatingFactor` | 0.6 | × Snom | model | ✅ | Ventilyatorlar o'chiq bo'lganda D transformatorning issiqlik jihatidan ekvivalent quvvati. TAXMINIY — pasport/ishlab chiqaruvchi ma'lumoti bo'yicha aniqlansin | `engine/thermal.ts` | ☐ |
| `NORMS.agingRefHotSpotC` | 98 | °C | norm | ✅ | Termik yaxshilanmagan qog'oz uchun nisbiy eskirish tezligi 1 bo'lgan harorat (IEC 60076-7) | `engine/thermal.ts` | ☐ |
| `NORMS.agingDoublingK` | 6 | K | norm | ✅ | Har 6 K da eskirish tezligi ikki barobar (Montsinger qoidasi, IEC 60076-7) | `engine/thermal.ts` | ☐ |
| `NORMS.ambientDefaultC` | 25 | °C | model | — | Stsenariy berilmaganda atrof havo harorati | `engine/state.ts` | ☐ |
| `NORMS.rpn110Steps` | 9 | pog'ona (±) | norm | ✅ | 110 kV RPN: ±9 pog'ona (masalan TDN/TDTN-110 seriyasi) | — | ☐ |
| `NORMS.rpn110StepPct` | 1.78 | % | norm | ✅ | 110 kV RPN pog'onasi | — | ☐ |
| `NORMS.rpn35Steps` | 6 | pog'ona (±) | norm | ✅ | 35 kV RPN: ±6 pog'ona (masalan TMN-35 seriyasi; ba'zi turlarida ±8) | — | ☐ |
| `NORMS.rpn35StepPct` | 1.5 | % | norm | ✅ | 35 kV RPN pog'onasi | — | ☐ |
| `NORMS.rpnStepTimeSec` | 6 | s | model | ✅ | RPN mexanizmining bir pog'onaga o'tish vaqti + pauza (simulyatorda keyingi buyruq shu vaqtdan keyin qabul qilinadi). Turiga qarab farq qiladi | `engine/simulator.ts` | ☐ |
| `NORMS.rpnBlockLoadFactor` | 1.2 | × Inom | norm | ✅ | Yuqori tokda RPN blokirovkasi sozlamasi — tipik, himoya sozlamalari kartasi bo'yicha aniqlansin | `engine/rpn.ts` | ☐ |
| `NORMS.loadDropAtNominalPct` | 4 | % | model | ✅ | Nominal yuklamada transformator va shinagacha kuchlanish pasayishi — soddalashtirilgan model | `engine/rpn.ts`, `engine/simulator.ts` | ☐ |
| `NORMS.powerFactor` | 0.9 | cos φ | model | ✅ | Iste'molchilarning o'rtacha quvvat koeffitsienti — model | `engine/simulator.ts`, `engine/state.ts` | ☐ |
| `NORMS.parallelRatioDiffPct` | 0.5 | % | norm | ✅ | Transformatsiya koeffitsientlari farqi chegarasi (PTE/darsliklarda keltiriladigan tipik qiymat ±0,5%) | `engine/parallel.ts` | ☐ |
| `NORMS.parallelUkDiffPct` | 10 | % (nisbiy) | norm | ✅ | Qisqa tutashuv kuchlanishlari uk% farqi chegarasi (o'rtachadan ±10%) | `engine/parallel.ts` | ☐ |
| `NORMS.parallelMaxPowerRatio` | 3 | marta | norm | ✅ | Parallel transformatorlar quvvatlari nisbati chegarasi (1:3) | `engine/parallel.ts` | ☐ |
| `NORMS.voltageDeviationPct` | 10 | % | norm | ✅ | Iste'molchi qisqichlarida ruxsat etilgan kuchlanish og'ishi (O'z DSt / GOST 32144 tipidagi standartlar) — amaldagi standart bo'yicha tekshirilsin | — | ☐ |
| `NORMS.earthFaultMaxDurationMin` | 120 | daq | norm | ✅ | Izolyatsiyalangan neytralli 6–35 kV tarmoqda bir fazali yerga tutashuv bilan ishlash muddati. Manbalarda va mahalliy yo'riqnomalarda turlicha — ALBATTA tekshirilsin | `engine/faults.ts` | ☐ |
| `NORMS.apvSuccessProbability` | 0.7 | ehtimollik | model | ✅ | APV muvaffaqiyatli bo'lish ehtimoli — o'yin modeli parametri (statistik ma'lumot emas) | `engine/faults.ts` | ☐ |
| `NORMS.permitIssuerMinGroup` | 5 | guruh | norm | ✅ | Naryad beruvchining elektr xavfsizligi guruhi — mehnat muhofazasi qoidalari bo'yicha tekshirilsin | `engine/permit.ts` | ☐ |
| `NORMS.permitAdmitterMinGroup` | 4 | guruh | norm | ✅ | Ruxsat beruvchi (operativ xodim) guruhi, 1000 V dan yuqori — tekshirilsin | `engine/permit.ts` | ☐ |
| `NORMS.permitLeaderMinGroup` | 5 | guruh | norm | ✅ | Ishlar rahbari guruhi — tekshirilsin | `engine/permit.ts` | ☐ |
| `NORMS.permitProducerMinGroup` | 4 | guruh | norm | ✅ | Ishlarni bajaruvchi guruhi, 1000 V dan yuqori — tekshirilsin | `engine/permit.ts` | ☐ |
| `NORMS.permitMemberMinGroup` | 3 | guruh | norm | ✅ | Brigada a'zosining eng past guruhi (simulyatorda; qoidalarda II guruhli a'zo ham ruxsat etiladigan holatlar bor) — tekshirilsin | `engine/permit.ts` | ☐ |
| `NORMS.permitBrigadeMinSize` | 2 | kishi | norm | ✅ | Brigada tarkibi: bajaruvchi bilan birga kamida — tekshirilsin | `engine/permit.ts` | ☐ |
| `NORMS.absorptionMin` | 1.3 | R60/R15 | norm | ✅ | Absorbsiya koeffitsientining eng kichik qiymati (moyli transformator o'ramlari, ~10–30 °C) — sinov me'yorlari bo'yicha tekshirilsin | `engine/protocol.ts`, `ui/docs/ProtocolPanel.tsx` | ☐ |
| `NORMS.insulationFactoryRatioMin` | 0.7 | × zavod R60 | norm | ✅ | R60 zavod (pasport) qiymatining kamida shu ulushi bo'lishi (bir xil haroratga keltirilgan) — sinov me'yorlari bo'yicha tekshirilsin | `engine/protocol.ts`, `ui/docs/ProtocolPanel.tsx` | ☐ |
| `NORMS.fireServiceNumber` | 101 | tel. | norm | ✅ | O'zbekistonda yong'in xizmati raqami | — | ☐ |
| `NORMS.actionDurationSec` | switch: 60, verifyDead: 120, checkPosition: 60, poster: 60, permitIssue: 600, admit: 300, finishWork: 300, journal: 120, report: 60, readback: 30, inspect: 30, tap: 0, fans: 30, blankSubmit: 300, protocol: 900 | s | model | — | Har amal simulyatsiya soatini qancha oldinga suradi — o'yin modeli | `engine/simulator.ts` | ☐ |
| `NORMS.protocolValueTolerancePct` | 2 | % | model | — | Protokolga yozilgan qiymat va asbob ko'rsatkichi farqiga ruxsat — o'yin qoidasi | `engine/protocol.ts` | ☐ |
| `NORMS.journalTimeToleranceMin` | 10 | daq | model | — | Jurnal yozuvidagi vaqt va amal vaqti farqiga ruxsat — o'yin qoidasi | `engine/journal.ts` | ☐ |
| `THERMAL.M.R` | 6 | — | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.M.x` | 0.8 | — | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.M.y` | 1.3 | — | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.M.topOilRiseK` | 52 | K | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.M.hotSpotGradientK` | 26 | K | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.M.tauOilMin` | 210 | daq | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.M.topOilMaxC` | 95 | °C | norm | ✅ | Transformatorlarni ekspluatatsiya qilish yo'riqnomalarida (masalan, RD 34.46.501) keltirilgan yuqori qatlam moy harorati chegarasi | `engine/thermal.ts` | ☐ |
| `THERMAL.M.topOilAlarmC` | 85 | °C | model | ✅ | Signal sozlamasi — o'quv uchun tanlangan, mahalliy yo'riqnoma bo'yicha aniqlansin | `engine/thermal.ts` | ☐ |
| `THERMAL.D.R` | 6 | — | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.D.x` | 0.8 | — | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.D.y` | 1.3 | — | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.D.topOilRiseK` | 52 | K | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.D.hotSpotGradientK` | 26 | K | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.D.tauOilMin` | 150 | daq | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.D.topOilMaxC` | 95 | °C | norm | ✅ | Transformatorlarni ekspluatatsiya qilish yo'riqnomalarida (masalan, RD 34.46.501) keltirilgan yuqori qatlam moy harorati chegarasi | `engine/thermal.ts` | ☐ |
| `THERMAL.D.topOilAlarmC` | 85 | °C | model | ✅ | Signal sozlamasi — o'quv uchun tanlangan, mahalliy yo'riqnoma bo'yicha aniqlansin | `engine/thermal.ts` | ☐ |
| `THERMAL.DC.R` | 6 | — | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.DC.x` | 1 | — | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.DC.y` | 1.3 | — | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.DC.topOilRiseK` | 56 | K | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.DC.hotSpotGradientK` | 22 | K | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.DC.tauOilMin` | 90 | daq | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.DC.topOilMaxC` | 75 | °C | norm | ✅ | Transformatorlarni ekspluatatsiya qilish yo'riqnomalarida (masalan, RD 34.46.501) keltirilgan yuqori qatlam moy harorati chegarasi (DC uchun) | `engine/thermal.ts` | ☐ |
| `THERMAL.DC.topOilAlarmC` | 70 | °C | model | ✅ | Signal sozlamasi — o'quv uchun tanlangan | `engine/thermal.ts` | ☐ |
| `THERMAL.Ts.R` | 6 | — | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.Ts.x` | 1 | — | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.Ts.y` | 1.3 | — | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.Ts.topOilRiseK` | 56 | K | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.Ts.hotSpotGradientK` | 22 | K | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.Ts.tauOilMin` | 90 | daq | model | ✅ | IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin | `engine/thermal.ts` | ☐ |
| `THERMAL.Ts.topOilMaxC` | 70 | °C | norm | ✅ | Transformatorlarni ekspluatatsiya qilish yo'riqnomalarida (masalan, RD 34.46.501) keltirilgan yuqori qatlam moy harorati chegarasi (Ts — sovutgichga kirishdagi moy) | `engine/thermal.ts` | ☐ |
| `THERMAL.Ts.topOilAlarmC` | 65 | °C | model | ✅ | Signal sozlamasi — o'quv uchun tanlangan | `engine/thermal.ts` | ☐ |
<!-- AUTO:NORMS:END -->

## 2. Transformator pasport ma'lumotlari (`data/transformers.ts`)

<!-- AUTO:TRANSFORMERS:START -->
| Kalit | Qiymat | Birlik | verify | Izoh | Holat |
|---|---|---|---|---|---|
| `TDTN-25000/110.ratedMva` | 25 | MVA | ✅ | Ma'lumotnoma/katalogdagi tipik qiymat — aniq transformator pasporti bo'yicha tekshirilsin | ☐ |
| `TDTN-25000/110.hvKv` | 115 | kV | ✅ | Ma'lumotnoma/katalogdagi tipik qiymat — aniq transformator pasporti bo'yicha tekshirilsin | ☐ |
| `TDTN-25000/110.mvKv` | 38.5 | kV | ✅ | Ma'lumotnoma/katalogdagi tipik qiymat — aniq transformator pasporti bo'yicha tekshirilsin | ☐ |
| `TDTN-25000/110.lvKv` | 11 | kV | ✅ | Ma'lumotnoma/katalogdagi tipik qiymat — aniq transformator pasporti bo'yicha tekshirilsin | ☐ |
| `TDTN-25000/110.vectorGroup` | Yn/Yn/Δ-0-11 | — | ✅ | Ma'lumotnoma/katalogdagi tipik qiymat — aniq transformator pasporti bo'yicha tekshirilsin | ☐ |
| `TDTN-25000/110.ukPct` | hv-mv: 10.5, hv-lv: 17.5, mv-lv: 6.5 | % | ✅ | Ma'lumotnoma/katalogdagi tipik qiymat — aniq transformator pasporti bo'yicha tekshirilsin | ☐ |
| `TDTN-25000/110.noLoadLossKw` | 28.5 | kVt | ✅ | Ma'lumotnoma/katalogdagi tipik qiymat — aniq transformator pasporti bo'yicha tekshirilsin | ☐ |
| `TDTN-25000/110.loadLossKw` | 140 | kVt | ✅ | Ma'lumotnoma/katalogdagi tipik qiymat — aniq transformator pasporti bo'yicha tekshirilsin | ☐ |
| `TDTN-25000/110.noLoadCurrentPct` | 0.7 | % | ✅ | Ma'lumotnoma/katalogdagi tipik qiymat — aniq transformator pasporti bo'yicha tekshirilsin | ☐ |
| `TDTN-25000/110.cooling` | D | — | ✅ | Ma'lumotnoma/katalogdagi tipik qiymat — aniq transformator pasporti bo'yicha tekshirilsin | ☐ |
| `TDTN-25000/110.rpn` | winding: hv, steps: 9, stepPct: 1.78 | — | ✅ | 110 kV o'ramda RPN ±9×1,78% (NORMS.rpn110*) | ☐ |
<!-- AUTO:TRANSFORMERS:END -->

## 3. Yuklama grafiklari va ob-havo (`data/loadCurves.ts`)

<!-- AUTO:CURVES:START -->
| Kalit | Qiymat | Birlik | verify | Izoh | Holat |
|---|---|---|---|---|---|
| `LOAD_CURVES.winter` | [0.55, 0.52, 0.5, 0.5, 0.52, 0.6, 0.75, 0.88, 0.92, 0.9, 0.86, 0.84, 0.82, 0.8, 0.8, 0.82, 0.88, 0.97, 1, 0.98, 0.92, 0.82, 0.7, 0.6] | × Pmax | ✅ | Qishki sutkalik grafik — tipik shakl (namuna) | ☐ |
| `LOAD_CURVES.summer` | [0.6, 0.56, 0.53, 0.52, 0.53, 0.58, 0.66, 0.74, 0.8, 0.86, 0.92, 0.97, 1, 1, 0.99, 0.97, 0.94, 0.9, 0.88, 0.9, 0.88, 0.8, 0.72, 0.65] | × Pmax | ✅ | Yozgi sutkalik grafik — tipik shakl (namuna) | ☐ |
<!-- AUTO:CURVES:END -->

Ob-havo ehtimollari (`WEATHER_WEIGHTS`) — o'yin modeli, me'yor emas.

## 4. Qoidalar va ularning jiddiyligi (`data/rules.ts` → `SEVERITY`)

`critical` — avariya yoki odamga xavf: imtihon rejimida stsenariy to'xtaydi, o'qitish/sinov rejimida harakat to'siladi.

| Qoida kodi | Jiddiylik | Mazmuni (engine'da qanday aniqlanadi) | Qayerda | Holat |
|---|---|---|---|---|
| `disconnectorUnderLoad` | critical | Ajratkich ochilsa/yopilsa iste'molchi ta'minoti o'zgaradi yoki parallel transformatorlar orasida yuklama qayta taqsimlanadi (ajratkich orqali yuklama toki o'tadi) | `engine/interlocks.ts` | ☐ |
| `disconnectorMagnetizing` | critical | Ajratkich salt transformatorni uzadi/ulaydi. **PTE ma'lum quvvatgacha salt transformatorni ajratkich bilan kommutatsiya qilishga ruxsat beradi** — 25 MVA 110 kV uchun "ruxsat yo'q" deb olingan; chegarani tekshiring | `engine/interlocks.ts` | ☐ |
| `disconnectorLoop` | violation | Ajratkich ikki tomoni kuchlanishda bo'lgan halqani uzadi/ulaydi, lekin yuklama qayta taqsimlanmaydi (shuntlash shartlari) | `engine/interlocks.ts` | ☐ |
| `earthOnLive` | critical | Kuchlanish ostidagi seksiyaga yerlagich | `engine/interlocks.ts` | ☐ |
| `earthWithoutVerify` | critical | Shu galvanik seksiyada kuchlanish yo'qligi tekshirilmagan (topshiriq 5.3 bo'yicha kritik) | `engine/interlocks.ts` | ☐ |
| `energizeEarthed` | critical | Yerlangan seksiyaga kuchlanish berish | `engine/interlocks.ts` | ☐ |
| `closeOntoEarthedDead` | violation | Yerlangan, lekin kuchlanishsiz uchastkani boshqasiga ulash. **Topshiriq 5.3 da "yerlagich ulangan holda ajratkich yoki o'chirgichni ulash — kritik"**; simulyatorda kuchlanish berilsa — kritik (`energizeEarthed`), kuchlanishsiz uchastkalarni ulash — qoidabuzarlik. Tasdiqlang | `engine/interlocks.ts` | ☐ |
| `switchDuringWork` / `removeEarthDuringWork` | critical | Brigada ish joyida (dopuskdan keyin, naryad yopilmagan) | `engine/interlocks.ts` | ☐ |
| `switchPostered` | violation | "Ulamang" plakati osilgan apparatni ulash | `engine/interlocks.ts` | ☐ |
| `switchWithoutOrder` | violation | Dispetcher buyrug'i qabul qilinmagan (favqulodda stsenariylarda `orderRequired: false`) | `engine/interlocks.ts` | ☐ |
| `permitIncomplete`, `permitGroupLow`, `permitBrigadeSmall`, `permitTimeInvalid` | violation | Naryad: raqam, ish nomi/joyi, 4 mas'ul shaxs, guruhlar (`NORMS.permit*MinGroup`), brigada soni, muddat. **Rollarni birlashtirish qoidalari (masalan ruxsat beruvchi = bajaruvchi) hozircha tekshirilmaydi** | `engine/permit.ts` | ☐ |
| `permitSwitchingWrong`, `permitEarthingWrong`, `permitPostersMissing`, `permitLivePartsWrong` | violation | Naryaddagi o'chiriladigan apparatlar, yerlagichlar, plakatlar va kuchlanish ostidagi qismlar stsenariy talabiga mosligi | `engine/permit.ts` | ☐ |
| `admitWithoutPermit`, `admitNotPrepared`, `admitOutsideTime` | violation | Dopusk: naryad bor, undagi apparatlar ochiq, yerlagichlar ulangan, plakatlar osilgan, vaqt naryad muddatida | `engine/permit.ts`, `engine/simulator.ts` | ☐ |
| `blankExtra`, `blankMissing`, `blankOrder` | violation | Kommutatsiya blankasi: ortiqcha/yetishmagan amal, qadamlar DAG'iga zid tartib | `engine/blank.ts` | ☐ |
| `blankNotReady`, `blankDeviation` | violation | Blankasiz kommutatsiya (blanka talab qilinsa) yoki blankadagi navbatdan chetga chiqish | `engine/simulator.ts` | ☐ |
| `protocolIncomplete`, `protocolValues`, `protocolConclusion` | violation | Sinov protokoli: barcha o'ramlar, asbob ko'rsatkichiga mos qiymatlar (`protocolValueTolerancePct`), xulosa `absorptionMin` va `insulationFactoryRatioMin` bo'yicha | `engine/protocol.ts` | ☐ |
| `reportEarly`, `readbackWrong`, `wrongOrder`, `extraneous` | violation | Tashkiliy qoidalar | `engine/simulator.ts` | ☐ |

Jarima ballari (`PENALTY`), yulduz chegaralari (`STAR_THRESHOLDS`) va rejimlar (`MODE_RULES`) — o'yin qoidalari, me'yor emas.

## 5. Kommutatsiya tartibi (`data/rules.ts` → `SWITCHING_ORDER`, qadamlar `data/procedures.ts`)

| Jarayon | Simulyatordagi tartib | Holat |
|---|---|---|
| Ta'mirga chiqarish | Buyruq va qaytarib o'qish → yuklamani SV orqali zaxiraga o'tkazish → o'chirgichlar: avval 10 va 35 kV (o'zaro ixtiyoriy), keyin 110 kV → (tavsiya) o'chirgich holatini joyida tekshirish → ajratkichlar: har tomonda avval transformator tomoni, keyin shina tomoni → shina tomonidagi ajratkich yuritmalariga "Ulamang — odamlar ishlamoqda" → barcha tomonlar uzilgach kuchlanish yo'qligini tekshirish → har tomondan yerlash → "Shu yerda ishlang" → naryad, dopusk → jurnal → hisobot | ☐ |
| Ishga tushirish | Brigadani olib chiqish, naryadni yopish → plakat va yerlagichlarni olish → ajratkichlar: avval shina tomoni, keyin transformator tomoni → 110 kV o'chirgichi (salt yurish) → 35 va 10 kV o'chirgichlari → SV ni o'chirish → jurnal → hisobot. S03 da ishga tushirishdan oldin izolyatsiya o'lchovi protokoli majburiy (110 kV o'chirgichidan oldin); megger mini-o'yini — 6-bosqichda | ☐ |
| 10 kV fider (KRU) | O'chirgich → aravacha (QS-…B). Ulash teskari | ☐ |
| 35 kV liniya | O'chirgich → liniya ajratkichi (L) → shina ajratkichi (B) | ☐ |
| RPN | Pog'ona bir-bir; keyingi buyruq `rpnStepTimeSec` dan keyin; K > `rpnBlockLoadFactor` da blokirovka. Pog'ona raqamlash: `tap > 0` — YK o'ramida o'ramlar ko'p (10 kV pasayadi). **Amalda raqamlash ishlab chiqaruvchiga qarab farq qiladi** | ☐ |

## 6. Topshiriq matnidagi (5-bo'lim) noaniqliklar — jim o'zgartirilmadi

1. **5.7 "uyg'otuvchi (tenglashtiruvchi) tok"** — bular turli tushunchalar: uyg'otuvchi (magnitlanish) toki salt yurishda o'tadi; parallel ishlash shartlari buzilganda **tenglashtiruvchi (aylanma) tok** paydo bo'ladi. Simulyatorda ikkinchisi ishlatildi (`engine/parallel.ts`).
2. **5.5 "ventilyatorlar moyni sovutishga qo'shilmaydi"** — ventilyatorlar moyga bevosita tegmaydi, lekin radiatorlarni puflab moyni **bilvosita** sovutadi (shuning uchun ular o'chsa ruxsat etilgan yuklama kamayadi). Matnlar shu ma'noda yozildi.
3. **5.3 ajratkich va kichik toklar** — PTE ajratkich bilan ayrim kichik toklarni (TN, ma'lum quvvatgacha salt transformator, shinalar va liniyalarning zaryad toki, shuntlangan tenglashtiruvchi toklar) kommutatsiya qilishga ruxsat beradi. Simulyatorda: bo'sh shinani ulash — ruxsat; salt transformator — `disconnectorMagnetizing` (sozlanadigan); halqa — `disconnectorLoop`.
4. **5.3 "yerlagich ulangan holda ajratkich yoki o'chirgichni ulash — kritik"** — yuqoridagi 4-bo'limdagi `closeOntoEarthedDead` izohiga qarang.
5. **5.2 o'chirgich holatini joyida tekshirish** — topshiriqda yo'q, lekin amaliyotda ajratkichdan oldin bajariladi; ixtiyoriy (jarimasiz) "tavsiya" qadami sifatida qo'shildi.
6. **5.2 uch o'ramli transformator** — "past kuchlanish o'chirgichi, keyin yuqori" qoidasi 10 va 35 kV uchun o'zaro ixtiyoriy tartib bilan qo'llandi.
7. **5.4 yerga tutashuv bilan ishlash muddati** (`NORMS.earthFaultMaxDurationMin`) — manbalarda turlicha keltiriladi; ALBATTA tekshirilsin.

## 7. Boshqa soddalashtirishlar va taxminlar

- "Yangiobod" podstansiyasi, liniya va iste'molchi nomlari, quvvatlari — shartli (o'quv uchun).
- 10 kV KRU da ajratkich vazifasini o'chirgich aravachasi bajaradi (sxemada `QS-F10-xB`, `QS-Tn-10B/T`).
- Kuchlanish yo'qligini tekshirish butun galvanik seksiya uchun hisoblanadi (amalda — har bir fazada, ish joyida).
- Plakatlar soddalashtirilgan: shina tomonidagi ajratkich yuritmalariga "Ulamang" va transformatorga "Shu yerda ishlang". Amalda o'chirgich boshqaruv kalitlariga ham plakat osiladi.
- Naryad: brigada kamida 2 kishi; kuchlanish ostida qoladigan qismlar sifatida ish joyiga yaqin shinalar talab qilinadi. Rollarni birlashtirish, kuzatuvchi (nablyudayushchiy), kundalik dopusk/yakun imzolari soddalashtirilgan.
- Kommutatsiya blankasiga kommutatsiya, kuchlanishni tekshirish va plakat amallari kiradi; "joyida tekshirish" (tavsiya) qadami blankaga kirmaydi.
- S03 dagi megger ko'rsatkichlari va zavod qiymatlari — shartli o'quv ma'lumoti (me'yor emas).
- S05 dagi 10,3–10,6 kV oralig'i — dispetcher buyrug'idagi shartli qiymat (me'yor emas); 110 kV manba kuchlanishi 106 kV — stsenariy sharti.
- Kuchlanish pasayishi modeli: `U2 = U1·U2nom/U1tap·(1 − K·ΔU%)` — soddalashtirilgan.
- Issiqlik modeli: o'ram vaqt doimiysi va k11, k21, k22 koeffitsientlari e'tiborsiz (IEC 60076-7 ning soddalashtirilgan ko'rinishi).
