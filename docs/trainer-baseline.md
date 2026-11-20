# 3D trenajyorlar: bazaviy o'lchov (ko'chirishdan oldin)

Vazifaning 2-bosqichi. 07, 08 va 09 trenajyorlari umumiy yadroga ko'chirilishidan **oldingi** holati shu yerda
yozib qo'yilgan. 10 va 11 (PR #28 asosida tezlashtirilgan) solishtirish uchun yonma-yon berilgan.
Ko'chirilgandan keyin har bir PR shu jadvalni qayta o'lchaydi va funksional testlar shu holatga mos kelishi shart.

- Kod holati: `d5be565` (main). Trenajyor fayllari o'zgartirilmagan.
- Asboblar: `tests/trainers/` (qanday ishlashi `tests/trainers/README.md` da).
- Muhit: Linux, 4 yadroli Intel Xeon 2.1 GHz, Chromium 153 headless, WebGL dasturiy (SwiftShader).

## 1. Tezlik

Har bir qiymat — 3 ta alohida ochilishning medianasi (`npm run measure`). Xom natija: `tests/trainers/baseline/measure-d5be565.json`.

Profillar:
- **kompyuter** — 1400×900, DPR 1, sichqoncha;
- **telefon** — 390×844, DPR 3, sensorli ekran, protsessor 4 marta sekinlashtirilgan (CDP CPU throttling).

Ustunlar:
- **Ochilish** — sahifa navigatsiyasidan birinchi asosiy kadr chizilguncha, ms.
- **Sim ulash** — ikkinchi qisqich bosilganda `pointerdown` ishlovchisining to'liq sinxron vaqti, ms. Bunga
  tekshiruv (analyze), simlarni qurish va o'ng paneldagi ro'yxatni yangilash kiradi. To'liq yechimdagi barcha simlar
  bo'yicha mediana / maksimum olinadi. Maksimum oxirgi simlarda chiqadi, chunki eski kodda har ulashda hamma simlar
  qaytadan quriladi. 08 da sim yo'q, uning o'rnida detalni qo'yish ishlovchisi o'lchangan.
- **Kadr** — ulashdan keyingi kadrda `renderer.render()` ning JS vaqti, ms (mediana).
- **Draw call** — bitta kadrdagi chizish chaqiriqlari (soya xaritasi o'tishi ham kiradi):
  birinchi kadr / yechim to'liq yig'ilgan va kamera siljigan statik kadr / kuchlanish berilgan kadr.
- **Uchburchak** — statik kadrda.

| № | Trenajyor | Profil | Ochilish, ms | Sim ulash (med / max), ms | Kadr, ms | Draw call: 1-kadr / statik / tok | Uchburchak |
|---|---|---|---|---|---|---|---|
| 07 | Elektr shit montaji | kompyuter | 1581 | 5.0 / 13.8 | 2.8 | 405 / **453** / 455 | 68 426 |
| 07 | Elektr shit montaji | telefon | 2116 | **22.7 / 55.8** | 14.6 | 405 / **459** / 461 | 69 042 |
| 08 | Avtomat yig'ish | kompyuter | 1062 | 0.4 / 0.8 (detal) | 1.3 | 113 / 113 / — | 11 304 |
| 08 | Avtomat yig'ish | telefon | 1657 | 1.6 / 4.7 (detal) | 6.5 | 113 / 113 / — | 11 304 |
| 09 | Chastota o'zgartirgich | kompyuter | 1403 | 6.8 / 20.2 | 3.6 | 421 / **525** / 527 | 109 820 |
| 09 | Chastota o'zgartirgich | telefon | 2700 | **30.6 / 67.5** | 14.7 | 421 / **529** / 531 | 111 226 |
| 10 | Reversiv yuritma (yangi) | kompyuter | 1695 | 1.8 / 4.9 | 2.5 | 146 / 320 / 322 | 113 174 |
| 10 | Reversiv yuritma (yangi) | telefon | 2825 | 7.2 / 18.1 | 10.9 | 146 / 324 / 326 | 114 830 |
| 11 | Uy elektr shiti (yangi) | kompyuter | 1424 | 1.8 / 6.0 | 2.5 | 198 / 298 / 298 | 72 132 |
| 11 | Uy elektr shiti (yangi) | telefon | 2491 | 6.6 / 17.3 | 11.3 | 198 / 298 / 298 | 72 132 |

### Raqamlarni qanday o'qish kerak

- **Draw call va uchburchak** GPU'ga bog'liq emas. Ular haqiqiy telefonda ham aynan shunday bo'ladi.
  10 ning statik kadri 320 draw call, bu PR #28 dagi "~320" bilan mos keladi. Demak o'lchov to'g'ri.
- **ms qiymatlari** shu mashina va dasturiy GPU'ga xos. Ular eski va yangi kodni bir xil sharoitda solishtirish uchun
  yaraydi, telefondagi haqiqiy vaqtni ko'rsatmaydi. "Telefon" ustuni o'rtacha telefon protsessoriga yaqin
  taxmin.
- **Sim ulash maqsadi haqida.** PR #28 dagi "~21 ms → ~1 ms" faqat simni qurish qismini o'lchagan bo'lsa kerak.
  Bu yerda butun ishlovchi o'lchanadi (tekshiruv + simlar + o'ng panel), shuning uchun 10 ning o'zi ham kompyuterda
  1.8 ms, telefon profilida 7.2 ms ko'rsatadi. Ko'chirishdan keyingi maqsadni shu o'lchov bo'yicha **10/11 darajasi**
  deb olaman: kompyuterda ~2 ms, telefon profilida ~7 ms (hozir 07 da 22.7 ms, 09 da 30.6 ms). "≤1–2 ms" PR #28
  o'lchovidagi bir xil raqamga mos keladi.
- **Ochilish vaqti** bu muhitda deyarli farq qilmaydi: 10 ham eski trenajyorlar bilan bir xil darajada. Sababi:
  dasturiy GPU'da kadrni chizish arzon, sahna qurish va birlashtirish (`mergeStatic`) esa protsessor vaqtini oladi.
  Haqiqiy telefonda draw call va soya xaritasi o'lchami ochilish va silliqlikka ko'proq ta'sir qiladi. Bu farqni
  bu muhitda o'lchab bo'lmaydi, uni qo'lda tekshirish kerak.

### Eski uchtasida nima og'ir (kod bo'yicha)

