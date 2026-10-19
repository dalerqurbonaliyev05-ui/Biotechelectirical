# «Elektr muhandisi: bir ish kuni» — O'yin dizayn hujjati (GDD)

> **Muhim:** barcha raqamlar, narxlar, tariflar va chegaralar **o'quv maqsadidagi namunaviy (soddalashtirilgan)** qiymatlar.
> Ular `data/config.json`, `data/equipment.json`, `data/faults.json` da turadi va oson o'zgartiriladi.
> O'yin PUE/PTE/PTB kabi me'yoriy hujjatlar o'rnini bosmaydi. Qiymatlarni elektr ta'minoti fani o'qituvchisi bilan tekshirib chiqing.

## 1. Maqsad va pedagogik qoidalar

Talaba «Texnomash» mashinasozlik zavodida bir ish kuni (08:00–17:00 o'yin vaqti) elektr muhandisi bo'lib ishlaydi:
topshiriq oladi, sexlarni aylanadi, asboblar bilan o'lchaydi, **sababni aniqlaydi**, xavfsiz tarzda ta'mir qiladi
va **iqtisodiy jihatdan asoslangan qaror** qabul qiladi, oxirida energiya tejash taklifini beradi.

Asosiy qoidalar:

1. Yuqori tok / qizish / vibratsiya **dvigatelni almashtirish kerakligini bildirmaydi**. Avval sabab, keyin qaror.
2. Har sexda kamida bitta holatda to'g'ri qaror — «almashtirish shart emas» (sovitish tiqilgan, relay ishlagan, moylash, kontakt qisish, VFD shart emas, …).
3. «Hamma narsani o'lchab chiqish» foydasiz: har bir o'lchov **o'yin vaqti** sarflaydi va ortiqcha o'lchov **ball** kamaytiradi.
4. Qaror bitta «to'g'ri javob» emas — shartlarga (yosh, qayta o'rash soni, zaxira dvigatel bor-yo'qligi, to'xtash narxi) bog'liq.
5. Xavfsizlik tashxisdan **alohida** baholanadi. Kritik buzish — «Baxtsiz hodisa».

## 2. Ekranlar va oqim

Bosh menyu → Smena boshlanishi (dispetcher xabari, topshiriqlar) → **Korxona xaritasi** (soat, ball, kW, cosφ, sex holati) →
Sex ichki ko'rinishi (uskunalar, shchit) → **Uskuna paneli** (shildik, asboblar, o'lchov jurnali) →
Tashxis oynasi (gipoteza) → Xavfsizlik ketma-ketligi oynasi → Qaror oynasi (iqtisodiy panel; almashtirishda dvigatel tanlash) →
Natija izohi → … → Energiya tahlili (grafik, takliflar) → Smena yakuni (ball, daraja, xatolar, dalolatnoma).

Joylar: Dispetcher xonasi, Transformator podstansiyasi (TP: TM-1, TM-2), RU-0,4 kV (sex liniyalari, quvvat analizatori, energiya tahlili),
4 sex (Mexanika, Payvandlash, Nasoslar, Ventilyatsiya). Harakat: bosish/teginish yoki klaviatura (←↑→↓ + Enter). Yurish ham o'yin vaqtini sarflaydi.

## 3. Korxona va uskunalar (namunaviy)

10 kV kirish, 2 × TM-400 (10/0,4 kV, 400 kVA). TM-1: Mexanika + Payvandlash; TM-2: Nasoslar + Ventilyatsiya (shina bog'lagichi ulanganda bittasi ikkala sexni oladi).

| Sex | Namunaviy yuklama | Asosiy uskunalar | Boshlang'ich vaziyat |
|---|---|---|---|
| Mexanika | ≈120 kW | 6 dvigatel (7,5…55 kW), kranbalka, sex shchiti | 3-dvigatel (55 kW) qizib ketmoqda |
| Payvandlash | ≈180 kW | 9 payvand apparati (bir fazali, faza juftlariga ulangan), kompensatsiya yacheykasi | yuklama yuqori, fazalar nosimmetrik |
| Nasoslar | ≈75 kW | 4 nasos (11…30 kW) | bitta nasos ishlamayapti |
| Ventilyatsiya | ≈45 kW | 4 ventilyator (5,5…18,5 kW) | bitta dvigatelda vibratsiya yuqori |

Har bir uskunada: `P_nom, U_nom, I_nom (formuladan), cosφ, η, aylanish tezligi, izolyatsiya klassi, ruxsat etilgan harorat, yoshi, qayta o'ralganlar soni, himoya turi va sozlamasi, kabel kesimi`.

## 4. Simulyatsiya modeli (`js/sim/`, DOM ga tegmaydi)

**Nominal tok:** `I = P / (√3 · U · cosφ · η)` (55 kW, 380 V, 0,89, 0,92 → ≈ 102 A).

**Qisman yuklama.** Mexanik yuklama koeffitsiyenti `L` (1 = nominal). Kirish quvvati `P_in = P_nom·L/η_op`,
reaktiv quvvat `Q = Q0 + (Qn − Q0)·L²` (Q0 ≈ 0,26·S_nom — salt yurish magnitlanishi, Qn — nominaldagi). Tok `I = S/(√3·U)`.
Shunda `L = 1` da `I = I_nom` aniq, `L = 1,25` da tok nominaldan ≈ 25 % yuqori, past `L` da cosφ pasayadi.

**Issiqlik modeli (soddalashtirilgan).** Korpus qizishi: `T_ust = T_atrof + ΔT_nom · (I/I_nom)² / sovitish + 0,5·qizish_o'ram`.
Podshipnik va klemma harorati ham tokdan, sovitishdan, lokal nuqsondan (`contactR`, ishqalanish) hisoblanadi.
Harorat `T(t+dt) = T_ust + (T − T_ust)·exp(−dt/τ)` (τ ≈ 25 o'yin daqiqasi) bilan yaqinlashadi.

**Nosozlik oshib borishi (vaqt bosimi).** Ishlayotgan nosoz uskunada `shikast` 0 → 1 to'planadi:
`dShikast/dt = nosozlik_koeffitsiyenti + max(0, T_korpus − 70)/3000` (qiyinlikka ko'paytiriladi). 1 ga yetsa — dvigatel kuyadi:
to'xtash, izolyatsiya yo'qoladi, qaror faqat «qayta o'rash / almashtirish» bo'ladi, zarar va jarima.

**Kuchlanish.** Shina: `U = 380·(1,02 − 0,04·K_tr)`; sex liniyasi kabelida `ΔU = √3·I·(R·cosφ + X·sinφ)·L` (`R = 22,5/S` Ω/km),
oksidlangan kontaktda `ΔU = √3·I·R_kontakt`. Faza nosimmetrikligi: `max|I_k − I_o'rt| / I_o'rt`.

**Qo'shimcha modellar.** Kondensator: `Qc = P·(tgφ1 − tgφ2)`. Nasos (drossel / VFD) va ventilyator (VFD / taymer) sarfi — `data/config.json` dagi koeffitsiyentlar bilan (affinlik qonuni, statik napor hissasi bilan).

### Chegaralar (`config.json → limits`, soddalashtirilgan)

| Kattalik | Yaxshi | Ogohlantirish | Xavfli |
|---|---|---|---|
| Kuchlanish og'ishi | ±5 % | ±10 % gacha | > ±10 % |
| Fazalar toki nosimmetrikligi | ≤ 10 % | — | > 10 % |
| Korpus harorati | < 70 °C | 70–90 °C | > 90 °C |
| Vibratsiya tezligi | ≤ 2,8 mm/s | 2,8–7,1 mm/s | > 7,1 mm/s |
| Izolyatsiya (megger) | ≥ 1 MΩ | 0,5–1 MΩ | < 0,5 MΩ |
| cosφ | ≥ 0,95 | past → jarima koeffitsiyenti | |
| Transformator K | ≤ 0,8 | 0,8–1,0 | > 1,0 |

## 5. Asboblar (o'yinning yuragi)

| Asbob | Beradi | Shart | Vaqt |
|---|---|---|---|
| Tok qisqichi | I_A, I_B, I_C, I/I_nom; ishga tushirish toki (alohida rejim) | ish holatida (qayta ishga tushirishda — himoya uzilishi mumkin) | 5 / 8 daq |
| Multimetr | U_AB, U_BC, U_CA, faza yo'qligi; tormoz g'altagi | jonli yoki o'chirilgan | 5 daq |
| Megommetr | izolyatsiya qarshiligi | **faqat o'chirilgan + kuchlanish yo'qligi tekshirilgan**; jonli uskunada = baxtsiz hodisa | 10 daq |
| Termovizor | korpus, podshipnik, klemma/kabel harorati | xavfsiz | 4 daq |
| Vibratsiya o'lchagich | mm/s va dominant chastota (1×, 2×, podshipnik, bo'shashish) | ishlayotgan uskuna | 6 daq |
| Ko'zdan kechirish | ventilyator tiqilishi, kontakt rangi, moy, boltlar; ayrimlari **ochish uchun izolyatsiya** talab qiladi | — | 4 daq |
| Quvvat analizatori | kW, kVA, kvar, cosφ, nosimmetriklik (sex shchiti / RU liniyasi / transformator) | — | 8 daq |

**Nosozlik modeli.** Har bir topshiriqning alomati bir nechta **yashirin sababga** ega (`data/faults.json`). Smena boshida seed bilan bittasi tanlanadi
(takrorlanadi). Sabab uskuna holatiga (sovitish, yuklama, izolyatsiya, kontakt qarshiligi, faza yo'qligi, himoya sozlamasi …) yozadi,
asboblar o'qishlari shu holatdan hisoblanadi (±2 % shovqin). Ta'mir/almashtirish holatni o'zgartiradi → sex yuklamasi, transformator K, umumiy kW va cosφ qayta hisoblanadi.

## 6. Alomat → yashirin sabab matritsasi (1 tutorial + 25 topshiriq)

| Kod | Alomat | Yashirin sabablar (→ to'g'ri qaror) |
|---|---|---|
| T0 | Tutorial: 1-dvigatel | sog'lom (→ xulosa: «sog'lom») |
| M1 | 3-dvigatel qizimoqda | sovitish tiqilgan (→ tozalash) · ortiqcha mexanik yuklama (→ stanokni sozlash) · izolyatsiya buzilishi (→ qayta o'rash / almashtirish — iqtisodga qarab) |
| M2 | Avtomat ishga tushirishda uzilyapti | avtomat sozlamasi noto'g'ri (→ sozlash) · Y/Δ ishlamayapti (→ kontaktor/taymer) · kabel kontakti bo'shashgan (→ qayta qisish) |
| M3 | Sex shchitida kuchlanish past | kabel kesimi kichik (→ kabel almashtirish) · kontakt oksidlangan (→ tozalash) · sexda ortiqcha yuklama (→ yuklamani uzish) |
| M4 | Kranbalka to'xtadi | tormoz g'altagi ishlamayapti (→ g'altak) · issiqlik relesi noto'g'ri sozlangan (→ sozlash) · bitta faza yo'q (→ kontaktor) |
| P1 | Faza toklari nosimmetrik | apparatlar notekis ulangan (→ qayta taqsimlash) · bitta apparat nosoz (→ ta'mir) · ta'minot kuchlanishi nosimmetrik (→ dispetcherga xabar) |
| P2 | cosφ ≈ 0,62, jarima xavfi | kompensatsiya yo'q (→ kondensator hisoblash) · bosqichlar ishdan chiqqan (→ ta'mir) · regulyator o'chiq (→ AVTO) |
| P3 | Kabel ulanish nuqtasi qizigan | kontakt bo'shashgan (→ qayta qisish) · kabel kesimi yetarli emas (→ almashtirish) |
| N1 | N2 nasos ishlamayapti | issiqlik relesi ishlagan (klapan yopiq) · saqlagich kuygan (faza uzilishi) · rotor qisilgan (podshipnik) · izolyatsiya teshilgan |
| N2 | Nasos qisqa tsiklda | bosim relesi sozlamasi · kontaktor yeyilgan · bosim rezervuari (membrana) |
| N3 | Nasos to'liq quvvatda, drossel | talab past → VFD · bir me'yorda → kuraklarni kesish · deyarli ishlatilmaydi → hech narsa qilmaslik |
| V1 | Vibratsiya yuqori | podshipnik · markazlashmaslik · disbalans · poydevor boltlari |
| V2 | Shovqin + podshipnik harorati | moy yetishmaydi (→ moylash) · podshipnik shikastlangan (→ almashtirish) |
| V3 | Ventilyator doim 100 % | o'zgaruvchan talab (→ VFD) · bo'sh vaqtlar (→ taymer) · doimiy talab (→ hech narsa) |
| E1 | Kunlik yuklama tahlili | cho'qqi payvandlash / tungi bo'sh yurish / past cosφ (→ byudjetdagi eng yaxshi to'plam) |
| E2 | TM ta'mirga chiqsa, ikkinchisi ko'taradimi | tungi / kunduzgi / kechki oyna (→ K hisobi, kerak bo'lsa yuklamani boshqarish) |
| M5 | Qirindi so'rgich ventilyatori havoni kuchsiz tortadi | filtr to'lgan (→ tozalash) · g'ildirak shponkasi kesilgan (→ shponka) · zaslonka yopiq (→ ochish) |
| M6 | Moy nasosi ishga tushmayapti | kontaktor g'altagi uzilgan (→ g'altak) · moy qotgan (→ yuvish, moy almashtirish) · izolyatsiya teshilgan (→ qayta o'rash / almashtirish) |
| P4 | 1-payvand apparati qizib ketadi | klemma kontakti bo'sh (→ qayta qisish) · sovitish tirqishlari bekilgan (→ tozalash) · o'ramlararo qisqa tutashuv (→ ta'mir) |
| P5 | 2-payvand apparati avtomati uzib qo'yadi | magnit uzgich 2×In (→ sozlash) · kirish kabeli qobig'i kuygan (→ kabel ta'miri) · o'ram yerga tutashgan (→ ta'mir) |
| P6 | 7-apparat korpusida «tok urmoqda» | yerga ulash uzilgan (→ tiklash) · izolyatsiya nam (→ quritish) · o'ram izolyatsiyasi kuygan (→ ta'mir) |
| P7 | 3-apparat yoqilmayapti | ajratkich «o'chiq» (→ yoqish) · kontaktor g'altagi uzilgan (→ g'altak) · issiqlik himoyasi ishlagan (→ tozalash) |
| N4 | Drenaj nasosi suv chiqarmayapti | so'rish panjarasi bekilgan (→ tozalash) · mufta sinib qolgan (→ mufta) · ish g'ildiragi yeyilgan (→ g'ildirak) |
| N5 | Nasoslar sexi shchitida kuchlanish me'yordan chiqqan | ortiqcha yuklama (→ uzish) · kontakt oksidlangan (→ tozalash) · tashqi ta'minot nosimmetrik (→ dispetcherga xabar) |
| V4 | 4-ventilyator doim ishlaydi | bo'sh soatlar (→ taymer) · o'zgaruvchan talab (→ VFD) · doimiy kam soatli talab (→ hech narsa) |
| V5 | Ventilyatsiya shchitida kuchlanish tushgan | kirish kabeli kesimi kichik (→ kabel) · ortiqcha yuklama (→ uzish) · tashqi ta'minot nosimmetrik (→ dispetcherga xabar) |

Har bir topshiriqda 3 ta maslahat (`hints`) bor.

## 7. Xavfsizlik bloki (ball: 30)

Ketma-ketlik (har qadam navbat bilan tanlanadi, noto'g'ri tanlov — jarima va sababi izohi):
1) naryad-ruxsatnoma · 2) PPE · 3) o'chirish + ko'rinadigan uzilish · 4) plakat + blokirovka · 5) **kuchlanish yo'qligini tekshirish** ·
6) ko'chma yerga ulash · 7) ish joyini to'sish · 8) ishga ruxsat (faqat shundan keyin ta'mir tugmalari ochiladi).

| Buzish | Oqibat |
|---|---|
| Qadam tartibi buzilishi (masalan, tekshirmay yerga ulash) | katta ball yo'qotish (−8 / −12), qadam bajarilmaydi |
| PPE'siz o'chirish/tegish; kuchlanishni tekshirmay «ishga ruxsat» | **Kritik → Baxtsiz hodisa** (topshiriq muvaffaqiyatsiz, smena balli keskin tushadi) |
| Megger jonli uskunada | Kritik → baxtsiz hodisa |
| Megger o'chirilgan, lekin kuchlanish tekshirilmagan | rad etiladi, −12 |
| Jonli o'lchov PPE'siz | −5 |

Izoh: bu o'quv o'yini; haqiqiy me'yoriy hujjatlar (PUE, PTE, PTB) o'rnini bosmaydi — o'yin ichida eslatma ko'rsatiladi.

## 8. Iqtisodiy model

- **Yillik tejash:** `P_nom · (1/η_eski − 1/η_yangi) · yillik_soat · tarif` (qismiy yuklama: `P_nom·L`).
- **O'zini qoplash (yil):** `(yangi_narx − ta'mir_narxi) / yillik_tejash` (ta'mir bilan solishtirilganda ortiqcha sarf / ortiqcha tejash).
- **Jami xarajat:** `narx + to'xtash_yo'qotishi`, to'xtash yo'qotishi = `to'xtash_soati × so'm/soat` (kun = 16 ish soati).
- **Variantlarni solishtirish (`horizon` = 5 yil):** `TCO = narx + to'xtash + 5·(energiya_xarajati − eng_yaxshi_energiya)`.
  Qayta o'rash har safar η ni 0,7 punktga pasaytiradi; zaxira dvigatel bo'lsa almashtirish 8 soat, bo'lmasa 10 kun.
- **Baholash:** yaroqli variantlar orasida eng arzoni (TCO) = 100 % xarajat balli; qolgani `1 − (TCO − TCO_eng)/max(TCO_eng, taglik)` (kamida 25 %, agar ishlasa).
  Sababni **tuzatmaydigan** yechim = 0.
- Tejash topshiriqlari (N3, V3) — «foyda» rejimi; E1 — byudjet (100 mln so'm) ichidagi to'plamlar bo'yicha 5 yillik sof foyda; E2 — eng arzon yetarli chora to'plami (K ≤ 0,95): `foyda = 5·yillik_tejash − kapital`; eng yaxshi variantga nisbat; foyda ≤ 0 bo'lsa «hech narsa qilmaslik» eng yaxshi.
- Almashtirishda dvigatel **quvvat, aylanish tezligi va FIK sinfi (IE2/IE3)** bo'yicha tanlanadi: kichik quvvat / noto'g'ri tezlik — yaroqsiz.

## 9. Energiya samaradorligi

Namunaviy 24 soatlik profillar (`data/energy.json`), tarif zonalari (kechasi arzon, cho'qqi qimmat), cosφ jarima koeffitsiyenti `1 + 1,5·(0,95 − cosφ)`.
Takliflar: kondensator batareyasi, VFD (nasos/ventilyator), yuklamani siljitish, IE3 almashtirish, bo'sh yurish/yoritishni o'chirish.
Har biri: kapital, yillik tejash, o'zini qoplash; qo'llangandan keyin grafik va yillik hisob qayta hisoblanadi.

## 10. Ball tizimi (har topshiriq 100, `config.json → scoring`)

- **Tashxis 35:** gipoteza (20: 1-urinishda to'liq, har xato −7) + kerakli o'lchovlar (15: hal qiluvchi asboblar ulushi, ortiqcha o'lchov −2, maslahat −2/−4).
- **Xavfsizlik 30:** 30 dan jarimalar ayriladi (ta'mir/almashtirish bo'lmagan topshiriqlarda og'irlik boshqalarga taqsimlanadi).
- **Vaqt 15:** topshiriq byudjeti ichida to'liq, 2× da nol.
- **Xarajat va asoslash 20:** qaror sifati × 20.

Smena: topshiriq ballarining muhimlik (`risk × impact`) bo'yicha vaznli o'rtachasi + prioritet bonusi (≤ 5) − favqulodda chaqiruvlar jarimasi; baxtsiz hodisa −15.
Daraja: Stajyor < 50 ≤ Elektrik < 70 ≤ Muhandis < 85 ≤ Katta muhandis.

## 11. Smena, qiyinlik, favqulodda hodisalar

- **Kunlik smena:** Oson 6 / Oddiy 8 / Qiyin 10 topshiriq (4 tasi har doim: M1, P1, N1, V1). **Mashq rejimi:** barcha 25 topshiriq (3 kunlik soat).
- **Oson:** o'lchov statuslari rangda, birinchi maslahat bepul, soat sekin; **Qiyin:** maslahat yo'q, byudjet qisqa, shikast tez.
- **Favqulodda chaqiruv** (kuchlanish tushishi, yuklama oshishi, avtomat uzilishi): muddat ichida javob berilmasa jarima.
- **Yutuqlar:** «Hech qachon ortiqcha o'lchamadi», «Xavfsizlik 100 %», «Eng arzon yechim», …
- **Hisobot:** «Ish kuni dalolatnomasi» — chop etishga mos HTML, yuklab olish mumkin.
- Saqlash: `localStorage`, «Davom ettirish» / «Yangidan boshlash».

## 12. Kengaytirish (kodsiz)

Yangi topshiriq: `tasks.json` ga yozuv + `faults.json` ga alomat/sabablar (holat o'zgarishlari bilan). Yangi uskuna: `equipment.json`.
Matnlar: `i18n.uz.json`. Chegaralar, tariflar, ball og'irliklari: `config.json`. Keyingi versiyalar (yangi korxonalar, PLC, rele himoyasi, 3D, o'qituvchi uchun natijalar yig'ish) uchun
`data/` va `js/sim/` ajratilgan: sim moduli hech qaysi qatlamga bog'liq emas.

## 13. Qabul qilingan taxminlar

1. Loyiha mavjud sayt ichida `muhandis-oyini/` papkasida; yo'llar nisbiy (`/muhandis-oyini/` yoki istalgan papkaga ko'chirish mumkin).
2. ES modullari va `fetch(JSON)` brauzer xavfsizligi tufayli `file://` da (Chrome) ishlamaydi; mahalliy server (`python3 -m http.server`) yoki Vercel/GitHub Pages kerak. Sahifa buni aniq xabar bilan ko'rsatadi.
3. Faza toklari skalyar yig'iladi (fazor burchaklarsiz); payvand apparatlari ikki liniya orasiga ulangan bir fazali yuklama deb olinadi.
4. cosφ sutka davomida o'zgarmas deb olinadi; profil faqat kW ni o'zgartiradi.
5. Himoya (issiqlik relesi) shikastlanishni to'xtatmaydi — o'yin vaqti bosimini berish uchun soddalashtirilgan.
6. Yillik ish soati 4000 (nasos/ventilyator uchun uskuna bo'yicha ko'rsatilgan), 300 ish kuni, kun = 16 ish soati.
7. Tarif 1000 so'm/kWh va zonalar koeffitsiyentlari, dvigatel/VFD/kabel narxlari — namunaviy; haqiqiy qiymatlar bilan almashtiring.
8. Tutorial ballga kirmaydi.
9. Ovoz standart bo'yicha o'chiq; faqat oddiy WebAudio signallari (tashqi fayl yo'q).
10. E1 takliflar byudjeti 100 mln so'm; E2 da oyna ichidagi eng katta S bitta TM-400 ga to'liq tushadi deb olinadi.
11. Tutorial (T0): PPE kiyish, tok qisqichi, jurnal, xulosa; ballga kirmaydi. Shaxsiy hisobot — «Ish kuni dalolatnomasi» (chop etishga mos HTML).
12. Qaror noto'g'ri bo'lsa ham nosozlik «keyingi brigada» tomonidan to'g'ri bartaraf etiladi (zavod holati izchil qoladi); ball esa noto'g'ri qarorga ko'ra hisoblanadi.
13. Tekshiruv: `npm test` — 39 ta test (formulalar, iqtisod, xavfsizlik, ball, barcha sabablarning yechilishi, saqlash, i18n).
