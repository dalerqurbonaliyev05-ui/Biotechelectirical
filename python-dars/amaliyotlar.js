/* Python Dars — amaliy mashg'ulotlar bazasi.

   Har bir amaliyot:
     id         — qisqa, takrorlanmas nom (faqat lotin harf, raqam, chiziqcha)
     nomi       — ro'yxatda ko'rinadigan nom
     mavzu      — qisqa izoh (ixtiyoriy)
     variantlar — talabalarga tarqatiladigan variantlar. Har biri:
                    matn   — masala sharti
                    kirish — namunaviy kiruvchi ma'lumot (ixtiyoriy, input() uchun; har qatorga bittadan)
     qiyin      — ustoz iqtidorli talabaga yuboradigan qiyinroq masalalar. Har biri: sarlavha, matn, kirish (ixtiyoriy)

   DIQQAT: hozircha bu yerda 2 ta NAMUNA amaliyot turibdi. Haqiqiy amaliy mashg'ulotlar shu ro'yxatga qo'shiladi. */

window.AMALIYOTLAR = [
  {
    id: 'namuna-1',
    nomi: "Namuna 1: Chiziqli dasturlar (input, print, arifmetika)",
    mavzu: "O'zgaruvchilar, input(), print(), arifmetik amallar",
    variantlar: [
      { matn: "To'g'ri to'rtburchakning tomonlari a va b kiritiladi. Uning yuzi va perimetrini hisoblab chiqaring.", kirish: "5\n3" },
      { matn: "Doiraning radiusi r kiritiladi. Doira yuzi va aylana uzunligini hisoblang (pi = 3.14159).", kirish: "4" },
      { matn: "Uch xonali son kiritiladi. Uning raqamlari yig'indisi va ko'paytmasini toping.", kirish: "472" },
      { matn: "Selsiy shkalasidagi harorat C kiritiladi. Uni Farengeyt (F = C*9/5 + 32) va Kelvin (K = C + 273.15) shkalasiga o'tkazing.", kirish: "25" },
      { matn: "Kuchlanish U (V) va qarshilik R (Om) kiritiladi. Tok kuchi I = U/R va quvvat P = U*I ni hisoblang.", kirish: "220\n55" },
      { matn: "Sekundlarda berilgan vaqt kiritiladi. Uni soat, minut va sekundga ajratib chiqaring (masalan 3725 → 1 soat 2 minut 5 sekund).", kirish: "3725" },
    ],
    qiyin: [
      { sarlavha: "Kvadrat tenglama", matn: "a, b, c kiritiladi. ax² + bx + c = 0 tenglamaning ildizlarini toping. Diskriminant manfiy bo'lsa \"Haqiqiy ildiz yo'q\", nolga teng bo'lsa bitta ildiz chiqarilsin. a = 0 holatini ham hisobga oling.", kirish: "1\n-3\n2" },
      { sarlavha: "Uchburchak", matn: "Uchburchakning uchta tomoni kiritiladi. Bunday uchburchak mavjudmi, tekshiring. Mavjud bo'lsa, Geron formulasi bilan yuzini va turini (teng tomonli / teng yonli / to'g'ri burchakli / oddiy) aniqlang.", kirish: "3\n4\n5" },
    ],
  },
  {
    id: 'namuna-2',
    nomi: "Namuna 2: Sikllar (for, while)",
    mavzu: "for, while, range(), yig'indi va ko'paytma",
    variantlar: [
      { matn: "n kiritiladi. 1 dan n gacha bo'lgan juft sonlar yig'indisini toping.", kirish: "10" },
      { matn: "n kiritiladi. n! (faktorial) ni sikl yordamida hisoblang.", kirish: "6" },
      { matn: "Butun son kiritiladi. Uning raqamlari sonini while sikli yordamida toping.", kirish: "908172" },
      { matn: "n kiritiladi. Fibonachchi ketma-ketligining birinchi n ta hadini chiqaring.", kirish: "10" },
      { matn: "n kiritiladi. 1 dan n gacha bo'lgan sonlarning kvadratlari jadvalini chiqaring (son — kvadrati).", kirish: "5" },
      { matn: "a va b kiritiladi. [a; b] oraliqdagi 3 ga bo'linadigan, lekin 5 ga bo'linmaydigan sonlarni chiqaring.", kirish: "1\n40" },
    ],
    qiyin: [
      { sarlavha: "Tub sonlar", matn: "n kiritiladi. n dan oshmaydigan barcha tub sonlarni chiqaring va ularning sonini ayting. Iloji boricha tez ishlaydigan usulni qo'llang (masalan Eratosfen g'alviri).", kirish: "50" },
      { sarlavha: "Mukammal sonlar", matn: "n kiritiladi. 1 dan n gacha bo'lgan barcha mukammal sonlarni toping (o'zidan boshqa bo'luvchilari yig'indisi o'ziga teng son, masalan 6 = 1+2+3).", kirish: "10000" },
    ],
  },
];
