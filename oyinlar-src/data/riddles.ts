// O'zbek xalq topishmoqlari (og'zaki ijod, muallifsiz). Javob va qo'shimcha to'g'ri variantlar.
export interface Riddle {
  q: string;
  a: string;
  alt?: string[];
  hint: string;
}

export const RIDDLES: Riddle[] = [
  { q: "Bir ota, o'n ikki o'g'il, har o'g'lining o'ttizta nevarasi bor.", a: "Yil", alt: ["yil oy kun", "yil, oylar va kunlar"], hint: "Taqvim bilan bog'liq" },
  { q: "Oq tovuq, qora tovuq bir-birini quvlaydi, hech yetolmaydi.", a: "Kecha va kunduz", alt: ["kun va tun", "kecha kunduz", "tun va kun"], hint: "Har kuni almashadi" },
  { q: "Bobo o'tirar yuz to'n kiyib, kim yechsa — ko'z yoshi to'kar.", a: "Piyoz", hint: "Oshxonada bo'ladi" },
  { q: "Usti yashil, ichi qizil, urug'i qora.", a: "Tarvuz", hint: "Yozgi poliz mevasi" },
  { q: "Bir sandiqda ikki xil yog'.", a: "Tuxum", hint: "Tovuq beradi" },
  { q: "Oyog'i yo'q — yuradi, qo'li yo'q — ko'rsatadi.", a: "Soat", hint: "Vaqtni biladi" },
  { q: "Tishi bor — tishlamaydi, sochni silliq taraydi.", a: "Taroq", hint: "Har tong ishlatamiz" },
  { q: "Suvdan chiqadi, suvdan qo'rqadi.", a: "Tuz", hint: "Taomga solinadi" },
  { q: "Yuvgan sari kichrayadi.", a: "Sovun", hint: "Qo'l yuvganda kerak" },
  { q: "Hammani kiyintiradi, o'zi yalang'och.", a: "Igna", hint: "Tikuvchining quroli" },
  { q: "Qizil qiz qorong'i uyda o'tirar, sochi tashqarida.", a: "Sabzi", hint: "Palovga solinadi" },
  { q: "To'rt oyog'i bor, yurolmaydi.", a: "Stol", alt: ["stul", "xontaxta"], hint: "Uy jihozi" },
  { q: "Osmonda oltin patnis.", a: "Quyosh", alt: ["oftob", "kun"], hint: "Kunduzi charaqlaydi" },
  { q: "Kechasi chiqar, kunduzi yo'qolar, osmonda son-sanoqsiz.", a: "Yulduzlar", alt: ["yulduz"], hint: "Tunda miltillaydi" },
  { q: "Bir to'da qo'y, bitta cho'pon.", a: "Oy va yulduzlar", alt: ["yulduzlar va oy", "oy", "yulduzlar"], hint: "Tungi osmonga qarang" },
  { q: "Yozda kiyinadi, qishda yechinadi.", a: "Daraxt", alt: ["terak", "tol"], hint: "Bargi bor" },
  { q: "Uyini orqalab yuradi, hech shoshilmaydi.", a: "Toshbaqa", alt: ["shilliqqurt"], hint: "Juda sekin hayvon" },
  { q: "Mo'ylovi bor — chol emas, tirnog'i bor — burgut emas.", a: "Mushuk", hint: "Sichqon ovlaydi" },
  { q: "Tili yo'q — gapiradi, jonsiz — sir aytadi.", a: "Kitob", alt: ["xat", "maktub"], hint: "Uni o'qiymiz" },
  { q: "Qordek oq, ammo qor emas; shirin, ammo asal emas.", a: "Qand", alt: ["shakar"], hint: "Choyga solinadi" },
  { q: "Bir qutida yuzta marjon.", a: "Anor", hint: "Qizil donali meva" },
  { q: "Qo'li yo'q, oyog'i yo'q — eshikni ochadi.", a: "Shamol", alt: ["yel"], hint: "Ko'rinmaydi, lekin esadi" },
  { q: "Ko'rinmaydi, lekin hamma joyda; usiz yashab bo'lmaydi.", a: "Havo", hint: "Nafas olamiz" },
  { q: "Osmondan ip tushadi, hech kim ushlolmaydi.", a: "Yomg'ir", hint: "Bulutdan keladi" },
  { q: "Oppoq ko'rpa yerni yopdi.", a: "Qor", hint: "Qishda yog'adi" },
  { q: "Doim yonimda, ammo ushlay olmayman.", a: "Soya", hint: "Quyoshda paydo bo'ladi" },
  { q: "Qanoti bor — qush emas, gul ustida yashaydi.", a: "Kapalak", hint: "Rangli qanotlari bor" },
  { q: "Ikki og'a-ini bir-birini ko'rmaydi.", a: "Ko'zlar", alt: ["ko'z"], hint: "Yuzimizda" },
  { q: "Besh og'a-ini bir uyda yashaydi.", a: "Qo'lqop", alt: ["barmoqlar", "barmoq"], hint: "Qishda qo'lga kiyiladi" },
  { q: "Tishlari ko'p, ovqat yemaydi, yog'ochni kesadi.", a: "Arra", hint: "Duradgor quroli" },
  { q: "Kunduzi uxlaydi, kechasi uchadi.", a: "Ko'rshapalak", alt: ["boyo'g'li", "boyqush", "ukki"], hint: "Tungi uchar jonzot" },
  { q: "Qish kuni oq po'stin, yoz kuni kulrang po'stin kiyadi.", a: "Quyon", hint: "Uzun quloqli" },
  { q: "Yetti rangli ko'prik yomg'irdan keyin chiqadi.", a: "Kamalak", hint: "Osmonda rang-barang yoy" },
  { q: "Ko'z ochib-yumguncha butun dunyoni aylanib keladi.", a: "Xayol", alt: ["fikr", "o'y"], hint: "Boshimizda" },
  { q: "Kichkinagina iti bor, uyni qo'riqlaydi, vovullamaydi.", a: "Qulf", hint: "Kalit bilan ochiladi" },
  { q: "Qora sigir hammani yotqizadi.", a: "Tun", alt: ["kecha"], hint: "Qorong'i tushadi" },
  { q: "Qarasang — senga qaraydi, kulsang — kuladi.", a: "Ko'zgu", alt: ["oyna"], hint: "Devorga osiladi" },
  { q: "Oqadi-oqadi, oqib tugamaydi.", a: "Daryo", alt: ["suv", "ariq", "soy"], hint: "Tog'dan boshlanadi" },
  { q: "Kichkina uyda yuzta askar, hammasining boshi qizil.", a: "Gugurt", hint: "Olov yoqadi" },
  { q: "Bo'yi bir qarich, soqoli bilan uyni supuradi.", a: "Supurgi", hint: "Tozalik uchun" },
  { q: "Tagida olov, boshida qopqoq, qorni to'la osh.", a: "Qozon", hint: "Palov unda pishadi" },
  { q: "Gul ustida ishlaydi, shirin asal tayyorlaydi.", a: "Asalari", alt: ["ari"], hint: "Vizillab uchadi" },
  { q: "O'tin emas — yonadi, quyosh emas — nur sochadi.", a: "Sham", alt: ["chiroq"], hint: "Qorong'ida yoqiladi" },
];

export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/[^a-z'Ѐ-ӿ ]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(va|ham)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