| | 07 | 08 | 09 | 10/11 (yangi) |
|---|---|---|---|---|
| Simlar | `TubeGeometry`, har ulashda **hammasi** qayta quriladi | — | `TubeGeometry`, hammasi qayta quriladi | `lightTube` + kesh, faqat yangi sim |
| Statik detallarni birlashtirish | yo'q (405 draw call simsiz) | yo'q (113, o'zi kam) | yo'q (421 simsiz) | `mergeStatic` / `bakeMerge` |
| Soya xaritasi | har kadrda, PCFSoft, 2048 | har kadrda, PCFSoft, 2048 | har kadrda, PCFSoft, **4096** | faqat o'zgarganda, PCF, telefonda 1024 |
| Pixel ratio | ≤ 2 | ≤ 2 | ≤ 2 | ≤ 1.75, telefonda ≤ 1.5 |
| `MeshPhysicalMaterial` (clearcoat) | bor | bor | bor | `std()` oddiy materialga aylantiradi |

Xulosa:
- 07 va 09 da asosiy yuk: (1) har ulashda barcha simlarni qayta qurish (sim ko'paygan sari sekinlashadi:
  telefon profilida oxirgi simlarda 56–68 ms); (2) har kadrda qayta chiziladigan soya xaritasi; (3) birlashtirilmagan
  statik detallar.
- **08 boshqacha**: draw call 113, detal qo'yish ~2 ms, ya'ni bu ikki ko'rsatkich bo'yicha 08 allaqachon yengil.
  Unda yadrodan foydasi tegadigan qism: soyani faqat o'zgarganda chizish, telefonda pixel ratio va soya xaritasini
  kichraytirish, clearcoat'siz materiallar. 08 uchun "draw call ~300–350" maqsadi ma'nosiz (u allaqachon pastroq).
  Maqsad: draw call oshmasin, kadr va ochilish vaqti kamaysin.

## 2. Funksional xulq-atvor

`npm test` — 10 ta ssenariy (har trenajyorga "o'rganish" va "imtihon"). Har bir qadamdan keyin quyidagilar
yoziladi va `tests/trainers/golden/*.json` bilan **to'liq** solishtiriladi:
- shu qadamda chiqqan barcha holat xabarlari: aniq matn va ohang (ok / xato / neytral);
- qadamlar ro'yxati (tayyor / qisman), hisobot (imtihonda «Tekshirish»), hisoblagichlar;
- tugmalar holati (yoqilgan / o'chirilgan / ko'rinmas / bosilgan), boshqaruv paneli ko'rsatkichlari.

Golden fayllar eski kod bilan yozildi. Keyin to'plam qayta ishga tushirildi va 10/10 mos keldi, ya'ni testlar
barqaror.

Qamrov:
- **07:** o'rganishda noto'g'ri ulanishning barcha 5 turi, tanlash/bekor qilish, takroriy ulash, maslahat, orqaga,
  to'liq yechim, kuchlanish, kuchlanish ostida qisqichni bosish, qisqa tutashuv (AB-1, AB-3), qayta yoqish (nosozlik
  bor/yo'q), nosozlikni olib tashlash, sizish toki (УЗО), УЗО test tugmasi, tozalash. Imtihonda: xato va to'g'ri simlar,
  «Tekshirish» hisobotlari, to'liq yechim, kuchlanish, rejimlar almashishi.
- **08:** maslahat, noto'g'ri joy, yetishmayotgan detal (o'rganish va imtihon matnlari), 12 detalni tartib bilan
  o'rnatish, natija kartasi, qopqoq, dasta, ortiqcha yuk (issiqlik himoyasi), qisqa tutashuv, boshidan.
- **09:** `reason()` dagi deyarli barcha tarmoqlar (24 ta noto'g'ri ulanish), kontakt/signal to'qnashuvi
  (`conflictText`), to'liq yechim, kuchlanish, START/STOP, E.OL, E.OC, E.PL, RESET, xato paytida START,
  potensiometr nolda, imtihon hisoboti.
- **10, 11:** noto'g'ri ulanish turlari, to'liq yechim, kuchlanish va simulyatsiya (QF, sensorlar, blokirovka,
  tiqilib qolish; kuchlanish relesi, difavtomatlar, sizish, qisqa tutashuv, ortiqcha yuk, U yuqori/past), imtihon.

Quyida golden fayllardan avtomatik olingan xabarlar (`node tests/trainers/baseline-doc.mjs`).
Simli trenajyorlarda bir xil ko'rinishdagi qatorlar (masalan «To'g'ri ulandi. N / M ...») bir marta ko'rsatilgan.
To'liq ro'yxat golden fayllarda.

### 07 shit-montaji

Ochilishdagi xabar: «Namuna: tarmoq L va N simlari kirish avtomatiga ulangan. Endi avtomat pastki vintlarini УЗО ga ulang.»

Qadamlar ro'yxati: 12 ta (ochilishda tayyor: 2). Namunaviy (oldindan ulangan) simlar: 2 ta.

**O'rganish rejimida noto'g'ri ulanish xabarlari** (sim qo'yilmaydi, qizil sim bir lahza ko'rinadi):

| Ulanish | Xabar | Ohang |
|---|---|---|
| ab.lo — rcd.ni | Faza (L) va nol (N) ulandi: bu qisqa tutashuv, avtomat darhol o'chadi. | xato |
| ab.lo — pb1 | Faza PE ga tushdi: shkaf va asbob korpusi xavfli kuchlanish ostida qoladi. | xato |
| ab.no — pb1 | Ishchi nol (N) va himoya nol (PE) alohida yuradi. Ularni birlashtirsangiz УЗО noto'g'ri ishlaydi. | xato |
| rcd.li — rcd.lo | Bir qurilmaning kirishi va chiqishini ulash tokni qurilmadan chetlab o'tkazadi. Zanjir qurilma ichidan o'tishi kerak. | xato |
| ab.lo — m.1 | Bu ikki qisqich bevosita ulanmaydi. Tartib: tarmoq → AB → УЗО → hisoblagich → guruh avtomatlari → kabel. | xato |

**To'g'ri ulanish va boshqa xabarlar (o'rganish rejimi):**

| Qadam | Xabar(lar) |
|---|---|
| bosish ab.lo | «Kirish avtomati, pastki faza (L). Boshqa vintga sudrang yoki ikkinchisini bosing.» (—) |
| bosish ab.lo | «Kirish avtomati, pastki faza (L). Boshqa vintga sudrang yoki ikkinchisini bosing.» (—)<br>«Vintni bosib boshqasiga sudrang yoki ikkita vintni ketma-ket bosing.» (—) |
| sim ab.lo — rcd.li | «To'g'ri ulandi. 3 / 12 zanjir tayyor.» (ok) |
| sim rcd.li — ab.lo | «Bu ikki vint allaqachon ulangan.» (—) |
| tugma #hint | «Maslahat: Kirish avtomati N chiqishi → УЗО N kirishi» (—) |
| tugma #undo | «Oxirgi sim olib tashlandi.» (—) |
| sim pb4 — k3.pe | «Sxema to'g'ri yig'ildi. Kuchlanish berib ko'ring.» (ok) |
| tugma #power | «Kuchlanish berildi. Faza simida tok iste'molchiga boradi, nol simida qaytadi. PE da tok yo'q.» (ok) |
| tugma #fshort | «Kabel №1 da faza va nol tutashdi. Tok keskin oshyapti...» (xato)<br>«AB-1 o'chdi. Qisqa tutashuv toki yuzlab amperga yetdi, C16 avtomatning magnit ajratgichi millisekundlar ichida ishladi. Boshqa guruhlar ishlashda davom etyapti.» (ok) |
| tugma #freset | «Avtomat qayta yoqildi, lekin nosozlik hali bor...» (xato)<br>«AB-1 o'chdi. Qisqa tutashuv toki yuzlab amperga yetdi, C16 avtomatning magnit ajratgichi millisekundlar ichida ishladi. Boshqa guruhlar ishlashda davom etyapti.» (ok) |
| tugma #fclear | «Nosozlik bartaraf etildi. Endi o'chgan avtomatni qayta yoqish mumkin.» (ok) |
| tugma #freset | «Himoya qurilmalari qayta yoqildi, kuchlanish tiklandi.» (ok) |
| tugma #fleak | «Kabel №2 da faza simi asbob korpusiga tushdi. Sizish toki oqyapti...» (xato)<br>«УЗО o'chdi. Fazadan oqib chiqqan tok nol orqali qaytmadi, farq 30 mA dan oshdi. Avtomatlar ishlamadi: tok ularning nominalidan ancha kichik. УЗО hisoblagichdan oldin turgani uchun butun shit o'chdi.» (ok) |
| tugma #freset | «Avtomat qayta yoqildi, lekin nosozlik hali bor...» (xato)<br>«УЗО o'chdi. Fazadan oqib chiqqan tok nol orqali qaytmadi, farq 30 mA dan oshdi. Avtomatlar ishlamadi: tok ularning nominalidan ancha kichik. УЗО hisoblagichdan oldin turgani uchun butun shit o'chdi.» (ok) |
| tugma #ftest | «Test tugmasi sun'iy sizish toki hosil qildi va УЗО o'chdi. Uni oyiga bir marta shunday tekshirib turing.» (ok) |
| tugma #fshort | «Kabel №3 da faza va nol tutashdi. Tok keskin oshyapti...» (xato)<br>«AB-3 o'chdi. Qisqa tutashuv toki yuzlab amperga yetdi, C16 avtomatning magnit ajratgichi millisekundlar ichida ishladi. Boshqa guruhlar ishlashda davom etyapti.» (ok) |
| tugma #power | «Kuchlanish o'chirildi. Sxemani o'zgartirishingiz mumkin.» (—) |
| tugma #clear | «Sxema tozalandi. Tarmoq simlaridan boshlang.» (—) |

**Imtihon rejimi — «Tekshirish» natijalari:**

- «Tekshiruv: 3 ta muammo topildi.» (xato)
  - Xato sim: Tarmoq kabeli, faza (L) va Kirish avtomati, yuqori nol (N). Faza (L) va nol (N) ulandi: bu qisqa tutashuv, avtomat darhol o'chadi.
  - Xato sim: Kirish avtomati, pastki faza (L) va Kirish avtomati, pastki nol (N). Faza (L) va nol (N) ulandi: bu qisqa tutashuv, avtomat darhol o'chadi.
  - Yana 11 ta zanjir to'liq emas.
- «Tekshiruv: 1 ta muammo topildi.» (xato)
  - Xato sim: Tarmoq kabeli, faza (L) va Tarmoq kabeli, ishchi nol (N). Faza (L) va nol (N) ulandi: bu qisqa tutashuv, avtomat darhol o'chadi.
- «Sxema to'g'ri va to'liq. Kuchlanish berishingiz mumkin.» (ok)

### 08 avtomat-yigish

Ochilishdagi xabar: «Stoldagi detallardan birini tanlang va avtomat ichidagi joyiga qo'ying. Boshlash uchun «Maslahat» ni bosing.»

| Qadam | Xabar(lar) |
|---|---|
| tugma #hint | «Maslahat: 1 · Pastki vintli klemma. Ko'k soya uning o'rnini ko'rsatadi.» (—) |
| detalni (0,-37) ga qo'yish | «Bu yer emas. Pastki vintli klemma boshqa joyga qo'yiladi: tanlaganda ko'k soya o'rnini ko'rsatadi.» (xato) |
| detal tanlash arm | «3 · Harakatlanuvchi kontakt: endi uning joyini bosing yoki sudrab olib boring. Ko'k soya o'rnini ko'rsatadi.» (—) |
| detalni joyiga qo'yish arm | «Kontakt juftining ikkinchi yarmi yuqori klemmada turadi, shuning uchun avval o'sha klemmani o'rnating. Hozircha yetishmaydi: 2 (Yuqori vintli klemma).» (xato) |
| detalni joyiga qo'yish t1 | «Joyiga tushmoqda...» (—)<br>«1 · Pastki vintli klemma o'rnatildi. 1 / 12.» (ok) |
| detalni joyiga qo'yish din | «Joyiga tushmoqda...» (—)<br>«Avtomat to'liq yig'ildi. Sinov stendida uni yoqib, himoyani tekshiring.» (ok) |
| tugma #cover | «Shaffof qopqoq yopildi: ichki detallar ko'rinib turadi.» (—) |
| tugma #cover | «Qopqoq ochildi.» (—) |
| tugma #t-handle | «Avtomat yoqildi: kulachok tortqini to'g'rilab, kontaktni qo'zg'almas kontaktga bosdi.» (ok) |
| tugma #t-over | «Zanjirga me'yoridan ortiq yuklama ulandi. Bimetall plastinka isiy boshladi...» (—)<br>«Issiqlik himoyasi ishladi: bimetall egilib mexanizmni bosdi, ilgak bo'shadi, prujina kontaktni ochdi. Bu bir necha soniyadan daqiqagacha davom etadi.» (ok) |
| tugma #t-handle | «Dasta o'chiq holatga qaytdi: mexanizm qayta qulflandi. Endi yoqishingiz mumkin.» (ok) |
| tugma #t-short | «Qisqa tutashuv! Tok keskin oshdi...» (xato) |
| tugma #t-handle | «Avtomat qo'lda o'chirildi.» (—) |
| tugma #reset | «Hamma detallar stolga qaytarildi. Qaytadan yig'ing.» (—) |
| tugma #m-exam | «Imtihon rejimi: soyasiz, maslahatsiz yig'ing. Vaqt va xatolar hisoblanadi.» (—) |
| detal tanlash mech | «9 · Boshqarish mexanizmi: uning joyini toping.» (—) |
| detalni joyiga qo'yish mech | «Hozir bu detalni o'rnatib bo'lmaydi: avval boshqa detal kerak.» (xato) |
| detalni (0,30) ga qo'yish | «Noto'g'ri joy.» (xato) |
| tugma #m-learn | «O'rganish rejimi: tanlangan detalning o'rni ko'k soya bilan ko'rsatiladi.» (—) |

Natija kartasi: «Avtomat yig'ildi. Vaqt: M:SS, xatolar: 3.»
Natija kartasi: «Avtomat yig'ildi. Vaqt: M:SS, xatolar: 3.»
Natija kartasi: «Avtomat yig'ildi. Vaqt: M:SS, xatolar: 2.»

### 09 chastota-yigish

Ochilishdagi xabar: «Namuna: manba L1 o'zgartirgichning R klemmasiga ulangan. Endi L2 ni S ga, L3 ni T ga ulang.»

Qadamlar ro'yxati: 13 ta (ochilishda tayyor: 1). Namunaviy (oldindan ulangan) simlar: 1 ta.

**O'rganish rejimida noto'g'ri ulanish xabarlari** (sim qo'yilmaydi, qizil sim bir lahza ko'rinadi):

| Ulanish | Xabar | Ohang |
|---|---|---|
| vfd.r — vfd.s | Bir qurilmaning ikki klemmasini o'zaro ulash tokni qurilmadan chetlab o'tkazadi. Zanjir qurilma ichidan o'tishi kerak. | xato |
| src.l1 — src.l2 | Bir qurilmaning ikki klemmasini o'zaro ulash tokni qurilmadan chetlab o'tkazadi. Zanjir qurilma ichidan o'tishi kerak. | xato |
| src.l — vfd.s | Bu bir fazali 220 V manba. O'zgartirgichning R, S, T kirishi 3 fazali 380 V uchun: bir faza ulansa «kirish fazasi yo'q» xatosi chiqadi. Bu sxemada L, N ishlatilmaydi. | xato |
| src.l2 — vfd.u | Tarmoqni o'zgartirgich chiqishiga (U, V, W) yoki motorga to'g'ridan ulab bo'lmaydi: chiqishga tarmoq tushsa o'zgartirgich zumda kuyadi. Tarmoq faqat R, S, T ga ulanadi. | xato |
| src.l2 — vfd.m0 | 380 V ni boshqaruv zanjiriga ulash o'zgartirgichni kuydiradi: boshqaruv klemmalari faqat past kuchlanish uchun. | xato |
| src.l2 — vfd.t | Kirishda fazalar tartibi elektr jihatdan ahamiyatsiz, lekin bu mashqda standart tartib: L1→R, L2→S, L3→T. | xato |
| src.e — vfd.u | Himoya yerlash (PE) faqat korpus va yerlash klemmalariga ulanadi: manba E → o'zgartirgich ⊕ va motor korpusi. | xato |
| src.e — src.l1 | Bir qurilmaning ikki klemmasini o'zaro ulash tokni qurilmadan chetlab o'tkazadi. Zanjir qurilma ichidan o'tishi kerak. | xato |
| vfd.s — mot.u | Kirish va chiqishni bir-biriga ulash tarmoqni to'g'ridan motorga uzatadi: o'zgartirgich chetlab o'tiladi va buziladi. | xato |
| vfd.u — mot.v | Fazalar nomi bilan mos ulanadi: U→U1, V→V1, W→W1. Ikki simni almashtirsangiz motor teskari tomonga aylanadi (REV). | xato |
| vfd.u — res.1 | O'zgartirgichning U, V, W chiqishlari faqat motorning U1, V1, W1 klemmalariga ulanadi. | xato |
| res.1 — vfd.m0 | P va PB faqat tormoz rezistoriga ulanadi. | xato |
| res.1 — pot.1 | P va PB faqat tormoz rezistoriga ulanadi. | xato |
| res.1 — vfd.ra | Tormoz rezistorining ikki uchi P va PB klemmalariga ulanadi, har biri bittadan. | xato |
| pot.1 — bs.23 | Potensiometr va tugmalar bir-biriga ulanmaydi. | xato |
| bs.11 — vfd.m0 | START tugmasining NC (11–12) kontakti normal holatda yopiq: M0 doim ulangan bo'lib o'zgartirgich o'zi yurib ketadi. START uchun NO (23–24) kontakt ishlatiladi. | xato |
| bs.11 — vfd.com | START tugmasi uchun NO (23–24) kontakt ishlatiladi, NC (11–12) emas. | xato |
| bs.23 — vfd.m2 | START tugmasi M0 (FWD) va COM orasiga ulanadi, NO (23–24) kontakt orqali. | xato |
| bt.23 — vfd.m2 | STOP tugmasi NC (11–12) kontakti orqali ulanadi: M2 normal holatda COM ga ulangan bo'lishi kerak. NO kontaktda o'zgartirgich hech qachon yurmaydi. | xato |
| bt.23 — vfd.com | STOP tugmasi uchun NC (11–12) kontakt ishlatiladi, NO emas. | xato |
| bt.11 — vfd.m0 | STOP tugmasi M2 (STOP) va COM orasiga ulanadi, NC (11–12) kontakt orqali. | xato |
| vfd.v10 — pot.1 | +10 V potensiometrning 3-uchiga, GND 1-uchiga, AI esa o'rta (2) uchiga ulanadi. M0 START ga, M2 STOP ga ulanadi. | xato |
| bs.23 — vfd.com | M0 va COM/GND bir nuqtada tutashib qoladi: bu qisqa tutashuv. Har bir signal o'z klemmasiga ulanadi. | xato |

**To'g'ri ulanish va boshqa xabarlar (o'rganish rejimi):**

| Qadam | Xabar(lar) |
|---|---|
| bosish vfd.s | «S: tarmoq kirishi (L2). Boshqa klemmaga sudrang yoki ikkinchisini bosing.» (—) |
| bosish vfd.s | «S: tarmoq kirishi (L2). Boshqa klemmaga sudrang yoki ikkinchisini bosing.» (—)<br>«Klemma halqasini bosib boshqasiga sudrang yoki ikkita klemmani ketma-ket bosing.» (—) |
| sim vfd.m0 — bs.23 | «To'g'ri ulandi. 1 / 13 ulanish tayyor.» (ok) |
| tugma #undo | «Oxirgi sim olib tashlandi.» (—) |
| sim src.l1 — vfd.r | «Bu ikki klemma allaqachon ulangan.» (—) |
| tugma #hint | «Maslahat: Manba L2 → o'zgartirgich S klemmasi» (—) |
| sim vfd.com — bt.12 | «Sxema to'g'ri yig'ildi. Kuchlanish berib ko'ring.» (ok) |
| tugma #power | «Kuchlanish berildi: o'zgartirgich ekrani yondi. Hozir u tayyor holatda. START tugmasini bosing.» (ok) |
| tugma #f-ol | «Ortiqcha yuk motor aylanayotganda sinaladi. Avval START bilan motorni yurgizing.» (—) |
| bosib turish #b-start | «START: M0 va COM qisqa vaqt tutashdi, o'zgartirgich buyruqni eslab qoldi va motorni tezlatyapti.» (ok) |
| bosib turish #b-stop | «STOP: M2 va COM orasi uzildi, o'zgartirgich chastotani pasaytirib motorni to'xtatyapti.» (ok) |
| qo'yib yuborish #b-stop | «STOP qo'yib yuborildi. Qayta yurgizish uchun START ni bosing.» (—) |
| tugma #f-ol | «E.OL: motor toki nominaldan oshdi, o'zgartirgichning issiqlik himoyasi chiqishni uzdi. Motor inersiya bilan to'xtayapti.» (xato) |
| tugma #f-reset | «Xato tiklandi. O'zgartirgich tayyor: START bilan qayta yurgizing.» (ok) |
| tugma #f-oc | «Chiqishdagi qisqa tutashuv motor yurib turganda yaqqol ko'rinadi. Avval START bosing.» (—) |
| tugma #f-oc | «E.OC: chiqishda qisqa tutashuv, tok keskin oshdi. Tranzistorlarni himoya qiluvchi sxema mikrosekundlarda chiqishni uzdi.» (xato) |
| bosib turish #b-start | «O'zgartirgichda xato (E.OC). Avval «Xatoni tiklash» ni bosing.» (xato) |
| tugma #f-pl | «E.PL: L3 fazasi uzildi. O'zgartirgich kirish fazasi yo'qligini aniqlab chiqishni uzdi. Himoyasiz bo'lsa kondensatorlar va ko'prik haddan tashqari yuklanardi.» (xato) |
| bosib turish #b-start | «START: M0 va COM tutashdi, lekin zadatchik nolda. Potensiometr dastasini buring.» (—) |
| tugma #power | «Kuchlanish o'chirildi. Sxemani o'zgartirishingiz mumkin.» (—) |

**Imtihon rejimi — «Tekshirish» natijalari:**

- «Tekshiruv: 4 ta muammo topildi.» (xato)
  - Xato sim: Manba L1 (380 V, A fazasi) rozetkasi va S: tarmoq kirishi (L2). Kirishda fazalar tartibi elektr jihatdan ahamiyatsiz, lekin bu mashqda standart tartib: L1→R, L2→S, L3→T.
  - Xato sim: Manba L2 (380 V, B fazasi) rozetkasi va R: tarmoq kirishi (L1). Kirishda fazalar tartibi elektr jihatdan ahamiyatsiz, lekin bu mashqda standart tartib: L1→R, L2→S, L3→T.
  - Xato sim: M0 (FWD): oldinga yurgizish kirishi va START tugmasi, NC kontakt bloki, 11-qisqich. START tugmasining NC (11–12) kontakti normal holatda yopiq: M0 doim ulangan bo'lib o'zgartirgich o'zi yurib ketadi. START uchun NO (23–24) kontakt ishlatiladi.
  - Yana 12 ta ulanish to'liq emas.
- «Sxema to'g'ri va to'liq. Kuchlanish berishingiz mumkin.» (ok)

### 10 reversiv-yuritma

Ochilishdagi xabar: «Namuna: manba L1 avtomat QF ning 1-qisqichiga ulangan. Endi L2 ni 3 ga, L3 ni 5 ga ulang.»

Qadamlar ro'yxati: 17 ta (ochilishda tayyor: 0). Namunaviy (oldindan ulangan) simlar: 1 ta.

**O'rganish rejimida noto'g'ri ulanish xabarlari** (sim qo'yilmaydi, qizil sim bir lahza ko'rinadi):

| Ulanish | Xabar | Ohang |
|---|---|---|
| km1.71 — km1.72 | KM1 (oldinga) yordamchi kontakti 71 (NC, yopiq): bu klemma bu sxemada ishlatilmaydi. | xato |
| km1.71 — psu.l | KM1 (oldinga) yordamchi kontakti 71 (NC, yopiq): bu klemma bu sxemada ishlatilmaydi. Blokning L qisqichi manba L ga ulanadi. | xato |
| psu.vp1 — psu.vm1 | +V va −V ni tutashtirish blokning chiqishini qisqa tutashtiradi. | xato |
| km1.l1 — km1.t1 | Bir qurilmaning ikki klemmasini o'zaro ulash tokni qurilmadan chetlab o'tkazadi. KM1 1/L1 QF ning 2-chiqishidan keladi (KM2 1/L1 bilan parallel). | xato |
| src.l — psu.vp1 | ~220/380 V ni 24 V zanjirga ulab bo'lmaydi: sensor, rele g'altagi va blok chiqishi kuyadi. Kuch va boshqaruv zanjirlarini aralashtirmang. 220 V faza L ta'minot blokining L qisqichiga va K1, K2 relelarning 9 (COM) kontaktlariga boradi. | xato |
| src.e — qf.1 | Himoya yerlash (PE) tok o'tkazuvchi klemmalarga ulanmaydi: E faqat blokning ⏚ qisqichiga va motor korpusiga boradi. | xato |
| km2.t1 — mot.u | KM2 motorni teskari aylantirishi uchun ikki fazani almashtiradi: T1→W1, T2→V1, T3→U1. Agar KM1 dagidek ulasangiz, motor ikkala kontaktorda ham bir tomonga aylanadi. | xato |
| km1.t1 — mot.v | KM1 (oldinga) to'g'ri tartibda ulanadi: T1→U1, T2→V1, T3→W1. | xato |
| km1.t1 — km2.t2 | Kontaktor chiqishlari motor klemmalari orqali tutashadi: KM1 T1/T2/T3 → U1/V1/W1, KM2 esa almashtirib T1→W1, T2→V1, T3→U1. KM1 2/T1 motorning U1 qisqichiga boradi. | xato |
| qf.2 — km1.l2 | Bu qisqich L2 uchun mo'ljallangan. Bu yerga L1 ni ulasangiz, L2 bilan bir nuqtada fazalararo qisqa tutashuv bo'ladi va QF darhol o'chadi. QF chiqishi 2 (L1) KM1 va KM2 ning 1/L1 qisqichlariga boradi. | xato |
| s1.bn — psu.vm1 | +24 V ni 0 V ga ulash blok chiqishini qisqa tutashtiradi. | xato |
| km1.a1 — k1.no2 | Rele kontaktidan g'altakka to'g'ridan ulash blokirovkani chetlab o'tadi. Ikkala kontaktor bir vaqtda ulanib qolsa fazalararo qisqa tutashuv bo'ladi. G'altakka zanjir ikkinchi kontaktorning NC (61–62) kontakti orqali keladi. | xato |
| s1.bk — k2.a1 | Har bir sensor o'z relesini boshqaradi: S1 → K1, S2 → K2. | xato |
| s1.bk — k1.a2 | Sensorning qora (BK) chiqishi rele g'altagining 13 (A1+) qisqichiga ulanadi, 14 (A2−) esa 0 V ga. S1 ning qora (chiqish) simi K1 relening 13 (A1+) qisqichiga ulanadi. | xato |
| k2.nc1 — km2.54 | KM1 va KM2 zanjirlari alohida: bir kontaktor zanjirini ikkinchisiga ulasangiz ikkalasi birga ulanib qoladi. K2 ning 1 (NC) kontakti KM1 zanjiriga boradi: K1 ning 12 (COM) va KM1 ning 53 qisqichiga. | xato |
| k2.nc1 — km1.54 | Zanjir ketma-ketligi buziladi: L → (boshqa rele NC) → (o'z rele NO va o'zini ushlab turuvchi 53–54) → (boshqa kontaktor NC 61–62) → A1. K2 ning 1 (NC) kontakti KM1 zanjiriga boradi: K1 ning 12 (COM) va KM1 ning 53 qisqichiga. | xato |
| src.l — km1.a2 | Bu ikki klemma o'zaro ulanmaydi. 220 V faza L ta'minot blokining L qisqichiga va K1, K2 relelarning 9 (COM) kontaktlariga boradi. | xato |

**To'g'ri ulanish va boshqa xabarlar (o'rganish rejimi):**

| Qadam | Xabar(lar) |
|---|---|
| bosish km1.l1 | «KM1 (oldinga) 1/L1: L1 fazasi kirishi. Boshqa klemmaga sudrang yoki ikkinchisini bosing.» (—) |
| bosish km1.l1 | «KM1 (oldinga) 1/L1: L1 fazasi kirishi. Boshqa klemmaga sudrang yoki ikkinchisini bosing.» (—)<br>«Klemma halqasini bosib boshqasiga sudrang yoki ikkita klemmani ketma-ket bosing.» (—) |
| sim src.l2 — qf.3 | «To'g'ri ulandi. 0 / 17 bosqich tayyor.» (ok) |
| sim qf.3 — src.l2 | «Bu ikki klemma allaqachon ulangan.» (—) |
| tugma #undo | «Oxirgi sim olib tashlandi.» (—) |
| tugma #hint | «Maslahat: Manba L1, L2, L3 → avtomat QF ning 1, 3, 5 qisqichlari» (—) |
| sim km1.62 — km2.a1 | «Sxema to'g'ri yig'ildi. Kuchlanish bering, so'ng avtomat QF ni yoqing.» (ok) |
| tugma #power | «Kuchlanish berildi: blok 24 V chiqardi, boshqaruv zanjiri ishlayapti. Motor aylanishi uchun avtomat QF ni yoqing.» (ok)<br>«KM1 ulandi, lekin QF o'chiq: motorga 380 V kelmayapti. QF ni yoqing.» (ok) |
| tugma #b-qf | «QF yoqildi: kuch zanjiriga 380 V berildi. Ulangan kontaktor motorni aylantiradi.» (ok)<br>«S2 aravachani sezdi → K2 tortildi: K2 ning NC kontakti KM1 ni uzdi, KM1 ning 61–62 kontakti yopilgach KM2 ulandi. Motor teskari aylanyapti, aravacha S1 tomon qaytmoqda.» (ok) |
| tugma #b-qf | «QF o'chirildi: motor kuch zanjiridan uzildi. Boshqaruv zanjiri (220 V va 24 V) ishlashda davom etadi.» (—) |
| tugma #b-qf | «QF yoqildi: kuch zanjiriga 380 V berildi. Ulangan kontaktor motorni aylantiradi.» (ok)<br>«KM1 ulandi: motor oldinga aylanib aravacha S2 tomon ketyapti. S1 dan chiqqach K1 qo'yib yuboradi, lekin KM1 o'zining 53–54 kontakti orqali ulanib turadi.» (ok) |
| tugma #t-m1 | «S1 oldiga metall plastina qo'yildi: S1 doim faol, K1 tortilgan.» (—) |
| tugma #t-m2 | «Ikkala sensor ham faol: K1 ning NC kontakti KM2 zanjirini, K2 ning NC kontakti KM1 zanjirini uzadi. Ikkala kontaktor o'chadi, motor to'xtaydi. Bu himoya: ikki buyruq bir vaqtda kelsa, hech biri bajarilmaydi.» (ok)<br>«Ikkala sensor faol: KM1 ham, KM2 ham uzildi. Motor to'xtadi.» (—) |
| tugma #t-m1 | «S1 oldidagi metall olindi.» (—)<br>«S2 aravachani sezdi → K2 tortildi: K2 ning NC kontakti KM1 ni uzdi, KM1 ning 61–62 kontakti yopilgach KM2 ulandi. Motor teskari aylanyapti, aravacha S1 tomon qaytmoqda.» (ok) |
| tugma #t-m2 | «S2 oldidagi metall olindi.» (—)<br>«KM1 ulandi: motor oldinga aylanib aravacha S2 tomon ketyapti. S1 dan chiqqach K1 qo'yib yuboradi, lekin KM1 o'zining 53–54 kontakti orqali ulanib turadi.» (ok) |
| tugma #t-f2 | «S2 sensori ishdan chiqdi (simi uzildi deb faraz qiling). Aravacha S2 ga yetganda nima bo'lishini kuzating.» (xato)<br>«Diqqat: aravacha chekkaga tiralib qoldi, motor aylana olmayapti, tok keskin oshmoqda...» (xato)<br>«QF o'chdi! Aravacha chekkaga tiralib motor tiqilib qoldi, tok nominaldan 5–7 marta oshdi va avtomat himoyasi ishladi. Sababi: S2 ishlamadi, motorni teskari buradigan buyruq kelmadi.» (xato) |
| tugma #t-f2 | «S2 sensori tuzatildi.» (—) |
| tugma #power | «Kuchlanish o'chirildi. Sxemani o'zgartirishingiz mumkin.» (—) |

**Imtihon rejimi — «Tekshirish» natijalari:**

- «Tekshiruv: 2 ta xato sim, 17 ta bajarilmagan bosqich.» (xato)
  - Xato sim: Manba L1 (380 V, A fazasi) rozetkasi va QF 3-qisqich: L2 fazasi kirishi. Bu qisqich L2 uchun mo'ljallangan. Bu yerga L1 ni ulasangiz, L2 bilan bir nuqtada fazalararo qisqa tutashuv bo'ladi va QF darhol o'chadi. L1 rozetkasi avtomat QF ning 1-qisqichiga ulanadi.
  - Xato sim: KM2 (orqaga) 2/T1: chiqish (motorga) va XM:1 — motor kabeli, U1 (jigarrang tomir). KM2 motorni teskari aylantirishi uchun ikki fazani almashtiradi: T1→W1, T2→V1, T3→U1. Agar KM1 dagidek ulasangiz, motor ikkala kontaktorda ham bir tomonga aylanadi.
  - Bajarilmagan: Manba L1, L2, L3 → avtomat QF ning 1, 3, 5 qisqichlari
  - Bajarilmagan: QF chiqishi 2, 4, 6 → KM1 ning 1/L1, 3/L2, 5/L3
  - Bajarilmagan: KM2 kirishi KM1 kirishiga parallel: L1–L1, L2–L2, L3–L3
  - Bajarilmagan: KM1 chiqishi → XM (motor): T1→U1, T2→V1, T3→W1
  - Bajarilmagan: KM2 chiqishi → XM, fazalarni almashtirib: T1→W1, T2→V1, T3→U1
  - Bajarilmagan: Himoya yerlash: manba E → blok ⏚ va XM:PE (motor korpusi)
  - Yana 11 ta bosqich bajarilmagan.
- «Sxema to'g'ri va to'liq. Kuchlanish berishingiz mumkin.» (ok)

### 11 uy-elektr-shiti

Ochilishdagi xabar: «Namuna: manba L hisoblagichning 1-qisqichiga ulangan. Endi manba N ni 3-qisqichga ulang.»

Qadamlar ro'yxati: 12 ta (ochilishda tayyor: 0). Namunaviy (oldindan ulangan) simlar: 1 ta.

**O'rganish rejimida noto'g'ri ulanish xabarlari** (sim qo'yilmaydi, qizil sim bir lahza ko'rinadi):

| Ulanish | Xabar | Ohang |
|---|---|---|
| sw.l2 — lamp.l | Kalit L2 ikki joydan boshqarish (prohodnoy) sxemasi uchun; bu yerda ishlatilmaydi. Lampa L1 ga ulanadi. | xato |
| d1.l1 — d1.l2 | Bir qurilmaning ikki klemmasini o'zaro ulash tokni qurilmadan chetlab o'tkazadi. D1 L kirishi faza shinasidan (rele OUT L yoki qo'shni difavtomat L) keladi. | xato |
| src.e — x1.l | Himoya yerlash (PE) faza yoki nolga ulanmaydi: odamni tok urishidan himoya qiluvchi sim tok o'tkazmasligi kerak. E faqat rozetkalarning ⏚ qisqichiga boradi. | xato |
| sw.l — lamp.n | Kalit faqat fazani (L) uzadi. Nolni uzsangiz, lampa o'chgan bo'lsa ham patronda 220 V qoladi — lampani almashtirayotganda tok urishi mumkin. | xato |
| src.n — mt.1 | Faza (L) va nol (N) bir nuqtaga tushib qoladi: bu qisqa tutashuv. Manba N hisoblagichning 3-qisqichiga (nol kirishi) ulanadi. | xato |
| src.n — mt.4 | Hisoblagich 4 — nol chiqishi: QF1 ning 3 (N) qisqichiga boradi. | xato |
| d1.l2 — d2.l2 | Difavtomatlarning chiqishlari bir-biriga ulanmaydi: har biri o'z rozetkasini himoya qiladi. | xato |
| d1.l2 — x2.l | Har bir difavtomat o'z rozetkasiga ulanadi: D1 → X1, D2 → X2, D3 → X3. | xato |
| d1.n2 — kv.no | RCBO chiqishidagi N faqat o'z rozetkasiga boradi. Agar uni umumiy nol shinasiga ulasangiz, RCBO kirgan va qaytgan tokni solishtira olmaydi va asossiz o'chadi. | xato |
| d1.l2 — kv.lo | Difavtomat chiqishini kirish shinasiga ulash uni chetlab o'tadi: rozetka himoyasiz qoladi. D1 L chiqishi faqat X1 rozetkaning L qisqichiga boradi. | xato |
| x1.l — kv.lo | Rozetka umumiy shinaga to'g'ridan ulanmaydi: L va N difavtomatning pastki chiqishidan keladi, aks holda 30 mA sizish himoyasi ishlamaydi. | xato |
| kv.lo — qf1.l2 | Rele kuchlanishi: pastki IN qisqichlariga QF1 dan keladi, yuqori OUT qisqichlaridan iste'molchilarga ketadi. | xato |
| kv.li — d1.l1 | Rele kuchlanishi: pastki IN — kirish (QF1 dan), yuqori OUT — chiqish (difavtomatlar va yoritishga). Rele IN L (pastda) QF1 ning 2-chiqishidan keladi. | xato |
| lamp.n — x1.n | Rozetka umumiy shinaga to'g'ridan ulanmaydi: L va N difavtomatning pastki chiqishidan keladi, aks holda 30 mA sizish himoyasi ishlamaydi. | xato |
| lamp.l — qf2.l1 | Lampaga faza kalit orqali keladi: QF2 → kalit L, kalit L1 → lampa L. Kalitni chetlab o'tsangiz lampani o'chirib bo'lmaydi. | xato |
| qf1.l1 — kv.li | Rele kuchlanishi: pastki IN — kirish (QF1 dan), yuqori OUT — chiqish (difavtomatlar va yoritishga). QF1 1 (L) — hisoblagichning 2-qisqichidan keladi. | xato |
| qf2.l2 — lamp.l | Lampaga faza kalit orqali keladi: QF2 → kalit L, kalit L1 → lampa L. Kalitni chetlab o'tsangiz lampani o'chirib bo'lmaydi. | xato |
| mt.2 — kv.li | Hisoblagich 2 — faza chiqishi: QF1 ning 1 (L) qisqichiga boradi. | xato |

**To'g'ri ulanish va boshqa xabarlar (o'rganish rejimi):**

| Qadam | Xabar(lar) |
|---|---|
| bosish mt.3 | «Hisoblagich 3: nol kirishi (manbadan). Boshqa klemmaga sudrang yoki ikkinchisini bosing.» (—) |
| bosish mt.3 | «Hisoblagich 3: nol kirishi (manbadan). Boshqa klemmaga sudrang yoki ikkinchisini bosing.» (—)<br>«Klemma halqasini bosib boshqasiga sudrang yoki ikkita klemmani ketma-ket bosing.» (—) |
| sim src.n — mt.3 | «To'g'ri ulandi. 1 / 12 bosqich tayyor.» (ok) |
| tugma #undo | «Oxirgi sim olib tashlandi.» (—) |
| tugma #hint | «Maslahat: Manba L → hisoblagich 1, manba N → hisoblagich 3» (—) |
| sim sw.l1 — lamp.l | «Sxema to'g'ri yig'ildi. Kuchlanish bering, so'ng avtomatlarni yoqing.» (ok) |
| tugma #power | «Kuchlanish berildi: hisoblagichga 220 V keldi. Endi QF1 ni yoqing — kuchlanish relesi tarmoqni tekshiradi.» (ok) |
| tugma #b-qf1 | «QF1 yoqildi.» (—)<br>«Kuchlanish relesi tarmoqni tekshiryapti: U = 230 V me'yorda. 3 soniya kutib iste'molchilarni ulaydi (real relelarda bu vaqt 5–600 s qilib sozlanadi).» (—)<br>«Kuchlanish relesi ichki kontaktini yopdi: faza va nol shinalariga 230 V berildi. Endi difavtomatlar va QF2 ni yoqing.» (ok) |
| tugma #b-d1 | «D1 yoqildi.» (—) |
| tugma #b-d2 | «D2 yoqildi.» (—) |
| tugma #b-d3 | «D3 yoqildi.» (—) |
| tugma #b-qf2 | «QF2 yoqildi.» (—) |
| tugma #b-sw | «Kalit yoqildi: L va L1 tutashdi.» (—) |
| tanlash #a-x1 = kettle | «X1 rozetkaga ulandi: Choynak 2,0 kW.» (—) |
| tanlash #a-x2 = tv | «X2 rozetkaga ulandi: Televizor 0,15 kW.» (—) |
| tugma #t-d1 | «T tugmasi ichki rezistor orqali 30 mA dan ortiq sun'iy sizish hosil qildi — D1 o'chdi. Bu tekshiruvni oyiga bir marta qilish tavsiya etiladi.» (ok) |
| tanlash #a-x3 = leak | «X3 rozetkaga ulandi: Nosoz choynak: korpusga sizish 50 mA.» (—)<br>«X3: choynak korpusiga 50 mA tok sizyapti (PE orqali yerga). D3 kirgan va qaytgan tok farqini sezib o'chdi — odamni tok urishidan saqlaydi.» (xato) |
| tanlash #a-x3 = short | «X3 rozetkaga ulandi: Shnuri shikastlangan fen: qisqa tutashuv.» (—)<br>«X3: shnurda qisqa tutashuv! Tok yuzlab amperga yetdi va D3 ning elektromagnit ajratgichi millisekundlarda o'chirdi.» (xato) |
| tanlash #a-x2 = strip | «X2 rozetkaga ulandi: Uzaytirgich: choynak + isitgich 4,5 kW.» (—)<br>«X2: 19.6 A — D2 (16 A) uchun ortiqcha yuk. Issiqlik ajratgichi (bimetall) qizib avtomatni o'chirdi. Vaqt namoyish uchun tezlashtirilgan.» (xato) |
| tanlash #a-x1 = oven | «X1 rozetkaga ulandi: Duxovka 3,5 kW.» (—) |
| tanlash #a-x2 = oven | «X2 rozetkaga ulandi: Duxovka 3,5 kW.» (—) |
| tanlash #a-x3 = oven | «X3 rozetkaga ulandi: Duxovka 3,5 kW.» (—)<br>«Umumiy tok 46.1 A — kirish avtomati QF1 (32 A) uchun ortiqcha. U butun uyni uzdi: hamma kuchli asboblarni bir vaqtda yoqmang. Vaqt tezlashtirilgan.» (xato) |
| surgich #u = 260 | «Kuchlanish 260 V — 250 V dan yuqori! Rele iste'molchilarni darhol uzdi: bunday kuchlanishda televizor, muzlatgich kabi asboblar kuyishi mumkin.» (xato) |
| surgich #u = 170 | «Kuchlanish 170 V — 180 V dan past! Rele iste'molchilarni uzdi: past kuchlanishda dvigatelli asboblar (muzlatgich, nasos) qizib ishdan chiqadi.» (xato) |
| surgich #u = 230 | «Kuchlanish relesi tarmoqni tekshiryapti: U = 230 V me'yorda. 3 soniya kutib iste'molchilarni ulaydi (real relelarda bu vaqt 5–600 s qilib sozlanadi).» (—)<br>«Kuchlanish relesi ichki kontaktini yopdi: faza va nol shinalariga 230 V berildi. Endi difavtomatlar va QF2 ni yoqing.» (ok) |
| tugma #b-sw | «Kalit o'chirildi: lampa fazadan uzildi.» (—) |
| tugma #power | «Kuchlanish o'chirildi. Sxemani o'zgartirishingiz mumkin.» (—) |

**Imtihon rejimi — «Tekshirish» natijalari:**

- «Tekshiruv: 2 ta xato sim, 12 ta bajarilmagan bosqich.» (xato)
  - Xato sim: Manba L (faza) rozetkasi va Hisoblagich 3: nol kirishi (manbadan). Faza (L) va nol (N) bir nuqtaga tushib qoladi: bu qisqa tutashuv. Manba L hisoblagichning 1-qisqichiga (faza kirishi) ulanadi.
  - Xato sim: Manba E (himoya yerlash) rozetkasi va X1 rozetkasi: N (nol). Himoya yerlash (PE) faza yoki nolga ulanmaydi: odamni tok urishidan himoya qiluvchi sim tok o'tkazmasligi kerak. E faqat rozetkalarning ⏚ qisqichiga boradi.
  - Bajarilmagan: Manba L → hisoblagich 1, manba N → hisoblagich 3
  - Bajarilmagan: Hisoblagich 2 → QF1 (1, L), hisoblagich 4 → QF1 (3, N)
  - Bajarilmagan: QF1 chiqishi → kuchlanish relesi IN: L → L, N → N
  - Bajarilmagan: Rele OUT L → D1, D2, D3 ning L kirishi va QF2 (faza shinasi)
  - Bajarilmagan: Rele OUT N → D1, D2, D3 ning N kirishi (nol shinasi)
  - Bajarilmagan: D1 chiqishi → X1 rozetka: L → L, N → N
  - Yana 6 ta bosqich bajarilmagan.
- «Sxema to'g'ri va to'liq. Kuchlanish berishingiz mumkin.» (ok)


## 3. Eski kodda topilgan g'alati holatlar (o'zgartirilmadi)

Bular hozirgi xulq-atvorning bir qismi va golden fayllarga shunday yozilgan. Ko'chirishda ular **saqlanadi**.
Tuzatish kerakmi, siz hal qilasiz. Bu alohida vazifa bo'ladi.

1. **09:** manbaning ikki rozetkasini ulash (masalan L1 — L2, E — L1) «Bir qurilmaning ikki klemmasini o'zaro ulash...»
   xabarini beradi. Sababi: `reason()` da "bir qurilma" tekshiruvi birinchi turadi, rozetkalar esa bitta `src`
   qurilmasi. Shuning uchun maxsus «Manba rozetkalarini o'zaro ulash qisqa tutashuv hosil qiladi.» xabari hech qachon
   chiqmaydi.
2. **08:** «Elektromagnit himoya ishladi: yadro g'altakka tortilib...» xabari hech qachon chiqmaydi. «Qisqa tutashuv»
   tugmasi faqat «Qisqa tutashuv! Tok keskin oshdi...» deydi va avtomatni darhol o'chiradi. `tripNow("magnetic")`
   chaqirilmaydi.
3. **08 (kompyuterda), tasdiqlanmagan:** detal ro'yxatdan tanlangach, sichqoncha harakatlanganda detal kursorga
   ergashadi. Avtomatik sinovda kursorni joyga olib borib, bosib, biroz siljitib qo'yib yuborish ayrim detallarni
   (masalan 3 · Harakatlanuvchi kontakt) joyiga qo'ymadi va hech qanday xabar chiqmadi. Bu sinov usulining
   kamchiligi bo'lishi ham mumkin. Barmoq bilan joyni bosish esa barqaror ishlaydi va 08 testlari shuni ishlatadi.
   Sichqoncha bilan yig'ishni **qo'lda tekshirish kerak**.

## 4. Qo'lda tekshirish kerak (avtomatik sinab bo'lmaydi)

- Ovoz: sim ulash/chiqishda chiqillash, kontaktor, motor shovqini (09, 10), qisqa tutashuv/yoy, «Ovoz» belgisi.
- Haqiqiy telefonda: barmoq bilan simni sudrab ulash, ikki barmoq bilan kattalashtirish (pinch), to'liq ekran
  rejimida surish, sahifa aylanishi (portret/landshaft).
- Haqiqiy telefonda silliqlik (FPS) va ochilish vaqti. Bu muhitda GPU dasturiy.
- PE sim rangining (sariq-yashil chiziqli) ko'rinishi: 07 va 09 da hozir to'g'ri (`TubeGeometry` UV beradi).
  Ko'chirishda `lightTube` ishlatiladi (UV bor, PR #29). Har PR da skrinshot bilan tekshiriladi.
- 09: START va STOP ni bir vaqtda bosib turish (ikki barmoq) — bitta sichqoncha bilan sinab bo'lmaydi.
