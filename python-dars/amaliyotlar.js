/* Python Dars — amaliy mashg'ulotlar bazasi.
   «Energetikada EHM ni qo'llash» fanining 1–8 amaliy mashg'ulotlari (har birida 20 ta variant).

   Har bir amaliyot:
     id          — qisqa, takrorlanmas nom
     nomi, mavzu — ro'yxatda ko'rinadigan nom va qisqa izoh
     topshiriq   — barcha variantlar uchun umumiy topshiriqlar
     nazariy     — formulalar, jadvallar, Python eslatmalari (talabaga «Nazariy ma'lumot» bo'limida ko'rinadi)
     eslatma     — sariq ogohlantirish (ixtiyoriy)
     argvVariant — true bo'lsa, «Argumentlar» maydoniga variant raqami qo'yiladi (python generator.py N)
     namunalar   — namuna dasturlar: nomi, izoh, kod
     variantlar  — matn (variant ma'lumotlari), kirish (input() uchun qiymatlar, har qatorga bittadan)
     qiyin       — ustoz iqtidorli talabaga yuboradigan qiyinroq masalalar: sarlavha, matn, kirish

   Bu fayl avtomatik yig'ilgan; o'zgartirish kerak bo'lsa, shu yerda bevosita tahrirlash mumkin. */

window.AMALIYOTLAR = [
 {
  "id": "a1",
  "nomi": "1-amaliy mashg'ulot: Aktiv, reaktiv, to'la quvvat va quvvat koeffitsiyenti",
  "mavzu": "O'zgaruvchilar, input()/print(), f-satr, math moduli",
  "topshiriq": "1. Iste'molchining to'la (S), aktiv (P), reaktiv (Q) quvvatini va faza siljish burchagini (φ) hisoblovchi dastur tuzing. Ma'lumotlar input() orqali kiritilsin, natijalar ikki xona aniqlikda chiqsin (namuna: quvvat.py). Natijani qo'lda hisoblangan qiymat bilan solishtiring.\n2. Berilgan sutkalik ish vaqti t va tarif c₀ bo'yicha oylik (30 kun) energiya sarfi va to'lovni hisoblang.\n3. cosφ ni talab qilingan cosφ₂ ga yetkazish uchun kondensator quvvati Qk ni, kompensatsiyadan keyingi S va I ni aniqlang; tok necha foizga kamayganini chiqaring.\n4. Natijalarni namunadagi (kompensatsiya.py) kabi «Oldin / Keyin» qiyosiy jadval ko'rinishida chiqaring.\n\nKiritish tartibi: U, I, cosφ₁, t, c₀, cosφ₂ — «Kiruvchi ma'lumotlar» maydoni shu tartibda to'ldirilgan.\nBir fazali (220 V) variantda √3 ko'paytuvchisi olinmaydi: S = U·I, I = S/U.",
  "nazariy": "Uch fazali tarmoq (U, I — chiziqli):\n  S = √3·U·I        P = √3·U·I·cosφ = S·cosφ\n  Q = S·sinφ = P·tgφ        S = √(P² + Q²)\n  cosφ = P / S        I = S / (√3·U)\nBir fazali (220 V): S = U·I,  P = U·I·cosφ,  I = S/U\n\nEnergiya va to'lov:  W = P·t (kWh),  C = W·c₀ (so'm)\nKondensator quvvati:  Qk = P·(tgφ₁ − tgφ₂)\n\nBirliklar: U = 380 V, I = 25 A → S = √3·380·25 = 16 454 VA = 16.45 kVA (/1000).\n\nPython eslatmalari:\n  import math — math.sqrt(), math.acos() (natija radianda), math.tan() (argument radianda),\n  math.degrees() — radiandan gradusga, math.pi\n  input() har doim matn qaytaradi → float(input(\"U, V: \"))\n  O'nli kasr nuqta bilan: 0.85 (0,85 — xato)\n  f-satr: f\"{P:.2f}\" — 2 xona;  f\"{Q1:>12.1f}\" — 12 belgi kenglikda o'ngga tekislash\n\nTipik xatolar: input() ni float() ga o'tkazmaslik (TypeError), import math ni unutish (NameError),\nmath.cos(30) ni gradus deb o'ylash (to'g'risi: math.cos(math.radians(30))), V va kV ni aralashtirish.",
  "namunalar": [
   {
    "nomi": "quvvat.py",
    "izoh": "1-masala: 380 V, 25 A, cosφ = 0.85 → S = 16.45 kVA, P = 13.99 kW, Q = 8.67 kVAr, φ = 31.79°",
    "kod": "# quvvat.py - uch fazali iste'molchining quvvatlari\nimport math\n\nU   = float(input(\"Chiziqli kuchlanish U, V: \"))\nI   = float(input(\"Tok kuchi I, A: \"))\ncos = float(input(\"Quvvat koeffitsiyenti cos(fi): \"))\n\nS   = math.sqrt(3) * U * I / 1000      # kVA\nP   = S * cos                          # kW\nfi  = math.acos(cos)                   # radian\nQ   = P * math.tan(fi)                 # kVAr\n\nprint(\"-\" * 42)\nprint(f\"To'la quvvat   S = {S:.2f} kVA\")\nprint(f\"Aktiv quvvat   P = {P:.2f} kW\")\nprint(f\"Reaktiv quvvat Q = {Q:.2f} kVAr\")\nprint(f\"Burchak       fi = {math.degrees(fi):.2f} gradus\")\n"
   },
   {
    "nomi": "kompensatsiya.py",
    "izoh": "2-masala: P = 250 kW, U = 0.38 kV, cosφ 0.80 → 0.95, 16 soat, 900 so'm → Qk = 105.3 kVAr, tok 15.8 % ga kamayadi",
    "kod": "# kompensatsiya.py - quvvatlar, energiya sarfi va reaktiv quvvat kompensatsiyasi\nimport math\n\n# 1. Dastlabki ma'lumotlarni kiritish\nP     = float(input(\"Aktiv quvvat P, kW: \"))\nU     = float(input(\"Chiziqli kuchlanish U, kV: \"))\ncos1  = float(input(\"Joriy quvvat koeffitsiyenti cos(fi1): \"))\ncos2  = float(input(\"Talab qilingan cos(fi2): \"))\nt     = float(input(\"Sutkadagi ish vaqti t, soat: \"))\ntarif = float(input(\"Tarif, so'm/kWh: \"))\n\n# 2. Kompensatsiyagacha bo'lgan rejim\ntg1 = math.tan(math.acos(cos1))\nQ1 = P * tg1                       # kVAr\nS1 = math.sqrt(P**2 + Q1**2)       # kVA\nI1 = S1 / (math.sqrt(3) * U)       # A\n\n# 3. Kompensatsiyadan keyingi rejim\ntg2 = math.tan(math.acos(cos2))\nQ2 = P * tg2\nS2 = math.sqrt(P**2 + Q2**2)\nI2 = S2 / (math.sqrt(3) * U)\nQk = P * (tg1 - tg2)                # kondensator quvvati, kVAr\n\n# 4. Energiya sarfi va to'lov (30 kunlik oy)\nW_kun = P * t\nW_oy = W_kun * 30\ntolov = W_oy * tarif\n\n# 5. Natijalarni chiqarish\nprint(\"-\" * 46)\nprint(f\"{'Ko`rsatkich':<22}{'Oldin':>12}{'Keyin':>12}\")\nprint(\"-\" * 46)\nprint(f\"{'cos(fi)':<22}{cos1:>12.2f}{cos2:>12.2f}\")\nprint(f\"{'Q, kVAr':<22}{Q1:>12.1f}{Q2:>12.1f}\")\nprint(f\"{'S, kVA':<22}{S1:>12.1f}{S2:>12.1f}\")\nprint(f\"{'I, A':<22}{I1:>12.1f}{I2:>12.1f}\")\nprint(\"-\" * 46)\nprint(f\"Kondensator quvvati Qk = {Qk:.1f} kVAr\")\nprint(f\"Tok {100*(I1-I2)/I1:.1f} % ga kamayadi\")\nprint(f\"Oylik energiya sarfi W = {W_oy:,.0f} kWh\")\nprint(f\"Oylik to'lov = {tolov:,.0f} so'm\")\n"
   }
  ],
  "variantlar": [
   {
    "matn": "Tarmoq: 3 fazali\nU = 380 V\nI = 40 A\ncosφ₁ = 0.75\nt = 18 soat/kun\nc₀ = 750 so'm/kWh\ncosφ₂ = 0.92 (talab qilingan)",
    "kirish": "380\n40\n0.75\n18\n750\n0.92"
   },
   {
    "matn": "Tarmoq: 3 fazali\nU = 380 V\nI = 80 A\ncosφ₁ = 0.72\nt = 16 soat/kun\nc₀ = 750 so'm/kWh\ncosφ₂ = 0.96 (talab qilingan)",
    "kirish": "380\n80\n0.72\n16\n750\n0.96"
   },
   {
    "matn": "Tarmoq: 3 fazali\nU = 380 V\nI = 25 A\ncosφ₁ = 0.7\nt = 8 soat/kun\nc₀ = 1100 so'm/kWh\ncosφ₂ = 0.95 (talab qilingan)",
    "kirish": "380\n25\n0.7\n8\n1100\n0.95"
   },
   {
    "matn": "Tarmoq: 3 fazali\nU = 380 V\nI = 16 A\ncosφ₁ = 0.78\nt = 8 soat/kun\nc₀ = 1100 so'm/kWh\ncosφ₂ = 0.92 (talab qilingan)",
    "kirish": "380\n16\n0.78\n8\n1100\n0.92"
   },
   {
    "matn": "Tarmoq: 1 fazali\nU = 220 V\nI = 25 A\ncosφ₁ = 0.72\nt = 12 soat/kun\nc₀ = 750 so'm/kWh\ncosφ₂ = 0.96 (talab qilingan)",
    "kirish": "220\n25\n0.72\n12\n750\n0.96"
   },
   {
    "matn": "Tarmoq: 3 fazali\nU = 380 V\nI = 100 A\ncosφ₁ = 0.85\nt = 6 soat/kun\nc₀ = 900 so'm/kWh\ncosφ₂ = 0.92 (talab qilingan)",
    "kirish": "380\n100\n0.85\n6\n900\n0.92"
   },
   {
    "matn": "Tarmoq: 3 fazali\nU = 660 V\nI = 80 A\ncosφ₁ = 0.75\nt = 14 soat/kun\nc₀ = 1100 so'm/kWh\ncosφ₂ = 0.93 (talab qilingan)",
    "kirish": "660\n80\n0.75\n14\n1100\n0.93"
   },
   {
    "matn": "Tarmoq: 3 fazali\nU = 380 V\nI = 80 A\ncosφ₁ = 0.72\nt = 14 soat/kun\nc₀ = 850 so'm/kWh\ncosφ₂ = 0.92 (talab qilingan)",
    "kirish": "380\n80\n0.72\n14\n850\n0.92"
   },
   {
    "matn": "Tarmoq: 3 fazali\nU = 380 V\nI = 100 A\ncosφ₁ = 0.78\nt = 16 soat/kun\nc₀ = 800 so'm/kWh\ncosφ₂ = 0.96 (talab qilingan)",
    "kirish": "380\n100\n0.78\n16\n800\n0.96"
   },
   {
    "matn": "Tarmoq: 1 fazali\nU = 220 V\nI = 20 A\ncosφ₁ = 0.72\nt = 6 soat/kun\nc₀ = 900 so'm/kWh\ncosφ₂ = 0.95 (talab qilingan)",
    "kirish": "220\n20\n0.72\n6\n900\n0.95"
   },
   {
    "matn": "Tarmoq: 3 fazali\nU = 380 V\nI = 125 A\ncosφ₁ = 0.85\nt = 16 soat/kun\nc₀ = 1200 so'm/kWh\ncosφ₂ = 0.96 (talab qilingan)",
    "kirish": "380\n125\n0.85\n16\n1200\n0.96"
   },
   {
    "matn": "Tarmoq: 3 fazali\nU = 380 V\nI = 63 A\ncosφ₁ = 0.82\nt = 14 soat/kun\nc₀ = 900 so'm/kWh\ncosφ₂ = 0.93 (talab qilingan)",
    "kirish": "380\n63\n0.82\n14\n900\n0.93"
   },
   {
    "matn": "Tarmoq: 3 fazali\nU = 380 V\nI = 25 A\ncosφ₁ = 0.72\nt = 14 soat/kun\nc₀ = 1200 so'm/kWh\ncosφ₂ = 0.94 (talab qilingan)",
    "kirish": "380\n25\n0.72\n14\n1200\n0.94"
   },
   {
    "matn": "Tarmoq: 3 fazali\nU = 660 V\nI = 63 A\ncosφ₁ = 0.8\nt = 8 soat/kun\nc₀ = 800 so'm/kWh\ncosφ₂ = 0.96 (talab qilingan)",
    "kirish": "660\n63\n0.8\n8\n800\n0.96"
   },
   {
    "matn": "Tarmoq: 1 fazali\nU = 220 V\nI = 12 A\ncosφ₁ = 0.75\nt = 16 soat/kun\nc₀ = 850 so'm/kWh\ncosφ₂ = 0.95 (talab qilingan)",
    "kirish": "220\n12\n0.75\n16\n850\n0.95"
   },
   {
    "matn": "Tarmoq: 3 fazali\nU = 380 V\nI = 50 A\ncosφ₁ = 0.7\nt = 8 soat/kun\nc₀ = 1000 so'm/kWh\ncosφ₂ = 0.94 (talab qilingan)",
    "kirish": "380\n50\n0.7\n8\n1000\n0.94"
   },
   {
    "matn": "Tarmoq: 3 fazali\nU = 380 V\nI = 40 A\ncosφ₁ = 0.88\nt = 20 soat/kun\nc₀ = 800 so'm/kWh\ncosφ₂ = 0.92 (talab qilingan)",
    "kirish": "380\n40\n0.88\n20\n800\n0.92"
   },
   {
    "matn": "Tarmoq: 3 fazali\nU = 380 V\nI = 32 A\ncosφ₁ = 0.88\nt = 8 soat/kun\nc₀ = 750 so'm/kWh\ncosφ₂ = 0.97 (talab qilingan)",
    "kirish": "380\n32\n0.88\n8\n750\n0.97"
   },
   {
    "matn": "Tarmoq: 3 fazali\nU = 380 V\nI = 32 A\ncosφ₁ = 0.88\nt = 14 soat/kun\nc₀ = 1100 so'm/kWh\ncosφ₂ = 0.97 (talab qilingan)",
    "kirish": "380\n32\n0.88\n14\n1100\n0.97"
   },
   {
    "matn": "Tarmoq: 1 fazali\nU = 220 V\nI = 10 A\ncosφ₁ = 0.7\nt = 20 soat/kun\nc₀ = 1000 so'm/kWh\ncosφ₂ = 0.93 (talab qilingan)",
    "kirish": "220\n10\n0.7\n20\n1000\n0.93"
   }
  ],
  "qiyin": [
   {
    "sarlavha": "Kompensatsiyaning iqtisodiy samarasi",
    "matn": "Sex: P = 250 kW, U = 0.38 kV, joriy cosφ₁ = 0.80. Sexni ta'minlovchi kabelning bir faza qarshiligi R = 0.012 Ω. Sex yiliga 6000 soat ishlaydi, tarif 900 so'm/kWh, kondensator narxi 150 000 so'm/kVAr.\ncosφ₂ ni 0.85 dan 0.99 gacha 0.01 qadam bilan o'zgartirib, har biri uchun jadval chiqaring: Qk, kompensatsiyadan keyingi tok I₂, kabeldagi isrof ΔP = 3·I²·R/1000 (kW), yillik tejalgan energiya va pul, kondensator narxi va oddiy qoplash muddati (yil).\nHar 0.01 qadam uchun marjinal qoplash muddatini ham hisoblang: (narxning o'sishi) / (yillik tejamning o'sishi). Marjinal qoplash muddati 3 yildan oshmaydigan eng katta cosφ₂ ni dastur o'zi tanlasin va nima uchun cosφ₂ → 1 iqtisodiy emasligini xulosa qilib chiqarsin.",
    "kirish": ""
   },
   {
    "sarlavha": "Bir nechta iste'molchi — umumiy cosφ",
    "matn": "Avval iste'molchilar soni n, keyin har biri uchun nomi, P (kW) va cosφ kiritiladi (U = 0.38 kV).\nHar iste'molchi uchun Q va S ni, butun guruh uchun jami P, jami Q, jami S, umumiy cosφ va tokni hisoblang. Natijani jadval qilib chiqaring.\nDastur umumiy cosφ ni cosφ larning oddiy o'rtachasi bilan ham solishtirsin va farqni ko'rsatsin — nima uchun o'rtacha cosφ noto'g'ri natija beradi? Eng past cosφ li iste'molchini va uni 0.95 ga yetkazish uchun Qk ni ham chiqaring.",
    "kirish": "4\nNasos\n180\n0.78\nKompressor\n250\n0.82\nYoritish\n40\n0.95\nPayvandlash\n90\n0.62"
   },
   {
    "sarlavha": "Transformator yuklanishi — teskari masala",
    "matn": "Sex transformatori Sn = 400 kVA. Sexning aktiv yuklamasi P = 330 kW, cosφ₁ = 0.74.\n1) Transformator ortiqcha yuklanganmi (S > Sn)? Yuklanish koeffitsiyenti k = S/Sn ni chiqaring.\n2) Transformator 90 % dan oshmasligi (S ≤ 0.9·Sn) uchun cosφ₂ ning eng kichik qiymatini 0.01 aniqlikda while sikli bilan toping.\n3) Shu cosφ₂ uchun zarur Qk ni va uni 25 kVAr li standart seksiyalar bilan necha seksiya bilan qoplash mumkinligini (yuqoriga yaxlitlab) aniqlang; seksiyalar o'rnatilgandan keyingi haqiqiy cosφ va S ni hisoblang.",
    "kirish": ""
   }
  ]
 },
 {
  "id": "a2",
  "nomi": "2-amaliy mashg'ulot: Kabel kesimini tanlash va tarif kalkulyatori",
  "mavzu": "if–elif–else, for, while, break, continue, tsiklning else bo'limi, ro'yxat va lug'at",
  "topshiriq": "1. Berilgan I va muhit harorati t uchun kabel kesimini qo'lda tanlang, so'ngra namuna 1-dasturni (kabel_harorat.py) ishga tushirib natijani tekshiring. Haroratni 25 °C ga o'zgartirsak kesim qanday o'zgaradi?\n2. 1-dasturni shunday o'zgartiringki, jadvalda yo'q harorat (masalan, 32 °C) kiritilganda dastur eng yaqin yuqori haroratning koeffitsiyentini olsin (maslahat: for sikli va if t <= t_jadval: sharti).\n3. Zonalar bo'yicha berilgan iste'mol W_kun, W_pik, W_tun va bazaviy tarif c₀ uchun uch zonali va bir zonali to'lovni hisoblovchi dastur tuzing; farqni foizda chiqaring va tarif iste'molchi uchun foydali yoki zararli ekani haqida xulosa bersin (if–else).\n4. while sikli yordamida pik zonadan tunga 100 kWh lik qadamlar bilan qancha energiya ko'chirilganda uch zonali to'lov bir zonaliga teng yoki undan kichik bo'lishini aniqlang (pik iste'mol tugagunga qadar).\n\n«Kiruvchi ma'lumotlar» maydonida 1–2-topshiriq uchun I va t turibdi. 3–4-topshiriq dasturi uchun maydonga c₀, W_kun, W_pik, W_tun ni yozing.",
  "nazariy": "Harorat tuzatish koeffitsiyenti kₜ (o'quv maqsadida, taxminiy):\n  t, °C :  15    20    25    30    35    40    45\n  kₜ    : 1.11  1.06  1.00  0.94  0.87  0.79  0.71\n\nTanlash sharti: Idop·kₜ ≥ I  ⇔  Idop ≥ I/kₜ = Ihis\nJadvaldan Idop ≥ Ihis shartini qanoatlantiruvchi eng kichik kesim olinadi.\n\nKesimlar jadvali (havoda, +25 °C):\n  S, mm² : 1.5  2.5  4   6   10  16  25  35   50   70   95   120\n  Idop, A: 19   25   35  42  55  75  95  120  145  180  220  260\n\nUch zonali tarif (o'quv misoli):\n  kunduzgi (7:00–17:00) — c₀;  kechki pik (17:00–23:00) — 1.5·c₀;  tungi (23:00–7:00) — 0.5·c₀\n  C = W_kun·c₀ + W_pik·1.5·c₀ + W_tun·0.5·c₀\n  Bir zonali: C₁ = (W_kun + W_pik + W_tun)·c₀\n  Pikdan tunga ΔW ko'chirish tejami: ΔW·(1.5·c₀ − 0.5·c₀)\n\nPython: if–elif–else; for x in ro'yxat / range(n); while shart:; break, continue;\nfor … else — sikl break siz tugaganda else bajariladi; zip(S, Idop); enumerate(); lug'at: tarif[\"pik\"].",
  "namunalar": [
   {
    "nomi": "kabel_harorat.py",
    "izoh": "1-masala: I = 95 A, t = 35 °C → kₜ = 0.87, Ihis = 109.2 A, 35 mm² (120 A)",
    "kod": "# kabel_harorat.py - haroratni hisobga olib kabel kesimini tanlash\nS    = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120]\nIdop = [19, 25, 35, 42, 55, 75, 95, 120, 145, 180, 220, 260]\nkt_jadval = {15: 1.11, 20: 1.06, 25: 1.00, 30: 0.94, 35: 0.87, 40: 0.79, 45: 0.71}\n\nI = float(input(\"Hisobiy tok I, A: \"))\nt = int(input(\"Muhit harorati, C: \"))\nkt = kt_jadval[t]\nIhis = I / kt\nprint(f\"Harorat koeffitsiyenti kt = {kt}\")\nprint(f\"Keltirilgan tok Ihis = {Ihis:.1f} A\")\nfor s, i in zip(S, Idop):\n    if i >= Ihis:\n        print(f\"{s:>5} mm2 ({i} A) - TANLANDI, zaxira {100*(i-Ihis)/Ihis:.1f} %\")\n        break\n    print(f\"{s:>5} mm2 ({i} A) - yetmaydi\")\nelse:\n    print(\"Jadvalda mos kesim yo'q: parallel kabellar kerak\")\n"
   },
   {
    "nomi": "tarif_kalkulyator.py",
    "izoh": "2-masala: turar-joy binosining sutkalik grafigi, c₀ = 900 so'm/kWh",
    "kod": "# tarif_kalkulyator.py - uch zonali tarif bo'yicha to'lov\nyuklama = [60,50,45,42,42,48,70,110,120,95,85,80,\n           85,90,95,105,130,180,220,230,210,170,120,80]\nc0 = float(input(\"Bazaviy tarif c0, so'm/kWh: \"))\ntarif = {\"kun\": c0, \"pik\": 1.5 * c0, \"tun\": 0.5 * c0}\nW = {\"kun\": 0, \"pik\": 0, \"tun\": 0}\nfor soat, P in enumerate(yuklama):          # soat = 0..23, P = quvvat\n    if soat >= 23 or soat < 7:   zona = \"tun\"\n    elif soat < 17:              zona = \"kun\"\n    else:                        zona = \"pik\"\n    W[zona] += P                              # dt = 1 soat -> kWh\nprint(f\"{'Zona':<8}{'W, kWh':>8}{'Tarif':>9}{'To`lov, so`m':>16}\")\njami = 0\nfor zona in W:\n    tolov = W[zona] * tarif[zona]; jami += tolov\n    print(f\"{zona:<8}{W[zona]:>8}{tarif[zona]:>9.0f}{tolov:>16,.0f}\")\nbir_zonali = sum(yuklama) * c0\nprint(f\"Jami {jami:,.0f}; bir zonali {bir_zonali:,.0f}; farq {100*(jami-bir_zonali)/bir_zonali:+.1f} %\")\nkochirish = 300\nprint(f\"{kochirish} kWh ni pikdan tunga ko'chirish {kochirish*(tarif['pik']-tarif['tun']):,.0f} so'm tejaydi\")\n"
   }
  ],
  "variantlar": [
   {
    "matn": "I = 210 A\nt = 45 °C (muhit harorati)\nc₀ = 1000 so'm/kWh\nW_kun = 4109 kWh\nW_pik = 1899 kWh\nW_tun = 1153 kWh",
    "kirish": "210\n45"
   },
   {
    "matn": "I = 210 A\nt = 35 °C (muhit harorati)\nc₀ = 1000 so'm/kWh\nW_kun = 1377 kWh\nW_pik = 678 kWh\nW_tun = 1248 kWh",
    "kirish": "210\n35"
   },
   {
    "matn": "I = 240 A\nt = 40 °C (muhit harorati)\nc₀ = 1000 so'm/kWh\nW_kun = 3848 kWh\nW_pik = 681 kWh\nW_tun = 392 kWh",
    "kirish": "240\n40"
   },
   {
    "matn": "I = 210 A\nt = 25 °C (muhit harorati)\nc₀ = 850 so'm/kWh\nW_kun = 971 kWh\nW_pik = 1403 kWh\nW_tun = 1499 kWh",
    "kirish": "210\n25"
   },
   {
    "matn": "I = 36 A\nt = 35 °C (muhit harorati)\nc₀ = 950 so'm/kWh\nW_kun = 2455 kWh\nW_pik = 1639 kWh\nW_tun = 1460 kWh",
    "kirish": "36\n35"
   },
   {
    "matn": "I = 72 A\nt = 35 °C (muhit harorati)\nc₀ = 800 so'm/kWh\nW_kun = 4006 kWh\nW_pik = 1382 kWh\nW_tun = 329 kWh",
    "kirish": "72\n35"
   },
   {
    "matn": "I = 36 A\nt = 15 °C (muhit harorati)\nc₀ = 850 so'm/kWh\nW_kun = 4202 kWh\nW_pik = 795 kWh\nW_tun = 1428 kWh",
    "kirish": "36\n15"
   },
   {
    "matn": "I = 28 A\nt = 45 °C (muhit harorati)\nc₀ = 950 so'm/kWh\nW_kun = 1936 kWh\nW_pik = 1202 kWh\nW_tun = 1410 kWh",
    "kirish": "28\n45"
   },
   {
    "matn": "I = 85 A\nt = 35 °C (muhit harorati)\nc₀ = 850 so'm/kWh\nW_kun = 3222 kWh\nW_pik = 902 kWh\nW_tun = 1223 kWh",
    "kirish": "85\n35"
   },
   {
    "matn": "I = 28 A\nt = 40 °C (muhit harorati)\nc₀ = 800 so'm/kWh\nW_kun = 2473 kWh\nW_pik = 1641 kWh\nW_tun = 769 kWh",
    "kirish": "28\n40"
   },
   {
    "matn": "I = 190 A\nt = 35 °C (muhit harorati)\nc₀ = 800 so'm/kWh\nW_kun = 3499 kWh\nW_pik = 820 kWh\nW_tun = 845 kWh",
    "kirish": "190\n35"
   },
   {
    "matn": "I = 95 A\nt = 35 °C (muhit harorati)\nc₀ = 900 so'm/kWh\nW_kun = 721 kWh\nW_pik = 443 kWh\nW_tun = 1353 kWh",
    "kirish": "95\n35"
   },
   {
    "matn": "I = 52 A\nt = 30 °C (muhit harorati)\nc₀ = 800 so'm/kWh\nW_kun = 4067 kWh\nW_pik = 895 kWh\nW_tun = 991 kWh",
    "kirish": "52\n30"
   },
   {
    "matn": "I = 45 A\nt = 15 °C (muhit harorati)\nc₀ = 1100 so'm/kWh\nW_kun = 602 kWh\nW_pik = 737 kWh\nW_tun = 629 kWh",
    "kirish": "45\n15"
   },
   {
    "matn": "I = 36 A\nt = 30 °C (muhit harorati)\nc₀ = 950 so'm/kWh\nW_kun = 3503 kWh\nW_pik = 1113 kWh\nW_tun = 1059 kWh",
    "kirish": "36\n30"
   },
   {
    "matn": "I = 45 A\nt = 35 °C (muhit harorati)\nc₀ = 1100 so'm/kWh\nW_kun = 1413 kWh\nW_pik = 1894 kWh\nW_tun = 752 kWh",
    "kirish": "45\n35"
   },
   {
    "matn": "I = 140 A\nt = 15 °C (muhit harorati)\nc₀ = 900 so'm/kWh\nW_kun = 1962 kWh\nW_pik = 331 kWh\nW_tun = 1039 kWh",
    "kirish": "140\n15"
   },
   {
    "matn": "I = 52 A\nt = 20 °C (muhit harorati)\nc₀ = 850 so'm/kWh\nW_kun = 3495 kWh\nW_pik = 506 kWh\nW_tun = 222 kWh",
    "kirish": "52\n20"
   },
   {
    "matn": "I = 36 A\nt = 30 °C (muhit harorati)\nc₀ = 950 so'm/kWh\nW_kun = 1327 kWh\nW_pik = 1696 kWh\nW_tun = 1345 kWh",
    "kirish": "36\n30"
   },
   {
    "matn": "I = 85 A\nt = 30 °C (muhit harorati)\nc₀ = 1000 so'm/kWh\nW_kun = 1381 kWh\nW_pik = 1798 kWh\nW_tun = 468 kWh",
    "kirish": "85\n30"
   }
  ],
  "qiyin": [
   {
    "sarlavha": "Kesimni tok VA kuchlanish pasayishi bo'yicha tanlash",
    "matn": "I, t, liniya uzunligi L (km), U = 0.38 kV va cosφ = 0.85 kiritiladi. Kabel mis, r₀ = 18.5 / S (Ω/km), x₀ = 0.08 Ω/km.\nKesim ikki shartni birga qanoatlantirishi kerak: 1) Idop·kₜ ≥ I; 2) ΔU% = √3·I·L·(r₀·cosφ + x₀·sinφ)·100 / (U·1000) ≤ 5 %.\nHar bir kesim uchun Ihis, ΔU% va qaysi shart bajarilmaganini jadvalda ko'rsating; ikkala shartni qanoatlantiruvchi eng kichik kesimni tanlang. Agar jadvalda yo'q bo'lsa (for … else), nechta parallel kabel kerakligini toping.",
    "kirish": "140\n35\n0.25"
   },
   {
    "sarlavha": "Parallel kabellarning optimal kombinatsiyasi",
    "matn": "Katta tok (masalan I = 610 A, t = 40 °C) uchun bitta kabel yetmaydi. n ta bir xil parallel kabel ishlatiladi; har birining toki I/n, lekin parallel yotqizish koeffitsiyenti kₚ = 1.0 (n=1), 0.9 (n=2), 0.85 (n=3), 0.8 (n≥4).\nIchma-ich sikllar bilan n = 1…6 va har kesim bo'yicha barcha mos variantlarni toping (Idop·kₜ·kₚ ≥ I/n). Ular orasidan jami mis kesimi n·S eng kichik bo'lgan variantni tanlang. Barcha mos variantlarni n·S bo'yicha saralangan jadvalda chiqaring.",
    "kirish": "610\n40"
   },
   {
    "sarlavha": "Yuklamani soatlar bo'yicha optimal ko'chirish",
    "matn": "Namunadagi turar-joy binosining 24 soatlik grafigidan (tarif_kalkulyator.py dagi yuklama ro'yxati) foydalaning, c₀ = 900 so'm/kWh.\nPik soatlardagi (17–23) har bir soatdan ko'pi bilan 25 % yuklamani tungi (23–7) soatlarga ko'chirish mumkin, lekin hech bir tungi soatning yuklamasi 120 kW dan oshmasligi kerak.\nEng ko'p tejash beradigan ko'chirishni sikllar bilan bajaring (avval eng qimmat soatlardan, eng bo'sh tungi soatlarga). Natijada: yangi 24 soatlik grafik (eski va yangi qiymatlar yonma-yon), sutkalik to'lov qanchaga kamaygani, yangi maksimal yuklama va uning soati chiqarilsin.",
    "kirish": ""
   }
  ]
 },
 {
  "id": "a3",
  "nomi": "3-amaliy mashg'ulot: Funksiyalar va kompleks sonlar — kuchlanish pasayishi, nosimmetrik yuklama",
  "mavzu": "def, return, modul (energetika.py), try–except, complex, cmath",
  "topshiriq": "1. Berilgan liniya uchun kuchlanish pasayishini qo'lda hisoblang; energetika.py modulida kuchlanish_pasayishi() funksiyasini yozing (yoki namunadagini tekshiring) va uni chaqirib natijani solishtiring.\n2. Funksiyadan foydalanib, liniya uzunligini 1 km qadam bilan 1 km dan berilgan L gacha o'zgartirganda ΔU qiymatlari jadvalini chiqaring va me'yorga (5 %) sig'adigan maksimal uzunlikni aniqlang (for yoki while).\n3. Kiritish xatolariga chidamli son_kiriting() funksiyasini (try–except) yozing va uni 1-topshiriq dasturida ishlating.\n4. Berilgan Z_A, Z_B, Z_C uchun A fazani qo'lda hisoblang, so'ngra namuna 2-dastur (uch_faza_nosimmetrik.py) yordamida barcha fazalar, neytral tok, jami P, Q, cosφ va nosimmetriya darajasini aniqlang; qaysi fazaga yuklamani ko'chirish nosimmetriyani kamaytirishi haqida xulosa bering.\n\nBrauzerda modul bilan ishlash: «Namuna dasturlar» dagi energetika.py ni «Fayl qilib saqlash» tugmasi bilan saqlang (yoki «📁 Fayllar» → «Yangi fayl»). Shundan keyin muharrirdagi kodda from energetika import kuchlanish_pasayishi ishlaydi.\nKiritish tartibi: P, Q, U, R₀, X₀, L.",
  "nazariy": "Kuchlanish pasayishi (uch fazali liniya):\n  ΔU% = (P·R₀ + Q·X₀)·L / (10·U²)\n  P — kW, Q — kVAr, U — kV, R₀ va X₀ — Ω/km, L — km.  Ruxsat etilgan: 5 %.\n\nKompleks qarshilik: Z = R + jX,  |Z| = √(R² + X²),  φ = arctg(X/R)\nPython: Z = complex(6, 8) yoki 6 + 8j;  abs(Z) — modul;  cmath.phase(Z) — argument (radian);\ncmath.rect(r, fi) — ko'rsatkichli shakldan algebraikka.\nTok: İ = U̇ / Z;  to'la quvvat S = U̇·İ* → U * I.conjugate();  P = S.real,  Q = S.imag\n\nTo'rt simli yulduz: U̇A = Uf∠0°,  U̇B = Uf∠−120°,  U̇C = Uf∠120°\nNeytral tok: İN = İA + İB + İC;  simmetrik yuklamada İN = 0.\nNosimmetriya darajasi: IN / Io'rt (Io'rt — faza toklarining o'rtachasi).\n\nFunksiya: def nom(parametrlar): ... return natija;  bir nechta qiymat: return S, P, Q;\nsukut qiymat: def f(x, kt=1.0).  Modul: from energetika import kuchlanish_pasayishi.\ntry: x = float(input()) except ValueError: ... — harf kiritilsa dastur to'xtamaydi.",
  "namunalar": [
   {
    "nomi": "energetika.py",
    "izoh": "Modul — «Fayl qilib saqlash» tugmasini bosing, keyin import qilsa bo'ladi",
    "kod": "# energetika.py (modul) - qismi\ndef kuchlanish_pasayishi(P, Q, U, R0, X0, L):\n    \"\"\"dU, %: P kW, Q kVAr, U kV, R0/X0 Ohm/km, L km.\"\"\"\n    return (P * R0 + Q * X0) * L / (10 * U ** 2)\n"
   },
   {
    "nomi": "liniyalar.py",
    "izoh": "1-masala: to'rtta 10 kV liniya; L-2 da ΔU = 7.01 % (me'yordan oshgan)",
    "kod": "# liniyalar.py - bir nechta liniyani tekshirish\nfrom energetika import kuchlanish_pasayishi\n\nliniyalar = [  # nom, P kW, Q kVAr, U kV, R0, X0, L km\n    (\"L-1\",  900, 350, 10, 0.28, 0.32,  6),\n    (\"L-2\", 1118, 391, 10, 0.28, 0.32, 16),\n    (\"L-3\",  600, 250, 10, 0.45, 0.35, 12),\n    (\"L-4\", 2500, 900, 10, 0.20, 0.30,  4)]\n\nprint(f\"{'Liniya':<8}{'dU, %':>8}   Xulosa\")\nfor nom, P, Q, U, R0, X0, L in liniyalar:\n    dU = kuchlanish_pasayishi(P, Q, U, R0, X0, L)\n    xulosa = \"me'yorda\" if dU <= 5 else \"ME'YORDAN OSHGAN\"\n    print(f\"{nom:<8}{dU:>8.2f}   {xulosa}\")\n"
   },
   {
    "nomi": "uch_faza_nosimmetrik.py",
    "izoh": "2-masala: Uf = 220 V, ZA = 6+8j, ZB = 10, ZC = 5+5j → IN = 12.19 A (48.7 %)",
    "kod": "# uch_faza_nosimmetrik.py\nimport cmath, math\n\ndef faza_toki(U, Z):\n    \"\"\"Faza toki va to'la quvvati (kompleks).\"\"\"\n    I = U / Z\n    return I, U * I.conjugate()\n\nUf = 220\nU = {\"A\": cmath.rect(Uf, 0), \"B\": cmath.rect(Uf, math.radians(-120)),\n     \"C\": cmath.rect(Uf, math.radians(120))}\nZ = {\"A\": complex(6, 8), \"B\": complex(10, 0), \"C\": complex(5, 5)}\n\nI_N = 0; P = 0; Q = 0; I_mod = []\nprint(f\"{'Faza':<6}{'|I|, A':>8}{'arg, grad':>11}{'P, W':>9}{'Q, VAr':>9}\")\nfor f in \"ABC\":\n    I, S = faza_toki(U[f], Z[f])\n    I_N += I; P += S.real; Q += S.imag; I_mod.append(abs(I))\n    print(f\"{f:<6}{abs(I):>8.2f}{math.degrees(cmath.phase(I)):>11.2f}{S.real:>9.0f}{S.imag:>9.0f}\")\ncos_fi = P / math.sqrt(P**2 + Q**2)\nprint(f\"Jami P = {P:.0f} W, Q = {Q:.0f} VAr, cos = {cos_fi:.3f}\")\nprint(f\"Neytral toki I_N = {abs(I_N):.2f} A (arg {math.degrees(cmath.phase(I_N)):.1f} grad)\")\nprint(f\"Nosimmetriya darajasi I_N / I_ort = {abs(I_N)/(sum(I_mod)/3)*100:.1f} %\")\n"
   }
  ],
  "variantlar": [
   {
    "matn": "P = 2000 kW\nQ = 660 kVAr\nU = 10 kV\nR₀ = 0.45 Ω/km\nX₀ = 0.38 Ω/km\nL = 10 km\nZ_A = 4+4j Ω\nZ_B = 12+3j Ω\nZ_C = 4+2j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "2000\n660\n10\n0.45\n0.38\n10"
   },
   {
    "matn": "P = 2000 kW\nQ = 660 kVAr\nU = 10 kV\nR₀ = 0.2 Ω/km\nX₀ = 0.32 Ω/km\nL = 10 km\nZ_A = 8+4j Ω\nZ_B = 5+6j Ω\nZ_C = 6+3j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "2000\n660\n10\n0.2\n0.32\n10"
   },
   {
    "matn": "P = 600 kW\nQ = 198 kVAr\nU = 10 kV\nR₀ = 0.2 Ω/km\nX₀ = 0.32 Ω/km\nL = 10 km\nZ_A = 4+6j Ω\nZ_B = 8+3j Ω\nZ_C = 12+5j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "600\n198\n10\n0.2\n0.32\n10"
   },
   {
    "matn": "P = 4000 kW\nQ = 2200 kVAr\nU = 10 kV\nR₀ = 0.62 Ω/km\nX₀ = 0.32 Ω/km\nL = 18 km\nZ_A = 5+8j Ω\nZ_B = 6+3j Ω\nZ_C = 5+7j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "4000\n2200\n10\n0.62\n0.32\n18"
   },
   {
    "matn": "P = 1000 kW\nQ = 400 kVAr\nU = 10 kV\nR₀ = 0.62 Ω/km\nX₀ = 0.32 Ω/km\nL = 18 km\nZ_A = 8+6j Ω\nZ_B = 5+4j Ω\nZ_C = 4+1j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "1000\n400\n10\n0.62\n0.32\n18"
   },
   {
    "matn": "P = 400 kW\nQ = 192 kVAr\nU = 6 kV\nR₀ = 0.28 Ω/km\nX₀ = 0.38 Ω/km\nL = 12 km\nZ_A = 8+6j Ω\nZ_B = 10+3j Ω\nZ_C = 12+2j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "400\n192\n6\n0.28\n0.38\n12"
   },
   {
    "matn": "P = 800 kW\nQ = 320 kVAr\nU = 6 kV\nR₀ = 0.45 Ω/km\nX₀ = 0.3 Ω/km\nL = 12 km\nZ_A = 5+3j Ω\nZ_B = 5+0j Ω\nZ_C = 6+5j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "800\n320\n6\n0.45\n0.3\n12"
   },
   {
    "matn": "P = 1000 kW\nQ = 330 kVAr\nU = 10 kV\nR₀ = 0.2 Ω/km\nX₀ = 0.32 Ω/km\nL = 12 km\nZ_A = 6+6j Ω\nZ_B = 12+2j Ω\nZ_C = 4+3j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "1000\n330\n10\n0.2\n0.32\n12"
   },
   {
    "matn": "P = 2500 kW\nQ = 1200 kVAr\nU = 10 kV\nR₀ = 0.62 Ω/km\nX₀ = 0.32 Ω/km\nL = 3 km\nZ_A = 4+5j Ω\nZ_B = 8+3j Ω\nZ_C = 4+1j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "2500\n1200\n10\n0.62\n0.32\n3"
   },
   {
    "matn": "P = 5000 kW\nQ = 2750 kVAr\nU = 35 kV\nR₀ = 0.2 Ω/km\nX₀ = 0.35 Ω/km\nL = 40 km\nZ_A = 5+2j Ω\nZ_B = 5+4j Ω\nZ_C = 12+3j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "5000\n2750\n35\n0.2\n0.35\n40"
   },
   {
    "matn": "P = 800 kW\nQ = 384 kVAr\nU = 6 kV\nR₀ = 0.35 Ω/km\nX₀ = 0.3 Ω/km\nL = 20 km\nZ_A = 4+5j Ω\nZ_B = 5+4j Ω\nZ_C = 12+1j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "800\n384\n6\n0.35\n0.3\n20"
   },
   {
    "matn": "P = 12000 kW\nQ = 6600 kVAr\nU = 35 kV\nR₀ = 0.62 Ω/km\nX₀ = 0.3 Ω/km\nL = 20 km\nZ_A = 4+2j Ω\nZ_B = 5+3j Ω\nZ_C = 9+3j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "12000\n6600\n35\n0.62\n0.3\n20"
   },
   {
    "matn": "P = 4000 kW\nQ = 2200 kVAr\nU = 10 kV\nR₀ = 0.45 Ω/km\nX₀ = 0.38 Ω/km\nL = 25 km\nZ_A = 4+6j Ω\nZ_B = 12+0j Ω\nZ_C = 6+7j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "4000\n2200\n10\n0.45\n0.38\n25"
   },
   {
    "matn": "P = 2500 kW\nQ = 825 kVAr\nU = 6 kV\nR₀ = 0.28 Ω/km\nX₀ = 0.3 Ω/km\nL = 20 km\nZ_A = 10+8j Ω\nZ_B = 10+3j Ω\nZ_C = 4+3j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "2500\n825\n6\n0.28\n0.3\n20"
   },
   {
    "matn": "P = 800 kW\nQ = 320 kVAr\nU = 10 kV\nR₀ = 0.62 Ω/km\nX₀ = 0.32 Ω/km\nL = 15 km\nZ_A = 8+5j Ω\nZ_B = 6+3j Ω\nZ_C = 9+3j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "800\n320\n10\n0.62\n0.32\n15"
   },
   {
    "matn": "P = 2000 kW\nQ = 800 kVAr\nU = 10 kV\nR₀ = 0.28 Ω/km\nX₀ = 0.38 Ω/km\nL = 10 km\nZ_A = 10+4j Ω\nZ_B = 6+2j Ω\nZ_C = 5+5j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "2000\n800\n10\n0.28\n0.38\n10"
   },
   {
    "matn": "P = 400 kW\nQ = 132 kVAr\nU = 10 kV\nR₀ = 0.35 Ω/km\nX₀ = 0.32 Ω/km\nL = 5 km\nZ_A = 8+5j Ω\nZ_B = 8+2j Ω\nZ_C = 9+5j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "400\n132\n10\n0.35\n0.32\n5"
   },
   {
    "matn": "P = 12000 kW\nQ = 5760 kVAr\nU = 35 kV\nR₀ = 0.62 Ω/km\nX₀ = 0.38 Ω/km\nL = 40 km\nZ_A = 4+2j Ω\nZ_B = 8+6j Ω\nZ_C = 4+3j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "12000\n5760\n35\n0.62\n0.38\n40"
   },
   {
    "matn": "P = 10000 kW\nQ = 4800 kVAr\nU = 35 kV\nR₀ = 0.62 Ω/km\nX₀ = 0.3 Ω/km\nL = 30 km\nZ_A = 8+5j Ω\nZ_B = 6+0j Ω\nZ_C = 6+2j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "10000\n4800\n35\n0.62\n0.3\n30"
   },
   {
    "matn": "P = 400 kW\nQ = 132 kVAr\nU = 10 kV\nR₀ = 0.45 Ω/km\nX₀ = 0.3 Ω/km\nL = 25 km\nZ_A = 6+2j Ω\nZ_B = 6+2j Ω\nZ_C = 9+3j Ω\nUf = 220 V (faza kuchlanishi)",
    "kirish": "400\n132\n10\n0.45\n0.3\n25"
   }
  ],
  "qiyin": [
   {
    "sarlavha": "Kesimni kuchlanish pasayishi bo'yicha tanlovchi funksiya",
    "matn": "kesim_tanla(P, Q, U, L, dU_max=5.0) funksiyasini yozing: alyumin kabel uchun r₀ = 31.5 / S (Ω/km), x₀ = 0.35 Ω/km, kesimlar qatori [16, 25, 35, 50, 70, 95, 120, 150, 185, 240] mm². Funksiya ΔU ≤ dU_max ni ta'minlaydigan eng kichik kesimni va shu kesimdagi ΔU ni qaytarsin; mos kesim bo'lmasa None qaytarsin.\nO'z variantingiz ma'lumotlari bilan, so'ngra L ni 5 dan 40 km gacha 5 km qadam bilan o'zgartirib, har L uchun tanlangan kesimni jadvalda chiqaring. Funksiyani try–except bilan himoyalangan son_kiriting() orqali kiritilgan ma'lumotlar bilan chaqiring.",
    "kirish": ""
   },
   {
    "sarlavha": "Fazalar bo'yicha yuklamani optimal taqsimlash",
    "matn": "Uchta yuklama Z₁, Z₂, Z₃ (masalan, variantingizdagi Z_A, Z_B, Z_C) va ikkita qo'shimcha bir fazali yuklama Z₄ = 20+5j, Z₅ = 15+10j Ω berilgan. Har faza yuklamasi — unga ulangan qarshiliklarning PARALLEL ulanishi (1/Z = Σ1/Zᵢ).\nitertools.product yordamida Z₄ va Z₅ ni fazalarga ulashning barcha variantlarini (3·3 = 9 ta) ko'rib chiqing, har biri uchun neytral tok IN ni hisoblang. IN eng kichik bo'lgan taqsimotni toping va hamma variantlarni IN bo'yicha saralangan jadvalda chiqaring.",
    "kirish": ""
   },
   {
    "sarlavha": "Uchburchak sxemadagi nosimmetrik yuklama",
    "matn": "Xuddi shu Z_A, Z_B, Z_C uchburchak sxemaga (Z_AB, Z_BC, Z_CA sifatida) ulangan, chiziqli kuchlanish Uл = 380 V.\nChiziqli kuchlanishlarni kompleks ko'rinishda yozing (U̇AB = 380∠30°, U̇BC = 380∠−90°, U̇CA = 380∠150°), faza toklarini İAB, İBC, İCA va chiziqli toklarni İA = İAB − İCA, İB = İBC − İAB, İC = İCA − İBC hisoblang.\nJami P, Q, cosφ ni toping va natijani yulduz sxemasi (Uf = 220 V) bilan bitta jadvalda solishtiring. Chiziqli toklar yig'indisi nolga tengligini tekshiring (nima uchun?).",
    "kirish": ""
   }
  ]
 },
 {
  "id": "a4",
  "nomi": "4-amaliy mashg'ulot: CSV va JSON — hisoblagich jurnali va tarmoq konfiguratsiyasi",
  "mavzu": "csv, json, with open(), ro'yxat kesimi, ro'yxat generatori, random.seed",
  "argvVariant": true,
  "topshiriq": "1. Namunadagi generator.py ni muharrirga qo'yib ishga tushiring: «Argumentlar» maydonida variant raqamingiz turibdi (python generator.py N). Natijada sutkalik_vN.csv va soatlik_vN.csv fayllari paydo bo'ladi — «📁 Fayllar» bo'limida ularni ochib tuzilishini ko'ring.\n2. 1-masala dasturini (haftalik.py) o'z variantingizning fayl nomi, me'yori va tarifi bilan ishga tushiring; hisobot faylini yarating va eng og'ir haftani aniqlang.\n3. Dasturni kengaytiring: har kun uchun hafta kunini (datetime.date(...).weekday()) aniqlab, ish va dam olish kunlarining o'rtacha iste'molini alohida chiqaring; dam olish kunlari ulushini foizda hisoblang.\n4. O'z variantingizdagi uchta liniya (P/Q juftliklari) uchun tarmoq_vN.json faylini «📁 Fayllar → Yangi fayl» orqali qo'lda yarating (JSON sintaksisiga rioya qiling, namuna: tarmoq.json) va 2-masala dasturini berilgan me'yoriy cosφ bilan ishga tushiring; natija JSON ni tekshiring.\n5. 2-masala dasturiga har liniya uchun 25 kVAr li seksiyalar sonini (yuqoriga yaxlitlab, math.ceil) va kompensatsiyadan keyingi haqiqiy cosφ ni qo'shing; natijani JSON ga yozing.\n\nFayllar shu brauzerda saqlanib qoladi, ularni «📁 Fayllar» bo'limidan yuklab olishingiz mumkin.",
  "nazariy": "CSV — har satri jadval qatori, ustunlari vergul bilan ajratilgan matnli fayl.\n  with open(\"sutkalik_v7.csv\", encoding=\"utf-8\") as f:\n      for satr in csv.DictReader(f):      # har satr — lug'at, qiymatlar satr (str)\n          W.append(int(satr[\"W_kWh\"]))\n  Yozish: with open(fayl, \"w\", newline=\"\", encoding=\"utf-8\") as f: csv.writer(f).writerow([...])\n\nJSON — ichma-ich obyekt ({} → dict) va massivlar ([] → list):\n  json.load(f) — fayldan o'qish;  json.dump(obj, f, ensure_ascii=False, indent=2) — yozish\n\nRo'yxat kesimi: W[h:h+7] — haftalik blok;  range(0, 30, 7) → 0, 7, 14, 21, 28 (oxirgi blok 2 kun)\nRo'yxat generatori: sum(1 for w in W if w > meyor) — me'yordan oshgan kunlar soni\n\nGenerator: random.seed(variant) — bir variant har doim bir xil faylni beradi.\n2026-yil sentyabr: shanba-yakshanba — 5, 6, 12, 13, 19, 20, 26, 27. weekday(): 0 — dushanba … 6 — yakshanba.\n\ncosφ = P / √(P² + Q²).  Me'yor odatda cosφ ≥ 0.92.\nKompensatsiya (cosφ₂ = 0.95 gacha): Qk = P·(Q/P − tg(arccos 0.95))\n\nNamunaviy natija (7-variant): oylik 168 107 kWh, 950 so'm/kWh → 159.7 mln so'm, 6000 kWh dan oshgan 22 kun.",
  "namunalar": [
   {
    "nomi": "generator.py",
    "izoh": "Variant bo'yicha soatlik (720 satr) va sutkalik (30 satr) fayl yaratadi. Argumentlar maydonidagi raqam — variant",
    "kod": "# generator.py - variant bo'yicha soatlik va sutkalik hisoblagich ma'lumotlarini yaratish\nimport csv, random, sys, datetime\nvariant = int(sys.argv[1]) if len(sys.argv) > 1 else 1\nrandom.seed(variant)                                   # har variant uchun o'z ma'lumoti\nish = [120,110,105,100,105,130,220,340,410,450,470,460,380,440,465,455,430,360,300,260,210,180,160,140]\ndam = [110,100,95,92,95,100,120,150,180,200,210,205,190,200,205,200,190,170,150,140,130,125,120,115]\nk = 0.8 + 0.02 * variant                               # masshtab koeffitsiyenti\nwith open(f\"soatlik_v{variant}.csv\", \"w\", newline=\"\") as f1, \\\n     open(f\"sutkalik_v{variant}.csv\", \"w\", newline=\"\") as f2:\n    w1 = csv.writer(f1); w2 = csv.writer(f2)\n    w1.writerow([\"vaqt\", \"P_kW\"]); w2.writerow([\"sana\", \"W_kWh\"])\n    for kun in range(1, 31):\n        hafta_kuni = datetime.date(2026, 9, kun).weekday()      # 0 - dushanba ... 6 - yakshanba\n        profil = dam if hafta_kuni >= 5 else ish\n        W = 0\n        for soat in range(24):\n            P = round(profil[soat] * k * random.gauss(1, 0.06), 1)\n            w1.writerow([f\"2026-09-{kun:02d} {soat:02d}:00\", P]); W += P\n        w2.writerow([f\"2026-09-{kun:02d}\", round(W)])\nprint(f\"{variant}-variant uchun soatlik_v{variant}.csv va \"\n      f\"sutkalik_v{variant}.csv yaratildi (k = {k:.2f})\")\n"
   },
   {
    "nomi": "haftalik.py",
    "izoh": "1-masala (7-variant uchun). O'zingiz uchun fayl nomi, me'yor va tarifni o'zgartiring",
    "kod": "# haftalik.py - sutkalik CSV dan haftalik yig'indi va me'yordan chetlanish hisoboti\nimport csv\nsanalar, W = [], []\nwith open(\"sutkalik_v7.csv\", encoding=\"utf-8\") as f:\n    for satr in csv.DictReader(f):\n        sanalar.append(satr[\"sana\"]); W.append(int(satr[\"W_kWh\"]))\nmeyor = 6000; tarif = 950\nprint(f\"{'Hafta':<8}{'Kunlar':>8}{'W, kWh':>10}{'O`rtacha':>10}{'Oshgan':>8}\")\nhaftalar = []\nfor h in range(0, 30, 7):\n    blok = W[h:h+7]\n    oshgan = sum(1 for w in blok if w > meyor)\n    haftalar.append(sum(blok))\n    print(f\"{h//7+1:<8}{len(blok):>8}{sum(blok):>10}{sum(blok)/len(blok):>10.0f}{oshgan:>8}\")\nprint(f\"Oylik W = {sum(W):,} kWh, to'lov = {sum(W)*tarif:,} so'm, \"\n      f\"me'yordan oshgan kunlar: {sum(1 for w in W if w > meyor)}\")\nwith open(\"haftalik_hisobot_v7.csv\", \"w\", newline=\"\", encoding=\"utf-8\") as f:\n    yoz = csv.writer(f); yoz.writerow([\"hafta\", \"W_kWh\", \"tolov_som\"])\n    for i, w in enumerate(haftalar, 1): yoz.writerow([i, w, w * tarif])\nprint(\"haftalik_hisobot_v7.csv yozildi\")\n"
   },
   {
    "nomi": "tarmoq.json",
    "izoh": "2-masala uchun kiruvchi fayl — «Fayl qilib saqlash» tugmasini bosing",
    "kod": "{\n  \"podstansiya\": \"PS-35/10 Chilonzor\",\n  \"liniyalar\": [\n    {\"nomi\": \"L-1\", \"P_kW\": 900,  \"Q_kVAr\": 350},\n    {\"nomi\": \"L-2\", \"P_kW\": 1118, \"Q_kVAr\": 700},\n    {\"nomi\": \"L-3\", \"P_kW\": 600,  \"Q_kVAr\": 450},\n    {\"nomi\": \"L-4\", \"P_kW\": 2500, \"Q_kVAr\": 900}\n  ]\n}\n"
   },
   {
    "nomi": "kompensatsiya_json.py",
    "izoh": "2-masala: L-2 va L-3 da kompensatsiya kerak (332.5 va 252.8 kVAr)",
    "kod": "# kompensatsiya_json.py - JSON dagi liniyalar uchun cos(fi) ni tekshirish va kompensatsiya\nimport json, math\nwith open(\"tarmoq.json\", encoding=\"utf-8\") as f:\n    ps = json.load(f)\nnatija = []\nprint(f\"{'Liniya':<8}{'P, kW':>8}{'Q, kVAr':>9}{'cos':>7}{'Qk, kVAr':>10}   Xulosa\")\nfor ln in ps[\"liniyalar\"]:\n    P, Q = ln[\"P_kW\"], ln[\"Q_kVAr\"]\n    cos = P / math.hypot(P, Q)\n    Qk = P * (Q / P - math.tan(math.acos(0.95))) if cos < 0.92 else 0\n    xulosa = \"kompensatsiya kerak\" if Qk > 0 else \"me'yorda\"\n    print(f\"{ln['nomi']:<8}{P:>8}{Q:>9}{cos:>7.3f}{Qk:>10.1f}   {xulosa}\")\n    natija.append({\"nomi\": ln[\"nomi\"], \"cos_fi\": round(cos, 3),\n                   \"Qk_kVAr\": round(Qk, 1), \"kerak\": Qk > 0})\nwith open(\"kompensatsiya.json\", \"w\", encoding=\"utf-8\") as f:\n    json.dump({\"podstansiya\": ps[\"podstansiya\"], \"maqsad_cos\": 0.95,\n               \"liniyalar\": natija}, f, ensure_ascii=False, indent=2)\nprint(\"kompensatsiya.json yozildi\")\n"
   }
  ],
  "variantlar": [
   {
    "matn": "seed = 1 (generator: python generator.py 1)\nFayllar: sutkalik_v1.csv, soatlik_v1.csv\nMe'yor = 6200 kWh/kun\nTarif = 850 so'm/kWh\nL-1: P/Q = 1200/800 kW/kVAr\nL-2: P/Q = 600/450 kW/kVAr\nL-3: P/Q = 2000/900 kW/kVAr\nMe'yoriy cosφ = 0.92",
    "kirish": ""
   },
   {
    "matn": "seed = 2 (generator: python generator.py 2)\nFayllar: sutkalik_v2.csv, soatlik_v2.csv\nMe'yor = 6500 kWh/kun\nTarif = 850 so'm/kWh\nL-1: P/Q = 1000/600 kW/kVAr\nL-2: P/Q = 800/450 kW/kVAr\nL-3: P/Q = 3000/1400 kW/kVAr\nMe'yoriy cosφ = 0.95",
    "kirish": ""
   },
   {
    "matn": "seed = 3 (generator: python generator.py 3)\nFayllar: sutkalik_v3.csv, soatlik_v3.csv\nMe'yor = 6200 kWh/kun\nTarif = 950 so'm/kWh\nL-1: P/Q = 1500/500 kW/kVAr\nL-2: P/Q = 700/450 kW/kVAr\nL-3: P/Q = 3000/900 kW/kVAr\nMe'yoriy cosφ = 0.92",
    "kirish": ""
   },
   {
    "matn": "seed = 4 (generator: python generator.py 4)\nFayllar: sutkalik_v4.csv, soatlik_v4.csv\nMe'yor = 6500 kWh/kun\nTarif = 850 so'm/kWh\nL-1: P/Q = 1000/700 kW/kVAr\nL-2: P/Q = 700/350 kW/kVAr\nL-3: P/Q = 3000/1000 kW/kVAr\nMe'yoriy cosφ = 0.92",
    "kirish": ""
   },
   {
    "matn": "seed = 5 (generator: python generator.py 5)\nFayllar: sutkalik_v5.csv, soatlik_v5.csv\nMe'yor = 6000 kWh/kun\nTarif = 1000 so'm/kWh\nL-1: P/Q = 1000/800 kW/kVAr\nL-2: P/Q = 700/400 kW/kVAr\nL-3: P/Q = 2000/900 kW/kVAr\nMe'yoriy cosφ = 0.93",
    "kirish": ""
   },
   {
    "matn": "seed = 6 (generator: python generator.py 6)\nFayllar: sutkalik_v6.csv, soatlik_v6.csv\nMe'yor = 5800 kWh/kun\nTarif = 850 so'm/kWh\nL-1: P/Q = 1000/800 kW/kVAr\nL-2: P/Q = 800/350 kW/kVAr\nL-3: P/Q = 3000/1000 kW/kVAr\nMe'yoriy cosφ = 0.93",
    "kirish": ""
   },
   {
    "matn": "seed = 7 (generator: python generator.py 7)\nFayllar: sutkalik_v7.csv, soatlik_v7.csv\nMe'yor = 6200 kWh/kun\nTarif = 1000 so'm/kWh\nL-1: P/Q = 1200/600 kW/kVAr\nL-2: P/Q = 700/500 kW/kVAr\nL-3: P/Q = 3000/1000 kW/kVAr\nMe'yoriy cosφ = 0.95",
    "kirish": ""
   },
   {
    "matn": "seed = 8 (generator: python generator.py 8)\nFayllar: sutkalik_v8.csv, soatlik_v8.csv\nMe'yor = 5500 kWh/kun\nTarif = 950 so'm/kWh\nL-1: P/Q = 1200/500 kW/kVAr\nL-2: P/Q = 600/350 kW/kVAr\nL-3: P/Q = 3000/1000 kW/kVAr\nMe'yoriy cosφ = 0.93",
    "kirish": ""
   },
   {
    "matn": "seed = 9 (generator: python generator.py 9)\nFayllar: sutkalik_v9.csv, soatlik_v9.csv\nMe'yor = 6500 kWh/kun\nTarif = 900 so'm/kWh\nL-1: P/Q = 1800/500 kW/kVAr\nL-2: P/Q = 700/450 kW/kVAr\nL-3: P/Q = 2000/900 kW/kVAr\nMe'yoriy cosφ = 0.95",
    "kirish": ""
   },
   {
    "matn": "seed = 10 (generator: python generator.py 10)\nFayllar: sutkalik_v10.csv, soatlik_v10.csv\nMe'yor = 5500 kWh/kun\nTarif = 1000 so'm/kWh\nL-1: P/Q = 1000/900 kW/kVAr\nL-2: P/Q = 700/350 kW/kVAr\nL-3: P/Q = 2000/900 kW/kVAr\nMe'yoriy cosφ = 0.95",
    "kirish": ""
   },
   {
    "matn": "seed = 11 (generator: python generator.py 11)\nFayllar: sutkalik_v11.csv, soatlik_v11.csv\nMe'yor = 5500 kWh/kun\nTarif = 950 so'm/kWh\nL-1: P/Q = 1000/700 kW/kVAr\nL-2: P/Q = 600/350 kW/kVAr\nL-3: P/Q = 2500/1000 kW/kVAr\nMe'yoriy cosφ = 0.92",
    "kirish": ""
   },
   {
    "matn": "seed = 12 (generator: python generator.py 12)\nFayllar: sutkalik_v12.csv, soatlik_v12.csv\nMe'yor = 6500 kWh/kun\nTarif = 900 so'm/kWh\nL-1: P/Q = 1000/700 kW/kVAr\nL-2: P/Q = 700/450 kW/kVAr\nL-3: P/Q = 2000/1000 kW/kVAr\nMe'yoriy cosφ = 0.95",
    "kirish": ""
   },
   {
    "matn": "seed = 13 (generator: python generator.py 13)\nFayllar: sutkalik_v13.csv, soatlik_v13.csv\nMe'yor = 6200 kWh/kun\nTarif = 850 so'm/kWh\nL-1: P/Q = 1500/800 kW/kVAr\nL-2: P/Q = 700/500 kW/kVAr\nL-3: P/Q = 2500/1000 kW/kVAr\nMe'yoriy cosφ = 0.95",
    "kirish": ""
   },
   {
    "matn": "seed = 14 (generator: python generator.py 14)\nFayllar: sutkalik_v14.csv, soatlik_v14.csv\nMe'yor = 6200 kWh/kun\nTarif = 850 so'm/kWh\nL-1: P/Q = 1500/700 kW/kVAr\nL-2: P/Q = 600/400 kW/kVAr\nL-3: P/Q = 3000/900 kW/kVAr\nMe'yoriy cosφ = 0.92",
    "kirish": ""
   },
   {
    "matn": "seed = 15 (generator: python generator.py 15)\nFayllar: sutkalik_v15.csv, soatlik_v15.csv\nMe'yor = 6200 kWh/kun\nTarif = 1000 so'm/kWh\nL-1: P/Q = 1500/800 kW/kVAr\nL-2: P/Q = 600/450 kW/kVAr\nL-3: P/Q = 3000/900 kW/kVAr\nMe'yoriy cosφ = 0.93",
    "kirish": ""
   },
   {
    "matn": "seed = 16 (generator: python generator.py 16)\nFayllar: sutkalik_v16.csv, soatlik_v16.csv\nMe'yor = 6500 kWh/kun\nTarif = 950 so'm/kWh\nL-1: P/Q = 1200/500 kW/kVAr\nL-2: P/Q = 800/400 kW/kVAr\nL-3: P/Q = 3000/1400 kW/kVAr\nMe'yoriy cosφ = 0.92",
    "kirish": ""
   },
   {
    "matn": "seed = 17 (generator: python generator.py 17)\nFayllar: sutkalik_v17.csv, soatlik_v17.csv\nMe'yor = 6500 kWh/kun\nTarif = 950 so'm/kWh\nL-1: P/Q = 1800/600 kW/kVAr\nL-2: P/Q = 700/450 kW/kVAr\nL-3: P/Q = 2000/900 kW/kVAr\nMe'yoriy cosφ = 0.95",
    "kirish": ""
   },
   {
    "matn": "seed = 18 (generator: python generator.py 18)\nFayllar: sutkalik_v18.csv, soatlik_v18.csv\nMe'yor = 6000 kWh/kun\nTarif = 850 so'm/kWh\nL-1: P/Q = 1500/700 kW/kVAr\nL-2: P/Q = 700/400 kW/kVAr\nL-3: P/Q = 2000/800 kW/kVAr\nMe'yoriy cosφ = 0.93",
    "kirish": ""
   },
   {
    "matn": "seed = 19 (generator: python generator.py 19)\nFayllar: sutkalik_v19.csv, soatlik_v19.csv\nMe'yor = 6200 kWh/kun\nTarif = 1000 so'm/kWh\nL-1: P/Q = 1800/600 kW/kVAr\nL-2: P/Q = 600/400 kW/kVAr\nL-3: P/Q = 3000/900 kW/kVAr\nMe'yoriy cosφ = 0.95",
    "kirish": ""
   },
   {
    "matn": "seed = 20 (generator: python generator.py 20)\nFayllar: sutkalik_v20.csv, soatlik_v20.csv\nMe'yor = 5500 kWh/kun\nTarif = 950 so'm/kWh\nL-1: P/Q = 1500/500 kW/kVAr\nL-2: P/Q = 800/400 kW/kVAr\nL-3: P/Q = 3000/900 kW/kVAr\nMe'yoriy cosφ = 0.92",
    "kirish": ""
   }
  ],
  "qiyin": [
   {
    "sarlavha": "Soatlik jurnaldan eng og'ir soat va kunlar",
    "matn": "soatlik_vN.csv faylidan (720 satr) pandas'siz, faqat csv moduli bilan:\n1) Eng katta yuklamali 5 ta soatni (sana, soat, P) kamayish tartibida chiqaring;\n2) Har soat (0–23) uchun ish kunlari va dam olish kunlarining o'rtacha yuklamasini lug'atda yig'ib, ikki ustunli jadval qilib chiqaring;\n3) Har kun uchun sutkalik maksimum Pmax va uning soatini topib, kunlik_max_vN.csv fayliga yozing;\n4) Natijani sutkalik_vN.csv bilan solishtiring: har kun soatlik qiymatlar yig'indisi sutkalik qiymatga (yaxlitlash aniqligida) tengligini assert bilan tekshiring.",
    "kirish": ""
   },
   {
    "sarlavha": "Me'yordan oshish jarimasi va hafta kunlari tahlili",
    "matn": "Shartnoma bo'yicha sutkalik me'yordan ortiq iste'mol qilingan energiya 1.5 baravar tarif bilan to'lanadi.\nsutkalik_vN.csv va variantingizdagi me'yor/tarif bilan: har kun uchun oddiy to'lov, ortiqcha kWh va jarima summasini hisoblang; oylik jami to'lov va jarima ulushini chiqaring.\nHafta kunlari (dushanba…yakshanba) bo'yicha jami ortiqcha energiyani lug'atda yig'ing va eng ko'p ortiqcha beradigan kunni aniqlang.\nNatijani jarima_vN.json fayliga {\"oy\": ..., \"kunlar\": [...], \"hafta_kunlari\": {...}, \"jami\": {...}} tuzilmasida yozing va qayta o'qib to'g'riligini tekshiring.",
    "kirish": ""
   },
   {
    "sarlavha": "JSON konfiguratsiyani tekshiruvchi (validator)",
    "matn": "tarmoq_vN.json faylini o'qib tekshiradigan tekshir(ps) funksiyasini yozing. U xatolar ro'yxatini qaytarsin: \"liniyalar\" kaliti yo'q yoki ro'yxat emas; liniyada nomi / P_kW / Q_kVAr yo'q; qiymat son emas yoki manfiy; nomlar takrorlangan; P = 0.\nXatoli JSON faylni ham yarating (masalan, xato.json — 3 xil xato bilan) va ikkala fayl uchun hisobot chiqaring. Fayl umuman JSON bo'lmasa (json.JSONDecodeError) — buni ham ushlab, qator va ustun raqamini ko'rsating.",
    "kirish": ""
   }
  ]
 },
 {
  "id": "a5",
  "nomi": "5-amaliy mashg'ulot: NumPy — kontur toklari usuli va yillik yuklama tahlili",
  "mavzu": "np.array, vektor amallar, maska, np.where, reshape/axis, np.sort, np.linalg.solve",
  "eslatma": "Bu amaliyotda numpy ishlatiladi. Birinchi ishga tushirishda u yuklanadi (10–40 soniya), keyingi safar tez ishlaydi.",
  "topshiriq": "1. Zanjir sxemasi (nazariy qismga qarang) uchun o'z variantingizning R₁…R₅, E₁, E₂ qiymatlari bilan kontur tenglamalarini yozing va A, E ni qo'lda tuzing.\n2. 1-masala dasturi (kontur_a5.py) bilan kontur va shoxobcha toklarini, quvvatlarni hisoblang; quvvat balansini tekshiring; qaysi manba energiya berayotgani va qaysi biri iste'mol qilayotganini aniqlang.\n3. Dasturni kengaytiring: np.linalg.inv(A) bilan teskari matritsani hisoblab, inv(A) @ E natijasini solve bilan solishtiring; E₂ ni 0 dan 200 V gacha 20 V qadam bilan o'zgartirib (np.arange), I₃ ning ishorasi o'zgaradigan qiymatni toping.\n4. 2-masala dasturini (yillik_a5.py) o'z variantingizning seed va masshtab qiymatlari bilan ishga tushiring; berilgan chegaradan yuqori soatlar sonini aniqlang; natijalar jadvalini tuzing.\n5. Massivni reshape(365, 24) orqali jadvalga aylantirib, har oy uchun energiyani (kunlarni 12 oyga ajratib) va yilning eng og'ir haftasini (7 kunlik bloklar) toping.\n6. Qo'shimcha: yuklama davomiyligi grafigini matplotlib bilan chizing (plt.plot(np.sort(P)[::-1]); plt.show()) — grafik konsolda chiqadi.",
  "nazariy": "Zanjir (1-rasm): uchta kontur.\n  1-kontur: R₁ va R₂, E₁ (kontur toki yo'nalishida);\n  2-kontur: R₂, R₃, R₄ (manbasiz);\n  3-kontur: R₄ va R₅, E₂ (kontur tokiga qarshi yo'nalgan).\nTenglamalar:\n  (R₁ + R₂)·I₁ − R₂·I₂             = E₁\n  −R₂·I₁ + (R₂ + R₃ + R₄)·I₂ − R₄·I₃ = 0\n  −R₄·I₂ + (R₄ + R₅)·I₃           = −E₂\nShoxobcha toklari: R₁ da I₁, R₂ da I₁ − I₂, R₃ da I₂, R₄ da I₂ − I₃, R₅ da I₃.\nQuvvat balansi: ΣE·I = ΣR·I²  →  E₁·I₁ − E₂·I₃ = Σ Rₖ·Iₖ²\nNamuna (R = 12, 6, 10, 5, 8 Ω; E = 120, 60 V): I = [6.997, 0.991, −4.234] A, 1093.69 W, det(A) = 3996.\n\nYuklama ko'rsatkichlari: W = ΣP (1 soat qadam), Tmax = W/Pmax, kz = Po'rt/Pmax.\nDavomiylik grafigi: np.sort(P)[::-1];  N soat davomida oshadigan qiymat: np.sort(P)[::-1][N-1].\nUch zonali tarif massivi: np.where((h >= 23) | (h < 7), 450, np.where(h < 17, 900, 1350)).\n\nNumPy: np.array, np.arange, np.tile, P.sum(), P.mean(), P.max(), P.argmax(), P.std(),\nP.reshape(365, 24).sum(axis=1) — kunlik yig'indi, A @ x — matritsa ko'paytmasi,\nnp.linalg.solve(A, b), np.linalg.inv(A), np.linalg.det(A).",
  "namunalar": [
   {
    "nomi": "kontur_a5.py",
    "izoh": "1-masala: uch konturli zanjir, kontur toklari va quvvat balansi",
    "kod": "# kontur_a5.py - uch konturli zanjir: kontur toklari va quvvat balansi\nimport numpy as np\nR1, R2, R3, R4, R5 = 12, 6, 10, 5, 8           # Ohm\nE1, E2 = 120, 60                                 # V\nA = np.array([[R1 + R2, -R2, 0], [-R2, R2 + R3 + R4, -R4], [0, -R4, R4 + R5]], float)\nE = np.array([E1, 0, -E2], float)\nI = np.linalg.solve(A, E)\nI_R = np.array([I[0], I[0] - I[1], I[1], I[1] - I[2], I[2]])       # shoxobcha toklari\nR = np.array([R1, R2, R3, R4, R5])\nP_R = R * I_R**2\nprint(\"Kontur toklari:\", np.round(I, 3), \"A\")\nprint(\"Shoxobcha toklari R1..R5:\", np.round(I_R, 3), \"A\")\nprint(\"Quvvatlar R1..R5:\", np.round(P_R, 2), \"W, jami\", round(P_R.sum(), 2), \"W\")\nprint(\"Manbalar quvvati:\", round(E1 * I[0] - E2 * I[2], 2), \"W\")\nprint(\"det(A) =\", round(np.linalg.det(A), 1), \" |A@I - E| =\", np.abs(A @ I - E).max())\n"
   },
   {
    "nomi": "yillik_a5.py",
    "izoh": "2-masala (7-variant: seed = 7, masshtab 0.94): W = 2332 MWh, Pmax = 625 kW",
    "kod": "# yillik_a5.py - yillik soatlik yuklama massivini tahlil qilish\nimport numpy as np\nrng = np.random.default_rng(7)                    # variant = 7\nsoat = np.arange(8760)\nprofil = np.array([120,110,105,100,105,130,220,340,410,450,470,460,\n                   380,440,465,455,430,360,300,260,210,180,160,140])\nmavsum = 1 + 0.15 * np.sin(2 * np.pi * (soat / 24 - 15) / 365)      # yillik mavsumiylik\nP = np.tile(profil, 365) * 0.94 * mavsum * rng.normal(1, 0.08, 8760)\nW = P.sum() / 1000\nkun, s = divmod(P.argmax(), 24)\nprint(f\"W = {W:.0f} MWh, Pmax = {P.max():.0f} kW ({kun+1}-kun {s}:00), Port = {P.mean():.1f} kW\")\nprint(f\"T_max = {P.sum()/P.max():.0f} soat, kz = {P.mean()/P.max():.3f}, std = {P.std():.1f} kW\")\nh = soat % 24\ntarif = np.where((h >= 23) | (h < 7), 450, np.where(h < 17, 900, 1350))\nprint(f\"Yillik to'lov: {(P * tarif).sum()/1e6:,.1f} mln so'm; > 450 kW: {(P > 450).sum()} soat\")\njadval = P.reshape(365, 24)\nprint(f\"Eng og'ir kun: {jadval.sum(axis=1).argmax()+1}, \"\n      f\"o'rtacha profil piki: {jadval.mean(axis=0).argmax()}:00\")\ndavomiylik = np.sort(P)[::-1]\nprint(f\"Yuklama 1000 soat davomida {davomiylik[999]:.0f} kW dan yuqori\")\n"
   }
  ],
  "variantlar": [
   {
    "matn": "R₁ = 5 Ω, R₂ = 10 Ω, R₃ = 4 Ω, R₄ = 4 Ω, R₅ = 4 Ω\nE₁ = 80 V, E₂ = 60 V\nseed = 1\nMasshtab = 1.2\nChegara = 500 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 4 Ω, R₂ = 12 Ω, R₃ = 6 Ω, R₄ = 8 Ω, R₅ = 5 Ω\nE₁ = 120 V, E₂ = 40 V\nseed = 2\nMasshtab = 1.2\nChegara = 500 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 4 Ω, R₂ = 6 Ω, R₃ = 10 Ω, R₄ = 10 Ω, R₅ = 6 Ω\nE₁ = 120 V, E₂ = 30 V\nseed = 3\nMasshtab = 0.8\nChegara = 400 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 4 Ω, R₂ = 5 Ω, R₃ = 4 Ω, R₄ = 5 Ω, R₅ = 4 Ω\nE₁ = 100 V, E₂ = 30 V\nseed = 4\nMasshtab = 0.9\nChegara = 450 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 12 Ω, R₂ = 6 Ω, R₃ = 8 Ω, R₄ = 15 Ω, R₅ = 6 Ω\nE₁ = 100 V, E₂ = 50 V\nseed = 5\nMasshtab = 0.9\nChegara = 450 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 6 Ω, R₂ = 15 Ω, R₃ = 8 Ω, R₄ = 15 Ω, R₅ = 15 Ω\nE₁ = 100 V, E₂ = 40 V\nseed = 6\nMasshtab = 1.1\nChegara = 400 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 6 Ω, R₂ = 8 Ω, R₃ = 8 Ω, R₄ = 8 Ω, R₅ = 6 Ω\nE₁ = 120 V, E₂ = 60 V\nseed = 7\nMasshtab = 1.1\nChegara = 450 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 8 Ω, R₂ = 8 Ω, R₃ = 4 Ω, R₄ = 15 Ω, R₅ = 12 Ω\nE₁ = 120 V, E₂ = 40 V\nseed = 8\nMasshtab = 1.0\nChegara = 400 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 8 Ω, R₂ = 12 Ω, R₃ = 15 Ω, R₄ = 5 Ω, R₅ = 6 Ω\nE₁ = 80 V, E₂ = 50 V\nseed = 9\nMasshtab = 0.9\nChegara = 450 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 8 Ω, R₂ = 6 Ω, R₃ = 4 Ω, R₄ = 6 Ω, R₅ = 10 Ω\nE₁ = 150 V, E₂ = 30 V\nseed = 10\nMasshtab = 0.8\nChegara = 400 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 15 Ω, R₂ = 10 Ω, R₃ = 6 Ω, R₄ = 4 Ω, R₅ = 5 Ω\nE₁ = 100 V, E₂ = 50 V\nseed = 11\nMasshtab = 1.0\nChegara = 450 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 8 Ω, R₂ = 4 Ω, R₃ = 10 Ω, R₄ = 10 Ω, R₅ = 4 Ω\nE₁ = 120 V, E₂ = 40 V\nseed = 12\nMasshtab = 0.9\nChegara = 500 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 6 Ω, R₂ = 15 Ω, R₃ = 12 Ω, R₄ = 4 Ω, R₅ = 6 Ω\nE₁ = 100 V, E₂ = 30 V\nseed = 13\nMasshtab = 1.1\nChegara = 400 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 12 Ω, R₂ = 4 Ω, R₃ = 6 Ω, R₄ = 8 Ω, R₅ = 4 Ω\nE₁ = 100 V, E₂ = 60 V\nseed = 14\nMasshtab = 1.0\nChegara = 400 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 5 Ω, R₂ = 10 Ω, R₃ = 4 Ω, R₄ = 6 Ω, R₅ = 4 Ω\nE₁ = 80 V, E₂ = 30 V\nseed = 15\nMasshtab = 0.8\nChegara = 500 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 15 Ω, R₂ = 12 Ω, R₃ = 10 Ω, R₄ = 6 Ω, R₅ = 15 Ω\nE₁ = 150 V, E₂ = 30 V\nseed = 16\nMasshtab = 1.2\nChegara = 450 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 8 Ω, R₂ = 5 Ω, R₃ = 15 Ω, R₄ = 12 Ω, R₅ = 10 Ω\nE₁ = 150 V, E₂ = 30 V\nseed = 17\nMasshtab = 0.8\nChegara = 400 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 8 Ω, R₂ = 4 Ω, R₃ = 15 Ω, R₄ = 12 Ω, R₅ = 10 Ω\nE₁ = 80 V, E₂ = 30 V\nseed = 18\nMasshtab = 1.2\nChegara = 400 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 12 Ω, R₂ = 10 Ω, R₃ = 10 Ω, R₄ = 10 Ω, R₅ = 8 Ω\nE₁ = 80 V, E₂ = 60 V\nseed = 19\nMasshtab = 1.1\nChegara = 500 kW",
    "kirish": ""
   },
   {
    "matn": "R₁ = 10 Ω, R₂ = 12 Ω, R₃ = 5 Ω, R₄ = 4 Ω, R₅ = 10 Ω\nE₁ = 150 V, E₂ = 30 V\nseed = 20\nMasshtab = 1.2\nChegara = 400 kW",
    "kirish": ""
   }
  ],
  "qiyin": [
   {
    "sarlavha": "Tugun potensiallari usuli bilan tekshirish",
    "matn": "Xuddi shu zanjirni tugun potensiallari usuli bilan yeching: bitta tugunni yerga ulab (φ = 0), qolgan tugunlar uchun o'tkazuvchanlik matritsasi G va tugun toklari J ni tuzing, G·φ = J ni np.linalg.solve bilan yeching.\nTugun potensiallaridan shoxobcha toklarini hisoblab, ularni kontur toklari usuli natijasi bilan solishtiring (np.allclose). Ikkala usulda tenglamalar soni nechta va qaysi biri bu zanjir uchun qulayroq — xulosa chiqaring.",
    "kirish": ""
   },
   {
    "sarlavha": "Monte-Karlo: qarshiliklar tolerantligining ta'siri",
    "matn": "Rezistorlar ±5 % tolerantlikka ega (tekis taqsimot). rng = np.random.default_rng(variant) bilan 10 000 ta tasodifiy R₁…R₅ to'plamini yarating.\nHar biri uchun A matritsani tuzib I ni toping — tsiklsiz, np.linalg.solve ning bir nechta matritsani birdaniga yechish imkoniyatidan foydalaning (A shakli (10000, 3, 3)).\nI₁ va I₃ uchun o'rtacha, standart chetlanish, 2.5 % va 97.5 % kvantillarni toping; R₄ dagi quvvat 10 % dan ko'p oshib ketish ehtimolini baholang. I₁ gistogrammasini chizing (plt.hist; plt.show()).",
    "kirish": ""
   },
   {
    "sarlavha": "Akkumulyator bilan pikni kesish",
    "matn": "Yillik yuklama P (variantingiz seed va masshtabi bilan) uchun sig'imi C = 800 kWh, quvvati Pb = 150 kW bo'lgan akkumulyator o'rnatiladi. Qoida: yuklama chegaradan (variantdagi «Chegara») oshgan soatlarda akkumulyator zaryadsizlanadi (ko'pi bilan Pb va qolgan zaryad), tungi soatlarda (23–7) esa to'liq zaryadlanadi (ko'pi bilan Pb).\nSutka bo'yicha simulyatsiya qiling (soatlik sikl mumkin). Natija: yangi Pmax, chegaradan oshgan soatlar soni (oldin/keyin), uch zonali tarif bo'yicha yillik to'lov (oldin/keyin) va tejamni chiqaring. Bir haftalik grafikda P va yangi yuklamani birga chizing.",
    "kirish": ""
   }
  ]
 },
 {
  "id": "a6",
  "nomi": "6-amaliy mashg'ulot: Pandas va Matplotlib — oylik hisoblagich ma'lumotlari tahlili",
  "mavzu": "read_csv, resample, groupby, rolling, reshape, subplots, imshow, ExcelWriter",
  "argvVariant": true,
  "eslatma": "Bu amaliyotda pandas va matplotlib ishlatiladi: birinchi ishga tushirishda ular yuklanadi (20–40 soniya). Grafiklar konsolda rasm bo'lib chiqadi, savefig() bilan saqlanganlari «📁 Fayllar» da paydo bo'ladi. Excel fayl yozish uchun openpyxl internetdan avtomatik o'rnatiladi.",
  "topshiriq": "Ma'lumot fayli 4-amaliyotdagi generator bilan yaratiladi (namunalarda generator.py bor, «Argumentlar» maydonida variant raqamingiz). Generatorning oy qismini o'z variantingizdagi oyga o'zgartiring (kunlar soni va hafta kunlariga e'tibor bering: oktyabr — 31 kun, noyabr — 30 kun).\n1. Faylni o'qib describe() natijasini keltiring; oylik energiya, ish/dam olish kunlarining o'rtacha iste'molini va haftalik energiyani hisoblang.\n2. Uch zonali tarif (kunduzgi c₀, pik k_pik·c₀, tungi k_tun·c₀ — variant bo'yicha) uchun groupby orqali zonalar bo'yicha energiya va oylik to'lovni hisoblang; bir zonali tarif bilan solishtiring.\n3. Berilgan oyna (soatlarda) bilan sirpanuvchi o'rtachani hisoblang va uni asl qator bilan bitta grafikda chizing; oyna kattalashganda grafik qanday o'zgarishini tushuntiring.\n4. Namunadagi kabi 2×2 hisobot panelini quring (sutkalik energiya, profillar, yuklama xaritasi, sirpanuvchi o'rtacha); grafiklarni sarlavha, o'q yozuvlari va legenda bilan rasmiylashtirib PNG ga saqlang.\n5. Natijalarni uch varaqli Excel faylga (Sutkalik, Profil, Tarif) yozing.\n\nKun × soat matritsasi uchun reshape(kunlar_soni, 24) ni oyingizga moslang.",
  "nazariy": "Pandas:\n  df = pd.read_csv(fayl, parse_dates=[\"vaqt\"], index_col=\"vaqt\")   # DatetimeIndex\n  df.index.hour, df.index.dayofweek (5, 6 — shanba, yakshanba), df.index.day\n  df[\"P_kW\"].resample(\"D\").sum() — sutkalik energiya;  resample(\"W\").sum() — haftalik (yakshanba bilan tugaydi)\n  df.groupby([\"dam\", \"soat\"])[\"P_kW\"].mean().unstack(\"dam\") — ish/dam kunlari uchun 24×2 profil\n  df[\"P_kW\"].rolling(24).mean() — 24 soatlik sirpanuvchi o'rtacha\n  df[\"P_kW\"].values.reshape(30, 24) — kun × soat matritsasi (yuklama xaritasi)\n  with pd.ExcelWriter(\"hisobot.xlsx\") as w: jadval.to_excel(w, sheet_name=\"Sutkalik\")\n\nMatplotlib:\n  fig, axs = plt.subplots(2, 2, figsize=(11, 7));  axs[0, 0].bar(...), axs[0, 1].plot(...)\n  axs[1, 0].imshow(matritsa, aspect=\"auto\", cmap=\"Blues\");  fig.colorbar(im, ax=axs[1, 0])\n  fig.suptitle(...), fig.tight_layout(), fig.savefig(\"panel.png\", dpi=150), plt.show()\n  Kurs ranglari: #0B2C5F, #1F5FBF, #0FA3A3, #F5A623, #E4572E\n\nTarif zonalari: kunduzgi 7:00–17:00 (c₀), pik 17:00–23:00 (k_pik·c₀), tungi 23:00–7:00 (k_tun·c₀).\n\nNamunaviy natija (7-variant, sentyabr): oylik 168 104 kWh; ish kuni o'rtacha 6415, dam olish 3371 kWh;\nhaftalik [32350, 38774, 38927, 38811, 19242]; ish kuni piki 10:00 da 444 kW.",
  "namunalar": [
   {
    "nomi": "generator.py",
    "izoh": "4-amaliyotdagi generator (2026-yil sentyabr uchun). Oy qismini o'z variantingizga moslang",
    "kod": "# generator.py - variant bo'yicha soatlik va sutkalik hisoblagich ma'lumotlarini yaratish\nimport csv, random, sys, datetime\nvariant = int(sys.argv[1]) if len(sys.argv) > 1 else 1\nrandom.seed(variant)                                   # har variant uchun o'z ma'lumoti\nish = [120,110,105,100,105,130,220,340,410,450,470,460,380,440,465,455,430,360,300,260,210,180,160,140]\ndam = [110,100,95,92,95,100,120,150,180,200,210,205,190,200,205,200,190,170,150,140,130,125,120,115]\nk = 0.8 + 0.02 * variant                               # masshtab koeffitsiyenti\nwith open(f\"soatlik_v{variant}.csv\", \"w\", newline=\"\") as f1, \\\n     open(f\"sutkalik_v{variant}.csv\", \"w\", newline=\"\") as f2:\n    w1 = csv.writer(f1); w2 = csv.writer(f2)\n    w1.writerow([\"vaqt\", \"P_kW\"]); w2.writerow([\"sana\", \"W_kWh\"])\n    for kun in range(1, 31):\n        hafta_kuni = datetime.date(2026, 9, kun).weekday()      # 0 - dushanba ... 6 - yakshanba\n        profil = dam if hafta_kuni >= 5 else ish\n        W = 0\n        for soat in range(24):\n            P = round(profil[soat] * k * random.gauss(1, 0.06), 1)\n            w1.writerow([f\"2026-09-{kun:02d} {soat:02d}:00\", P]); W += P\n        w2.writerow([f\"2026-09-{kun:02d}\", round(W)])\nprint(f\"{variant}-variant uchun soatlik_v{variant}.csv va \"\n      f\"sutkalik_v{variant}.csv yaratildi (k = {k:.2f})\")\n"
   },
   {
    "nomi": "tahlil_a6.py",
    "izoh": "Namuna: 7-variant fayli bo'yicha tahlil, 2×2 panel va Excel hisobot",
    "kod": "# tahlil_a6.py - oylik soatlik ma'lumot: Pandas tahlili va Matplotlib paneli\nimport pandas as pd, matplotlib.pyplot as plt\ndf = pd.read_csv(\"soatlik_v7.csv\", parse_dates=[\"vaqt\"], index_col=\"vaqt\")\ndf[\"soat\"] = df.index.hour; df[\"dam\"] = df.index.dayofweek >= 5\nsutka = df[\"P_kW\"].resample(\"D\").sum()\nhafta = df[\"P_kW\"].resample(\"W\").sum()\nprofil = df.groupby([\"dam\", \"soat\"])[\"P_kW\"].mean().unstack(\"dam\")\ndam_kun = sutka.index.dayofweek >= 5\nprint(f\"Oylik W = {sutka.sum():,.0f} kWh; ish kuni o'rtacha {sutka[~dam_kun].mean():.0f}, \"\n      f\"dam olish {sutka[dam_kun].mean():.0f} kWh\")\nprint(\"Haftalik W, kWh:\", hafta.round(0).astype(int).tolist())\nprint(\"Ish kuni piki:\", profil[False].idxmax(), \"soatda\", round(profil[False].max()), \"kW\")\nmatritsa = df[\"P_kW\"].values.reshape(30, 24)          # 30 kun x 24 soat\nfig, axs = plt.subplots(2, 2, figsize=(11, 7))\naxs[0, 0].bar(sutka.index.day, sutka, color=\"#1F5FBF\"); axs[0, 0].set_title(\"Sutkalik energiya, kWh\")\naxs[0, 1].plot(profil[False], \"o-\", color=\"#0B2C5F\", label=\"ish\")\naxs[0, 1].plot(profil[True], \"s--\", color=\"#0FA3A3\", label=\"dam\")\naxs[0, 1].legend(); axs[0, 1].set_title(\"O'rtacha soatlik profil, kW\")\nim = axs[1, 0].imshow(matritsa, aspect=\"auto\", cmap=\"Blues\"); axs[1, 0].set_title(\"Yuklama xaritasi: kun x soat\")\naxs[1, 0].set_xlabel(\"soat\"); axs[1, 0].set_ylabel(\"kun\")\nfig.colorbar(im, ax=axs[1, 0], label=\"kW\")\naxs[1, 1].plot(df[\"P_kW\"].rolling(24).mean(), color=\"#0B2C5F\")\naxs[1, 1].set_title(\"24 soatlik sirpanuvchi o'rtacha, kW\")\naxs[1, 1].tick_params(axis=\"x\", rotation=30)\nfor ax in axs.flat: ax.grid(alpha=0.3)\nfig.suptitle(\"7-variant: 2026-yil sentyabr oyi elektr iste'moli\", fontsize=13, fontweight=\"bold\")\nfig.tight_layout(); fig.savefig(\"panel_v7.png\", dpi=150)\nwith pd.ExcelWriter(\"hisobot_v7.xlsx\") as w:\n    sutka.to_frame(\"W_kWh\").to_excel(w, sheet_name=\"Sutkalik\")\n    profil.to_excel(w, sheet_name=\"Profil\")\nprint(\"panel_v7.png va hisobot_v7.xlsx yozildi\")\n"
   }
  ],
  "variantlar": [
   {
    "matn": "seed = 1 (generator: python generator.py 1)\nOy = 2026-09\nc₀ = 850 so'm/kWh\nk_pik = 1.5\nk_tun = 0.5\nSirpanuvchi o'rtacha oynasi = 48 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 2 (generator: python generator.py 2)\nOy = 2026-09\nc₀ = 950 so'm/kWh\nk_pik = 1.4\nk_tun = 0.6\nSirpanuvchi o'rtacha oynasi = 72 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 3 (generator: python generator.py 3)\nOy = 2026-11\nc₀ = 850 so'm/kWh\nk_pik = 1.5\nk_tun = 0.4\nSirpanuvchi o'rtacha oynasi = 72 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 4 (generator: python generator.py 4)\nOy = 2026-09\nc₀ = 1000 so'm/kWh\nk_pik = 1.5\nk_tun = 0.4\nSirpanuvchi o'rtacha oynasi = 12 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 5 (generator: python generator.py 5)\nOy = 2026-10\nc₀ = 900 so'm/kWh\nk_pik = 1.4\nk_tun = 0.4\nSirpanuvchi o'rtacha oynasi = 48 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 6 (generator: python generator.py 6)\nOy = 2026-10\nc₀ = 950 so'm/kWh\nk_pik = 1.5\nk_tun = 0.5\nSirpanuvchi o'rtacha oynasi = 12 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 7 (generator: python generator.py 7)\nOy = 2026-10\nc₀ = 950 so'm/kWh\nk_pik = 1.5\nk_tun = 0.6\nSirpanuvchi o'rtacha oynasi = 48 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 8 (generator: python generator.py 8)\nOy = 2026-11\nc₀ = 950 so'm/kWh\nk_pik = 1.4\nk_tun = 0.4\nSirpanuvchi o'rtacha oynasi = 72 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 9 (generator: python generator.py 9)\nOy = 2026-10\nc₀ = 850 so'm/kWh\nk_pik = 1.5\nk_tun = 0.5\nSirpanuvchi o'rtacha oynasi = 24 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 10 (generator: python generator.py 10)\nOy = 2026-11\nc₀ = 950 so'm/kWh\nk_pik = 1.6\nk_tun = 0.6\nSirpanuvchi o'rtacha oynasi = 24 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 11 (generator: python generator.py 11)\nOy = 2026-10\nc₀ = 850 so'm/kWh\nk_pik = 1.6\nk_tun = 0.4\nSirpanuvchi o'rtacha oynasi = 24 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 12 (generator: python generator.py 12)\nOy = 2026-10\nc₀ = 950 so'm/kWh\nk_pik = 1.4\nk_tun = 0.6\nSirpanuvchi o'rtacha oynasi = 24 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 13 (generator: python generator.py 13)\nOy = 2026-10\nc₀ = 900 so'm/kWh\nk_pik = 1.5\nk_tun = 0.4\nSirpanuvchi o'rtacha oynasi = 12 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 14 (generator: python generator.py 14)\nOy = 2026-11\nc₀ = 850 so'm/kWh\nk_pik = 1.5\nk_tun = 0.5\nSirpanuvchi o'rtacha oynasi = 24 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 15 (generator: python generator.py 15)\nOy = 2026-11\nc₀ = 900 so'm/kWh\nk_pik = 1.6\nk_tun = 0.6\nSirpanuvchi o'rtacha oynasi = 24 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 16 (generator: python generator.py 16)\nOy = 2026-10\nc₀ = 950 so'm/kWh\nk_pik = 1.6\nk_tun = 0.5\nSirpanuvchi o'rtacha oynasi = 24 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 17 (generator: python generator.py 17)\nOy = 2026-10\nc₀ = 950 so'm/kWh\nk_pik = 1.6\nk_tun = 0.6\nSirpanuvchi o'rtacha oynasi = 72 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 18 (generator: python generator.py 18)\nOy = 2026-10\nc₀ = 850 so'm/kWh\nk_pik = 1.5\nk_tun = 0.5\nSirpanuvchi o'rtacha oynasi = 12 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 19 (generator: python generator.py 19)\nOy = 2026-09\nc₀ = 850 so'm/kWh\nk_pik = 1.6\nk_tun = 0.5\nSirpanuvchi o'rtacha oynasi = 12 soat",
    "kirish": ""
   },
   {
    "matn": "seed = 20 (generator: python generator.py 20)\nOy = 2026-10\nc₀ = 1000 so'm/kWh\nk_pik = 1.5\nk_tun = 0.6\nSirpanuvchi o'rtacha oynasi = 24 soat",
    "kirish": ""
   }
  ],
  "qiyin": [
   {
    "sarlavha": "Anomaliyalarni avtomatik izlash",
    "matn": "Soatlik ma'lumotda har bir (dam, soat) guruhi uchun o'rtacha va standart chetlanishni groupby(...).transform() bilan hisoblang. O'z guruhining o'rtachasidan 2.5σ dan ko'p chetlangan soatlarni «anomaliya» deb belgilang.\nAnomaliyalar ro'yxatini (vaqt, P, kutilgan qiymat, chetlanish %) chiqaring. Tekshirish uchun ma'lumotga sun'iy ravishda 3 ta «avariya» (P = 0 bo'lgan 2 soat) va 1 ta «sakrash» (P × 1.8) qo'shib, dastur ularni topishini ko'rsating. Grafikda asl qator va anomaliyalarni qizil nuqtalar bilan belgilang.",
    "kirish": ""
   },
   {
    "sarlavha": "Uch xil tarif sxemasini solishtirish",
    "matn": "Bir oylik soatlik ma'lumot uchun uchta tarif sxemasi bo'yicha to'lovni hisoblang: 1) bir zonali c₀; 2) ikki zonali — kunduzgi (7–23) 1.2·c₀, tungi 0.6·c₀; 3) uch zonali (variantingizdagi k_pik, k_tun).\nNarxlar massivini pd.cut yoki np.select bilan quring. Natija: har sxema bo'yicha oylik to'lov va bir zonaliga nisbatan farq (%), zonalar ulushini ko'rsatuvchi doiraviy diagramma (pie) va uchala sxemaning sutkalik to'lovini bitta chiziqli grafikda chiqaring. Eng arzon sxemani dastur o'zi tavsiya qilsin.",
    "kirish": ""
   },
   {
    "sarlavha": "Ikki variantni solishtiruvchi hisobot",
    "matn": "Generator bilan o'z variantingiz va qo'shni variant (N+1) fayllarini yarating. Ikkalasini bitta DataFrame'ga (ustunlar: vN, vN+1) birlashtiring.\nHaftalik energiya, ish kuni profili va sutkalik maksimum bo'yicha farqlarni jadvalda chiqaring; korrelyatsiya koeffitsiyentini (df.corr()) hisoblang. 1×3 panel chizing: haftalik energiya (yonma-yon ustunlar), ish kuni profillari, farq grafigi. Natijani solishtirish.xlsx fayliga ikki varaq qilib yozing.",
    "kirish": ""
   }
  ]
 },
 {
  "id": "a7",
  "nomi": "7-amaliy mashg'ulot: OOP — iste'molchilar, podstansiya va tarmoq elementlari sinflari",
  "mavzu": "class, __init__, metodlar, __str__, meros, super(), polimorfizm, @property, kompozitsiya",
  "topshiriq": "1. Istemolchi va Podstansiya sinflarini yozing (yoki namunadan oling) va o'z variantingizdagi uchta iste'molchi uchun 1-masalani berilgan cosφ maqsadi bilan yeching; bitta iste'molchini qo'lda tekshiring.\n2. Istemolchi sinfiga __lt__ metodini qo'shing (cosφ bo'yicha taqqoslash) va sorted() ni key siz ishlating; Podstansiya ga __len__ va __iter__ qo'shib, len(ps) va for i in ps: ishlashini ko'rsating.\n3. Podstansiya.kompensatsiya(cos_maqsad) metodini yozing: u har iste'molchi uchun 25 kVAr li seksiyalar sonini (math.ceil) va kompensatsiyadan keyingi podstansiya cosφ va tokini qaytarsin.\n4. 2-masala uchun o'z variantingizning transformatori (Sn/S) va kondensatori (Qk) bilan Tarmoq modelini tuzing (namuna: tarmoq_isrof.py); iste'molchilarning toklarini 1-topshiriqdagi S va U dan hisoblab Liniya obyektlariga bering (kabel uzunligi 0.1 km, r₀ = 0.15 Ω/km); isroflar hisobotini va JSON ni yarating.\n5. Yangi element turi — Reaktor (isrof ΔP = Pn·k², Pn berilgan) — sinfini Element dan meros olib qo'shing va Tarmoq kodini o'zgartirmasdan hisobotga kiritilishini ko'rsating.\n\nVariantingizdagi transformator S > 1.4·Sn bo'lsa, @property himoyasi ValueError beradi — buni ham ko'rsating va izohlang.",
  "nazariy": "Iste'molchi: Q = P·tgφ,  S = √(P² + Q²),  Qk = P·(tgφ₁ − tgφ₂)\nPodstansiya: PΣ = ΣPᵢ,  QΣ = ΣQᵢ,  cosφΣ = PΣ / √(PΣ² + QΣ²),  I = SΣ / (√3·U)\nElementlar isrofi:\n  transformator  ΔP = P₀ + Pk·(S/Sn)²   (1000 kVA: P₀ = 1.5, Pk = 11.0 kW — namunadagi qiymat;\n                                          630 va 1600 kVA uchun taxminan: 630 — P₀ = 1.1, Pk = 7.6;\n                                          1600 — P₀ = 2.1, Pk = 16.5 kW, ustoz boshqasini aytsa, o'shani oling)\n  liniya (kabel) ΔP = 3·I²·r₀·L / 1000\n  kondensator    ΔP = Qk·tgδ   (tgδ ≈ 0.003)\n\nOOP:\n  class Istemolchi:  def __init__(self, nomi, P, cos_fi): self.nomi = nomi ...\n  obyekt.metod(),  __str__ — print(obyekt) uchun matn\n  Meros: class Liniya(Element): ... super().__init__(nomi)\n  Polimorfizm: har element o'zining isrof() metodiga ega, Tarmoq faqat e.isrof() ni chaqiradi\n  Inkapsulyatsiya: @property va @S.setter — qiymat tekshirilib o'rnatiladi\n  Kompozitsiya: Podstansiya ichida iste'molchilar ro'yxati, Tarmoq ichida elementlar ro'yxati\n  sorted(..., key=lambda i: i.cos_fi), sum(i.Q() for i in ...)\n\nNamuna (TP-7): jami P = 560 kW, Q = 446 kVAr, cosφ = 0.782, I = 1087.7 A, Qk = 261.9 kVAr;\nisroflar jami 22.70 kW (T-1 7.20; Nasos 6.62; Kompressor 4.57; Payvand 3.48; KB-1 0.83).",
  "namunalar": [
   {
    "nomi": "istemolchi.py",
    "izoh": "1-masala: TP-7, to'rt iste'molchi, cosφ bo'yicha saralangan hisobot",
    "kod": "# istemolchi.py - Iste'molchi va Podstansiya sinflari: quvvatlar va kompensatsiya\nimport math\n\nclass Istemolchi:\n    \"\"\"Uch fazali iste'molchi: nomi, aktiv quvvati (kW) va cos(fi).\"\"\"\n    def __init__(self, nomi, P, cos_fi):\n        self.nomi, self.P, self.cos_fi = nomi, P, cos_fi\n    def Q(self):\n        return self.P * math.tan(math.acos(self.cos_fi))\n    def S(self):\n        return math.hypot(self.P, self.Q())\n    def Qk(self, cos_maqsad=0.95):\n        \"\"\"cos(fi) ni maqsadga yetkazish uchun kondensator quvvati, kVAr.\"\"\"\n        return max(0.0, self.P * (math.tan(math.acos(self.cos_fi)) - math.tan(math.acos(cos_maqsad))))\n    def __str__(self):\n        return f\"{self.nomi:<12}{self.P:>8.0f}{self.Q():>9.1f}{self.S():>9.1f}{self.cos_fi:>7.2f}{self.Qk():>9.1f}\"\n\nclass Podstansiya:\n    def __init__(self, nomi, U):\n        self.nomi, self.U = nomi, U                 # U - kV\n        self.istemolchilar = []\n    def qosh(self, *ist):\n        self.istemolchilar.extend(ist)\n    def P(self): return sum(i.P for i in self.istemolchilar)\n    def Q(self): return sum(i.Q() for i in self.istemolchilar)\n    def cos_fi(self): return self.P() / math.hypot(self.P(), self.Q())\n    def I(self): return math.hypot(self.P(), self.Q()) / (math.sqrt(3) * self.U)\n    def hisobot(self, cos_maqsad=0.95):\n        print(f\"--- {self.nomi}, {self.U} kV ---\")\n        print(f\"{'Iste`molchi':<12}{'P, kW':>8}{'Q, kVAr':>9}{'S, kVA':>9}{'cos':>7}{'Qk':>9}\")\n        for i in sorted(self.istemolchilar, key=lambda i: i.cos_fi):\n            print(i)\n        Qk = sum(i.Qk(cos_maqsad) for i in self.istemolchilar)\n        print(f\"Jami: P = {self.P():.0f} kW, Q = {self.Q():.1f} kVAr, cos = {self.cos_fi():.3f}, I = {self.I():.1f} A\")\n        print(f\"Kompensatsiya ({cos_maqsad}): jami Qk = {Qk:.1f} kVAr, \"\n              f\"eng past cos: {min(self.istemolchilar, key=lambda i: i.cos_fi).nomi}\")\n\nps = Podstansiya(\"TP-7\", 0.38)\nps.qosh(Istemolchi(\"Nasoslar\", 180, 0.78), Istemolchi(\"Kompressor\", 250, 0.82),\n        Istemolchi(\"Yoritish\", 40, 0.95), Istemolchi(\"Payvandlash\", 90, 0.62))\nps.hisobot()\n"
   },
   {
    "nomi": "tarmoq_isrof.py",
    "izoh": "2-masala: Element → Transformator, Liniya, Kondensator; Tarmoq; JSON hisobot (ma'ruzadagi tarmoq.py ga mos)",
    "kod": "# tarmoq_isrof.py - tarmoq elementlari ierarxiyasi va isroflar (2-masala, TP-7)\nimport json\nfrom abc import ABC, abstractmethod\n\nclass Element(ABC):\n    \"\"\"Barcha tarmoq elementlari uchun bazaviy sinf.\"\"\"\n    def __init__(self, nomi):\n        self.nomi = nomi\n    @abstractmethod\n    def isrof(self):\n        \"\"\"Aktiv quvvat isrofi, kW.\"\"\"\n    def __str__(self):\n        return f\"{type(self).__name__:<14}{self.nomi:<12}{self.isrof():>8.2f} kW\"\n\nclass Transformator(Element):\n    def __init__(self, nomi, Sn, P0, Pk, S):\n        super().__init__(nomi)\n        self.Sn, self.P0, self.Pk = Sn, P0, Pk\n        self.S = S                                   # setter orqali tekshiriladi\n    @property\n    def S(self):\n        return self._S\n    @S.setter\n    def S(self, qiymat):\n        if not 0 <= qiymat <= 1.4 * self.Sn:\n            raise ValueError(f\"{self.nomi}: S = {qiymat} kVA ruxsat etilgan 1.4*Sn = {1.4*self.Sn:.0f} kVA dan katta\")\n        self._S = qiymat\n    def isrof(self):                                 # dP = P0 + Pk*(S/Sn)^2\n        return self.P0 + self.Pk * (self.S / self.Sn) ** 2\n\nclass Liniya(Element):\n    def __init__(self, nomi, I, r0, L):\n        super().__init__(nomi)\n        self.I, self.r0, self.L = I, r0, L           # A, Ohm/km, km\n    def isrof(self):                                 # dP = 3*I^2*r0*L/1000\n        return 3 * self.I ** 2 * self.r0 * self.L / 1000\n\nclass Kondensator(Element):\n    def __init__(self, nomi, Qk, tg_delta=0.003):\n        super().__init__(nomi)\n        self.Qk, self.tg_delta = Qk, tg_delta\n    def isrof(self):                                 # dP = Qk*tg(delta)\n        return self.Qk * self.tg_delta\n\nclass Tarmoq:\n    def __init__(self, nomi):\n        self.nomi, self.elementlar = nomi, []\n    def qosh(self, *el):\n        self.elementlar.extend(el)\n    def jami_isrof(self):                            # polimorfizm: har element o'zicha hisoblaydi\n        return sum(e.isrof() for e in self.elementlar)\n    def hisobot(self):\n        jami = self.jami_isrof()\n        print(f\"--- {self.nomi}: isroflar ---\")\n        for e in sorted(self.elementlar, key=lambda e: e.isrof(), reverse=True):\n            print(f\"{e}   {100 * e.isrof() / jami:5.1f} %\")\n        print(f\"Jami isrof: {jami:.2f} kW\")\n    def json_yoz(self, fayl):\n        with open(fayl, \"w\", encoding=\"utf-8\") as f:\n            json.dump({\"tarmoq\": self.nomi, \"jami_kW\": round(self.jami_isrof(), 2),\n                       \"elementlar\": [{\"tur\": type(e).__name__, \"nomi\": e.nomi, \"isrof_kW\": round(e.isrof(), 2)}\n                                      for e in self.elementlar]}, f, ensure_ascii=False, indent=2)\n\nt1 = Transformator(\"T-1\", 1000, 1.5, 11.0, 720)\ntp7 = Tarmoq(\"TP-7\")\ntp7.qosh(t1, Liniya(\"Nasos\", 350, 0.12, 0.15), Liniya(\"Kompressor\", 460, 0.09, 0.08),\n         Liniya(\"Payvand\", 220, 0.20, 0.12), Kondensator(\"KB-1\", 275))\ntp7.hisobot()\ntp7.json_yoz(\"tp7_isrof.json\")\nprint(\"tp7_isrof.json yozildi\")\ntry:\n    t1.S = 1500                                      # himoyani tekshirish\nexcept ValueError as xato:\n    print(\"Himoya ishladi:\", xato)\n"
   }
  ],
  "variantlar": [
   {
    "matn": "U = 0.66 kV\n1-iste'molchi: P/cosφ = 150/0.70\n2-iste'molchi: P/cosφ = 110/0.72\n3-iste'molchi: P/cosφ = 50/0.95\ncosφ maqsad = 0.95\nTransformator Sn/S = 630/720 kVA\nKondensator Qk = 200 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.38 kV\n1-iste'molchi: P/cosφ = 220/0.75\n2-iste'molchi: P/cosφ = 140/0.65\n3-iste'molchi: P/cosφ = 50/0.92\ncosφ maqsad = 0.92\nTransformator Sn/S = 1000/1200 kVA\nKondensator Qk = 150 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.38 kV\n1-iste'molchi: P/cosφ = 300/0.82\n2-iste'molchi: P/cosφ = 90/0.60\n3-iste'molchi: P/cosφ = 40/0.95\ncosφ maqsad = 0.92\nTransformator Sn/S = 630/720 kVA\nKondensator Qk = 100 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.38 kV\n1-iste'molchi: P/cosφ = 220/0.78\n2-iste'molchi: P/cosφ = 90/0.72\n3-iste'molchi: P/cosφ = 50/0.98\ncosφ maqsad = 0.92\nTransformator Sn/S = 1600/1200 kVA\nKondensator Qk = 200 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.38 kV\n1-iste'molchi: P/cosφ = 120/0.70\n2-iste'molchi: P/cosφ = 60/0.65\n3-iste'molchi: P/cosφ = 50/0.95\ncosφ maqsad = 0.95\nTransformator Sn/S = 630/1200 kVA\nKondensator Qk = 150 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.66 kV\n1-iste'molchi: P/cosφ = 150/0.75\n2-iste'molchi: P/cosφ = 60/0.72\n3-iste'molchi: P/cosφ = 40/0.95\ncosφ maqsad = 0.95\nTransformator Sn/S = 630/480 kVA\nKondensator Qk = 100 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.66 kV\n1-iste'molchi: P/cosφ = 220/0.75\n2-iste'molchi: P/cosφ = 60/0.60\n3-iste'molchi: P/cosφ = 30/0.95\ncosφ maqsad = 0.95\nTransformator Sn/S = 630/480 kVA\nKondensator Qk = 150 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.38 kV\n1-iste'molchi: P/cosφ = 150/0.82\n2-iste'molchi: P/cosφ = 140/0.72\n3-iste'molchi: P/cosφ = 40/0.95\ncosφ maqsad = 0.92\nTransformator Sn/S = 630/720 kVA\nKondensator Qk = 150 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.66 kV\n1-iste'molchi: P/cosφ = 220/0.75\n2-iste'molchi: P/cosφ = 140/0.60\n3-iste'molchi: P/cosφ = 30/0.92\ncosφ maqsad = 0.92\nTransformator Sn/S = 1000/900 kVA\nKondensator Qk = 100 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.38 kV\n1-iste'molchi: P/cosφ = 150/0.78\n2-iste'molchi: P/cosφ = 110/0.72\n3-iste'molchi: P/cosφ = 30/0.92\ncosφ maqsad = 0.92\nTransformator Sn/S = 630/480 kVA\nKondensator Qk = 200 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.38 kV\n1-iste'molchi: P/cosφ = 220/0.70\n2-iste'molchi: P/cosφ = 140/0.60\n3-iste'molchi: P/cosφ = 40/0.95\ncosφ maqsad = 0.95\nTransformator Sn/S = 630/1200 kVA\nKondensator Qk = 100 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.66 kV\n1-iste'molchi: P/cosφ = 220/0.75\n2-iste'molchi: P/cosφ = 110/0.65\n3-iste'molchi: P/cosφ = 30/0.95\ncosφ maqsad = 0.95\nTransformator Sn/S = 1000/900 kVA\nKondensator Qk = 150 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.38 kV\n1-iste'molchi: P/cosφ = 150/0.75\n2-iste'molchi: P/cosφ = 140/0.65\n3-iste'molchi: P/cosφ = 40/0.98\ncosφ maqsad = 0.92\nTransformator Sn/S = 1600/720 kVA\nKondensator Qk = 200 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.38 kV\n1-iste'molchi: P/cosφ = 300/0.70\n2-iste'molchi: P/cosφ = 140/0.72\n3-iste'molchi: P/cosφ = 50/0.98\ncosφ maqsad = 0.95\nTransformator Sn/S = 1600/900 kVA\nKondensator Qk = 100 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.38 kV\n1-iste'molchi: P/cosφ = 150/0.75\n2-iste'molchi: P/cosφ = 110/0.72\n3-iste'molchi: P/cosφ = 30/0.98\ncosφ maqsad = 0.95\nTransformator Sn/S = 1000/1200 kVA\nKondensator Qk = 100 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.38 kV\n1-iste'molchi: P/cosφ = 120/0.82\n2-iste'molchi: P/cosφ = 110/0.72\n3-iste'molchi: P/cosφ = 50/0.98\ncosφ maqsad = 0.95\nTransformator Sn/S = 1600/720 kVA\nKondensator Qk = 150 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.38 kV\n1-iste'molchi: P/cosφ = 120/0.78\n2-iste'molchi: P/cosφ = 140/0.65\n3-iste'molchi: P/cosφ = 30/0.98\ncosφ maqsad = 0.95\nTransformator Sn/S = 1000/1200 kVA\nKondensator Qk = 200 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.38 kV\n1-iste'molchi: P/cosφ = 180/0.82\n2-iste'molchi: P/cosφ = 90/0.72\n3-iste'molchi: P/cosφ = 50/0.95\ncosφ maqsad = 0.92\nTransformator Sn/S = 630/480 kVA\nKondensator Qk = 150 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.66 kV\n1-iste'molchi: P/cosφ = 250/0.78\n2-iste'molchi: P/cosφ = 90/0.60\n3-iste'molchi: P/cosφ = 50/0.95\ncosφ maqsad = 0.95\nTransformator Sn/S = 630/1200 kVA\nKondensator Qk = 200 kVAr",
    "kirish": ""
   },
   {
    "matn": "U = 0.38 kV\n1-iste'molchi: P/cosφ = 120/0.70\n2-iste'molchi: P/cosφ = 90/0.72\n3-iste'molchi: P/cosφ = 40/0.95\ncosφ maqsad = 0.95\nTransformator Sn/S = 1000/1200 kVA\nKondensator Qk = 200 kVAr",
    "kirish": ""
   }
  ],
  "qiyin": [
   {
    "sarlavha": "Ierarxik tarmoq: podstansiya → fiderlar → iste'molchilar",
    "matn": "Fider sinfini yozing: u iste'molchilar ro'yxatini saqlaydi va kabel parametrlariga (r₀, L) ega. Podstansiya endi fiderlardan iborat bo'lsin (kompozitsiya ichida kompozitsiya).\nHar ikki sinfda P(), Q(), S() metodlari bo'lsin; Podstansiya fiderlar bo'ylab, fider iste'molchilar bo'ylab yig'sin. Fider uchun kabel isrofi va kuchlanish pasayishini hisoblang.\n__add__ metodi bilan ikki fiderni birlashtirish (f1 + f2 → yangi Fider) imkonini bering. 2 ta fider (har birida 3 tadan iste'molchi) bilan podstansiyani to'liq hisobotini chiqaring: fiderlar bo'yicha P, Q, cosφ, isrof, ΔU va jami.",
    "kirish": ""
   },
   {
    "sarlavha": "Tarmoqni JSON'dan qurish va saqlash",
    "matn": "Tarmoq sinfiga @classmethod json_dan(fayl) va metod json_ga(fayl) qo'shing. JSON'da har element {\"tur\": \"Transformator\", \"nomi\": ..., parametrlar...} ko'rinishida saqlanadi.\nTurlarni ro'yxatga olish uchun lug'at-reyestrdan foydalaning (TURLAR = {\"Liniya\": Liniya, ...}); yangi tur (masalan Reaktor) qo'shilganda json_dan kodini o'zgartirish kerak bo'lmasin — buning uchun har sinf o'zini reyestrga dekorator yoki __init_subclass__ orqali qo'shsin.\nAylanma tekshiruv: tarmoqni JSON'ga yozing, qayta o'qing va jami isrof bir xilligini assert bilan tekshiring. Noma'lum tur yoki yetishmayotgan parametr uchun tushunarli xato bersin.",
    "kirish": ""
   },
   {
    "sarlavha": "Transformator quvvatini avtomatik tanlash",
    "matn": "Standart transformatorlar katalogini sinflar ro'yxati sifatida tuzing: Sn = 250, 400, 630, 1000, 1600, 2500 kVA (P₀ va Pk ni Sn ga proporsional deb oling: P₀ = 0.0015·Sn, Pk = 0.011·Sn kW).\nPodstansiya.transformator_tanla(cos_maqsad) metodi: kompensatsiyadan keyingi S ni hisoblab, yuklanish koeffitsiyenti k = S/Sn ≤ 0.8 bo'lgan eng kichik transformatorni tanlasin; har bir katalog transformatori uchun k va yillik isrof energiyasini (8760 soat, ΔW = P₀·8760 + Pk·k²·τ, τ = 4000 soat) jadvalda ko'rsatsin.\nKompensatsiyasiz va kompensatsiya bilan tanlovni solishtiring — kompensatsiya transformator quvvatini kamaytiradimi?",
    "kirish": ""
   }
  ]
 },
 {
  "id": "a8",
  "nomi": "8-amaliy mashg'ulot: Tkinter — muhandislik kalkulyatorlarining grafik interfeysi",
  "mavzu": "Tkinter vidjetlari, grid, command/bind, StringVar, ttk.Treeview, messagebox, try–except",
  "eslatma": "Diqqat: Tkinter (grafik oyna) brauzerda ishlamaydi. Shu yerda hisob funksiyasini yozib, turli kiritishlar bilan sinab ko'ring (1-topshiriq). Oynali ilovani ham shu muharrirda yozishingiz mumkin — ustoz kodingizni ko'radi, lekin uni ishga tushirish uchun kompyuteringizdagi Python (IDLE yoki VS Code) dan foydalaning.",
  "topshiriq": "Variantingizdagi masala uchun oldingi amaliy mashg'ulotlarda yozilgan hisobni grafik ilovaga aylantiring.\n1. Hisob funksiyasini alohida yozing va nazorat misolida tekshiring — buni shu yerda (brauzerda) bajaring. Funksiya noto'g'ri qiymatda (harf, manfiy, cosφ > 1, L ≤ 0) ValueError ko'tarsin.\n2. Interfeys eskizini grid jadvali ko'rinishida chizing: kiritish maydonlari, tanlash vidjeti (variantdagi turi bo'yicha), tugma, natija joyi.\n3. Ilovani yozing: kiritish variantda ko'rsatilgan vidjetlar bilan, natija ko'rsatilgan usulda (Treeview, Text yoki Label lar jadvali); kiritish try–except bilan himoyalangan, fizik tekshiruv bilan.\n4. Qulayliklar: sukut qiymatlar, Enter tugmasi, «Tozalash» tugmasi; variantda «grafik: ha» bo'lsa — natijani Matplotlib grafigi sifatida oynaga joylash.\n5. Ilovani kamida uch xil kiritish (to'g'ri, harf, fizik jihatdan noto'g'ri) bilan sinab, skrinshotlarini oling.",
  "nazariy": "Ilova tuzilishi: root = tk.Tk() → vidjetlar → root.mainloop()\nJoylashtirish: vidjet.grid(row=, column=, columnspan=, sticky=\"w\", padx=, pady=)\nHodisalar: tk.Button(..., command=hisobla);  root.bind(\"<Return>\", hisobla) → def hisobla(event=None)\nKiritish: Entry.get() — satr → float();  ttk.Combobox(values=[...]).get() / .set()\nSpinbox(from_=, to=, increment=);  Scale(from_=, to=, orient=\"horizontal\");  Radiobutton(variable=, value=)\nNatija: StringVar + Label(textvariable=...);  Text.insert(\"end\", matn), Text.delete(\"1.0\", \"end\")\nttk.Treeview(columns=..., show=\"headings\"): heading(), column(), insert(\"\", \"end\", values=...),\ndelete(), get_children(), tag_configure(\"teg\", background=...)\nXato: try: ... except ValueError as xato: messagebox.showerror(\"Xato\", str(xato))\n\nIlovani loyihalash tartibi: 1) hisob funksiyasini terminal dasturida tekshirish; 2) eskiz; 3) vidjetlar;\n4) callback: o'qish → tekshirish → hisoblash → natijani yozish; 5) noto'g'ri kiritish bilan sinash; 6) qulayliklar.",
  "namunalar": [
   {
    "nomi": "kompensatsiya_gui.py",
    "izoh": "1-masala: kompensatsiya kalkulyatori (kompyuterda ishga tushiriladi)",
    "kod": "# kompensatsiya_gui.py - reaktiv quvvat kompensatsiyasi kalkulyatori (Tkinter)\n# DIQQAT: Tkinter brauzerda ishlamaydi — bu dasturni kompyuteringizdagi Python (IDLE / VS Code) da ishga tushiring.\nimport tkinter as tk\nfrom tkinter import ttk, messagebox\nimport math\n\ndef hisobla(event=None):\n    try:\n        P = float(e_P.get()); U = float(e_U.get())\n        cos1 = float(e_cos1.get()); cos2 = float(cb_cos2.get())\n        if not (0 < cos1 < cos2 <= 1):\n            raise ValueError(\"0 < cos1 < cos2 <= 1 bo'lishi kerak\")\n    except ValueError as xato:\n        messagebox.showerror(\"Xato\", f\"Kiritishda xato: {xato}\"); return\n    tg1, tg2 = math.tan(math.acos(cos1)), math.tan(math.acos(cos2))\n    Q1, Q2 = P * tg1, P * tg2\n    S1, S2 = P / cos1, P / cos2\n    I1, I2 = S1 / (math.sqrt(3) * U), S2 / (math.sqrt(3) * U)\n    Qk = P * (tg1 - tg2); n = math.ceil(Qk / 25)\n    for satr in jadval.get_children(): jadval.delete(satr)\n    for nom, a, b in [(\"Q, kVAr\", Q1, Q2), (\"S, kVA\", S1, S2), (\"I, A\", I1, I2)]:\n        jadval.insert(\"\", \"end\", values=(nom, f\"{a:.1f}\", f\"{b:.1f}\", f\"{100*(b-a)/a:+.1f} %\"))\n    natija.set(f\"Qk = {Qk:.1f} kVAr -> {n} ta 25 kVAr seksiya ({25*n} kVAr)\")\n\nroot = tk.Tk(); root.title(\"Kompensatsiya kalkulyatori\"); root.configure(bg=\"#F3F6FB\")\ntk.Label(root, text=\"Reaktiv quvvat kompensatsiyasi\", font=(\"Arial\", 12, \"bold\"),\n         bg=\"#0B2C5F\", fg=\"white\", pady=8).grid(row=0, column=0, columnspan=2, sticky=\"we\")\ndef maydon(qator, matn, sukut):\n    tk.Label(root, text=matn, bg=\"#F3F6FB\").grid(row=qator, column=0, sticky=\"w\", padx=10, pady=3)\n    e = tk.Entry(root, width=10, justify=\"right\"); e.insert(0, sukut)\n    e.grid(row=qator, column=1, padx=10, pady=3, sticky=\"w\"); return e\ne_P = maydon(1, \"Aktiv quvvat P, kW:\", \"250\")\ne_U = maydon(2, \"Kuchlanish U, kV:\", \"0.38\")\ne_cos1 = maydon(3, \"Joriy cos(fi1):\", \"0.80\")\ntk.Label(root, text=\"Talab qilingan cos(fi2):\", bg=\"#F3F6FB\").grid(row=4, column=0, sticky=\"w\", padx=10, pady=3)\ncb_cos2 = ttk.Combobox(root, values=[\"0.90\", \"0.92\", \"0.95\", \"0.97\"], width=7); cb_cos2.set(\"0.95\")\ncb_cos2.grid(row=4, column=1, padx=10, pady=3, sticky=\"w\")\ntk.Button(root, text=\"Hisoblash\", command=hisobla, bg=\"#0FA3A3\", fg=\"white\",\n          font=(\"Arial\", 10, \"bold\"), width=16).grid(row=5, column=0, columnspan=2, pady=8)\njadval = ttk.Treeview(root, columns=(\"k\", \"oldin\", \"keyin\", \"farq\"), show=\"headings\", height=3)\nfor ustun, nom, w in [(\"k\", \"Ko'rsatkich\", 90), (\"oldin\", \"Oldin\", 70), (\"keyin\", \"Keyin\", 70), (\"farq\", \"O'zgarish\", 80)]:\n    jadval.heading(ustun, text=nom); jadval.column(ustun, width=w, anchor=\"center\")\njadval.grid(row=6, column=0, columnspan=2, padx=10)\nnatija = tk.StringVar(value=\"\")\ntk.Label(root, textvariable=natija, bg=\"#F3F6FB\", fg=\"#0B2C5F\",\n         font=(\"Arial\", 10, \"bold\")).grid(row=7, column=0, columnspan=2, pady=8)\nroot.bind(\"<Return>\", hisobla)\nif __name__ == \"__main__\":\n    root.mainloop()\n"
   },
   {
    "nomi": "kabel_gui.py",
    "izoh": "2-masala: kabel kesimini tanlash ilovasi (kompyuterda ishga tushiriladi)",
    "kod": "# kabel_gui.py - kabel kesimini tanlash ilovasi (Tkinter + Treeview)\n# DIQQAT: Tkinter brauzerda ishlamaydi — bu dasturni kompyuteringizdagi Python (IDLE / VS Code) da ishga tushiring.\nimport tkinter as tk\nfrom tkinter import ttk, messagebox\nS    = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120]\nIdop = [19, 25, 35, 42, 55, 75, 95, 120, 145, 180, 220, 260]\nkt_jadval = {\"15\": 1.11, \"20\": 1.06, \"25\": 1.00, \"30\": 0.94, \"35\": 0.87, \"40\": 0.79, \"45\": 0.71}\n\ndef tanla():\n    try:\n        I = float(e_I.get()); kt = kt_jadval[cb_t.get()]\n    except (ValueError, KeyError):\n        messagebox.showerror(\"Xato\", \"Tok va haroratni to'g'ri kiriting\"); return\n    Ihis = I / kt\n    for satr in jadval.get_children(): jadval.delete(satr)\n    tanlangan = None\n    for s, i in zip(S, Idop):\n        holat = \"yetmaydi\" if i < Ihis else (\"TANLANDI\" if tanlangan is None else \"zaxira\")\n        if i >= Ihis and tanlangan is None: tanlangan = (s, i)\n        teg = \"tanlangan\" if holat == \"TANLANDI\" else (\"yomon\" if holat == \"yetmaydi\" else \"\")\n        jadval.insert(\"\", \"end\", values=(s, i, holat), tags=(teg,))\n    natija.set(f\"Ihis = {I:.0f} / {kt} = {Ihis:.1f} A -> S = {tanlangan[0]} mm², Idop = {tanlangan[1]} A\"\n               if tanlangan else \"Jadvalda mos kesim yo'q: parallel kabel kerak\")\n\nroot = tk.Tk(); root.title(\"Kabel kesimini tanlash\"); root.configure(bg=\"#F3F6FB\")\ntk.Label(root, text=\"Kabel kesimini tok bo'yicha tanlash\", font=(\"Arial\", 12, \"bold\"),\n         bg=\"#0B2C5F\", fg=\"white\", pady=8).grid(row=0, column=0, columnspan=3, sticky=\"we\")\ntk.Label(root, text=\"Hisobiy tok I, A:\", bg=\"#F3F6FB\").grid(row=1, column=0, sticky=\"w\", padx=10, pady=4)\ne_I = tk.Entry(root, width=8, justify=\"right\"); e_I.insert(0, \"95\"); e_I.grid(row=1, column=1, sticky=\"w\")\ntk.Label(root, text=\"Muhit harorati, °C:\", bg=\"#F3F6FB\").grid(row=2, column=0, sticky=\"w\", padx=10, pady=4)\ncb_t = ttk.Combobox(root, values=list(kt_jadval), width=5); cb_t.set(\"35\"); cb_t.grid(row=2, column=1, sticky=\"w\")\ntk.Button(root, text=\"Tanlash\", command=tanla, bg=\"#0FA3A3\", fg=\"white\", font=(\"Arial\", 10, \"bold\"),\n          width=12).grid(row=1, column=2, rowspan=2, padx=10)\njadval = ttk.Treeview(root, columns=(\"S\", \"Idop\", \"holat\"), show=\"headings\", height=12)\nfor ustun, nom, w in [(\"S\", \"S, mm²\", 80), (\"Idop\", \"Idop, A\", 80), (\"holat\", \"Holat\", 110)]:\n    jadval.heading(ustun, text=nom); jadval.column(ustun, width=w, anchor=\"center\")\njadval.tag_configure(\"tanlangan\", background=\"#C9F2EC\"); jadval.tag_configure(\"yomon\", foreground=\"#9AA5B5\")\njadval.grid(row=3, column=0, columnspan=3, padx=10, pady=6)\nnatija = tk.StringVar(value=\"\")\ntk.Label(root, textvariable=natija, bg=\"#F3F6FB\", fg=\"#0B2C5F\",\n         font=(\"Arial\", 10, \"bold\")).grid(row=4, column=0, columnspan=3, pady=(0, 8))\nif __name__ == \"__main__\":\n    root.mainloop()\n"
   }
  ],
  "variantlar": [
   {
    "matn": "Masala: Kuchlanish pasayishi ΔU\nU = 0.38 kV\nKiritish vidjetlari: Entry+Combobox\nNatija ko'rinishi: Treeview\nGrafik oynada: yo'q\n\nHisob manbasi: 3-amaliy mashg'ulot (ΔU% = (P·R₀ + Q·X₀)·L / (10·U²))",
    "kirish": ""
   },
   {
    "matn": "Masala: Transformator isrofi\nU = 6 kV\nKiritish vidjetlari: Entry+Combobox\nNatija ko'rinishi: Treeview\nGrafik oynada: ha\n\nHisob manbasi: 3-ma'ruza (ΔP = P₀ + Pk·(S/Sn)²)",
    "kirish": ""
   },
   {
    "matn": "Masala: Uch zonali tarif\nU = 6 kV\nKiritish vidjetlari: Entry+Combobox\nNatija ko'rinishi: Text\nGrafik oynada: ha\n\nHisob manbasi: 2-amaliy mashg'ulot (kun c₀, pik 1.5·c₀, tun 0.5·c₀)",
    "kirish": ""
   },
   {
    "matn": "Masala: Yuklama grafigi ko'rsatkichlari\nU = 6 kV\nKiritish vidjetlari: Entry+Spinbox\nNatija ko'rinishi: Label jadval\nGrafik oynada: yo'q\n\nHisob manbasi: 4-ma'ruza (W, Pmax, Po'rt, Tmax = W/Pmax, kz = Po'rt/Pmax)",
    "kirish": ""
   },
   {
    "matn": "Masala: Om qonuni va liniya isrofi\nU = 10 kV\nKiritish vidjetlari: Entry+Scale\nNatija ko'rinishi: Text\nGrafik oynada: yo'q\n\nHisob manbasi: 3-ma'ruza (I = P/(√3·U·cosφ), ΔP = 3·I²·r₀·L/1000)",
    "kirish": ""
   },
   {
    "matn": "Masala: Kuchlanish pasayishi ΔU\nU = 6 kV\nKiritish vidjetlari: Entry+Combobox\nNatija ko'rinishi: Label jadval\nGrafik oynada: yo'q\n\nHisob manbasi: 3-amaliy mashg'ulot (ΔU% = (P·R₀ + Q·X₀)·L / (10·U²))",
    "kirish": ""
   },
   {
    "matn": "Masala: Transformator isrofi\nU = 10 kV\nKiritish vidjetlari: Entry+Spinbox\nNatija ko'rinishi: Text\nGrafik oynada: yo'q\n\nHisob manbasi: 3-ma'ruza (ΔP = P₀ + Pk·(S/Sn)²)",
    "kirish": ""
   },
   {
    "matn": "Masala: Uch zonali tarif\nU = 6 kV\nKiritish vidjetlari: Entry+Combobox\nNatija ko'rinishi: Label jadval\nGrafik oynada: yo'q\n\nHisob manbasi: 2-amaliy mashg'ulot (kun c₀, pik 1.5·c₀, tun 0.5·c₀)",
    "kirish": ""
   },
   {
    "matn": "Masala: Yuklama grafigi ko'rsatkichlari\nU = 6 kV\nKiritish vidjetlari: Entry+Scale\nNatija ko'rinishi: Text\nGrafik oynada: yo'q\n\nHisob manbasi: 4-ma'ruza (W, Pmax, Po'rt, Tmax = W/Pmax, kz = Po'rt/Pmax)",
    "kirish": ""
   },
   {
    "matn": "Masala: Om qonuni va liniya isrofi\nU = 10 kV\nKiritish vidjetlari: Entry+Scale\nNatija ko'rinishi: Text\nGrafik oynada: yo'q\n\nHisob manbasi: 3-ma'ruza (I = P/(√3·U·cosφ), ΔP = 3·I²·r₀·L/1000)",
    "kirish": ""
   },
   {
    "matn": "Masala: Kuchlanish pasayishi ΔU\nU = 10 kV\nKiritish vidjetlari: Entry+Spinbox\nNatija ko'rinishi: Text\nGrafik oynada: yo'q\n\nHisob manbasi: 3-amaliy mashg'ulot (ΔU% = (P·R₀ + Q·X₀)·L / (10·U²))",
    "kirish": ""
   },
   {
    "matn": "Masala: Transformator isrofi\nU = 6 kV\nKiritish vidjetlari: Entry+Radiobutton\nNatija ko'rinishi: Label jadval\nGrafik oynada: yo'q\n\nHisob manbasi: 3-ma'ruza (ΔP = P₀ + Pk·(S/Sn)²)",
    "kirish": ""
   },
   {
    "matn": "Masala: Uch zonali tarif\nU = 10 kV\nKiritish vidjetlari: Entry+Spinbox\nNatija ko'rinishi: Treeview\nGrafik oynada: ha\n\nHisob manbasi: 2-amaliy mashg'ulot (kun c₀, pik 1.5·c₀, tun 0.5·c₀)",
    "kirish": ""
   },
   {
    "matn": "Masala: Yuklama grafigi ko'rsatkichlari\nU = 10 kV\nKiritish vidjetlari: Entry+Combobox\nNatija ko'rinishi: Treeview\nGrafik oynada: yo'q\n\nHisob manbasi: 4-ma'ruza (W, Pmax, Po'rt, Tmax = W/Pmax, kz = Po'rt/Pmax)",
    "kirish": ""
   },
   {
    "matn": "Masala: Om qonuni va liniya isrofi\nU = 6 kV\nKiritish vidjetlari: Entry+Radiobutton\nNatija ko'rinishi: Text\nGrafik oynada: yo'q\n\nHisob manbasi: 3-ma'ruza (I = P/(√3·U·cosφ), ΔP = 3·I²·r₀·L/1000)",
    "kirish": ""
   },
   {
    "matn": "Masala: Kuchlanish pasayishi ΔU\nU = 6 kV\nKiritish vidjetlari: Entry+Spinbox\nNatija ko'rinishi: Text\nGrafik oynada: ha\n\nHisob manbasi: 3-amaliy mashg'ulot (ΔU% = (P·R₀ + Q·X₀)·L / (10·U²))",
    "kirish": ""
   },
   {
    "matn": "Masala: Transformator isrofi\nU = 10 kV\nKiritish vidjetlari: Entry+Spinbox\nNatija ko'rinishi: Label jadval\nGrafik oynada: yo'q\n\nHisob manbasi: 3-ma'ruza (ΔP = P₀ + Pk·(S/Sn)²)",
    "kirish": ""
   },
   {
    "matn": "Masala: Uch zonali tarif\nU = 6 kV\nKiritish vidjetlari: Entry+Scale\nNatija ko'rinishi: Text\nGrafik oynada: yo'q\n\nHisob manbasi: 2-amaliy mashg'ulot (kun c₀, pik 1.5·c₀, tun 0.5·c₀)",
    "kirish": ""
   },
   {
    "matn": "Masala: Yuklama grafigi ko'rsatkichlari\nU = 10 kV\nKiritish vidjetlari: Entry+Combobox\nNatija ko'rinishi: Text\nGrafik oynada: yo'q\n\nHisob manbasi: 4-ma'ruza (W, Pmax, Po'rt, Tmax = W/Pmax, kz = Po'rt/Pmax)",
    "kirish": ""
   },
   {
    "matn": "Masala: Om qonuni va liniya isrofi\nU = 0.38 kV\nKiritish vidjetlari: Entry+Spinbox\nNatija ko'rinishi: Label jadval\nGrafik oynada: yo'q\n\nHisob manbasi: 3-ma'ruza (I = P/(√3·U·cosφ), ΔP = 3·I²·r₀·L/1000)",
    "kirish": ""
   }
  ],
  "qiyin": [
   {
    "sarlavha": "Menyuli konsol kalkulyatori (GUI dan oldin mantiq)",
    "matn": "Beshta hisobni (ΔU, transformator isrofi, uch zonali tarif, yuklama grafigi ko'rsatkichlari, Om qonuni va liniya isrofi) alohida funksiyalar sifatida yozing. Har biri lug'at qaytarsin: {\"natija\": ..., \"birlik\": ..., \"izoh\": ...}.\nwhile True sikli bilan menyu yarating (1–5 — hisob turi, 0 — chiqish). Kiritish uchun umumiy son_ol(matn, min=None, max=None) funksiyasi try–except bilan to'g'ri qiymat kiritilguncha qayta so'rasin.\nHar bir hisob natijasi tarix ro'yxatiga yozilsin, «6 — tarix» bandi barcha hisoblarni jadval qilib chiqarsin, «7 — saqlash» tarixni tarix.json fayliga yozsin.",
    "kirish": "1\n2000\n660\n10\n0.45\n0.38\n10\n6\n0"
   },
   {
    "sarlavha": "Mantiqni sinovlar (assert) bilan tekshirish",
    "matn": "Variantingizdagi hisob uchun Kalkulyator sinfini yozing: kiritish qiymatlarini tekshiruvchi tekshir() metodi (xato bo'lsa ValueError, tushunarli o'zbekcha xabar bilan) va hisobla() metodi (natijalar lug'ati).\nKamida 8 ta sinov yozing: 3 ta to'g'ri qiymatli (natijani qo'lda hisoblangan qiymat bilan math.isclose orqali solishtirib), 5 ta noto'g'ri (harf, bo'sh satr, manfiy, nol, chegaradan tashqari) — har biri ValueError berishini tekshirsin.\nSinovlar natijasini «✓ / ✗» jadvali qilib chiqaring. Shu sinf keyin Tkinter ilovangizda o'zgarishsiz ishlatilishini izohlang (mantiq va interfeysni ajratish).",
    "kirish": ""
   },
   {
    "sarlavha": "Universal jadval chiqaruvchi funksiya",
    "matn": "jadval_chiqar(sarlavhalar, qatorlar, formatlar=None) funksiyasini yozing: u ustun kengliklarini avtomatik hisoblasin, sonlarni o'ngga, matnni chapga tekislasin, sarlavha ostiga chiziq tortsin va har ustun uchun format (masalan \".2f\", \",.0f\") berish imkonini bersin. Uzun matnni «…» bilan qisqartirish uchun max_kenglik parametri bo'lsin.\nFunksiyani ikkita oldingi amaliyot natijasini (masalan, kabel kesimlari jadvali va tarif zonalari) chiqarish uchun ishlating. Bu — Tkinter'dagi Treeview'ning konsoldagi muqobili.",
    "kirish": ""
   }
  ]
 }
];
