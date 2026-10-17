// Glossariy: atamalar va uskuna turlarining qisqa izohlari (uskuna kartasida va glossariy sahifasida).

export interface GlossaryEntry {
  term: string;
  short: string;
  text: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  breaker: {
    term: "O'chirgich (Q)",
    short: "Yuklama va qisqa tutashuv tokini uzadi va ulaydi.",
    text: "O'chirgich yoy so'ndiruvchi kameraga ega kommutatsiya apparati. U normal yuklama tokini ham, qisqa tutashuv tokini ham uzadi va ulaydi. Himoya relelari avariyada aynan o'chirgichni o'chiradi. O'chirgich uzilganda ko'rinadigan uzilish hosil bo'lmaydi — shuning uchun ta'mir uchun qo'shimcha ajratkich ochiladi.",
  },
  disconnector: {
    term: "Ajratkich (QS)",
    short: "Ko'rinadigan uzilish hosil qiladi; yuklama ostida ochilmaydi va yopilmaydi.",
    text: "Ajratkichda yoy so'ndiruvchi qurilma yo'q. U o'chirgich o'chirilgandan keyin ochilib, ta'mir qilinadigan uchastka bilan kuchlanish ostidagi qism orasida ko'rinadigan havo oralig'ini hosil qiladi. Yuklama ostida ajratkichni ochish yoki yopish — elektr yoyi va avariya. KRU-10 kV da ajratkich vazifasini o'chirgich aravachasini ajratish (ta'mir holatiga chiqarish) bajaradi.",
  },
  earthSwitch: {
    term: "Yerlagich (QSG)",
    short: "Uzilgan uchastkani yerga ulaydi — ishchilar xavfsizligi uchun.",
    text: "Yerlagich (yerlovchi pichoq) uchastkani yerga ulaydi: agar unga xato bilan kuchlanish berilsa yoki induksiya paydo bo'lsa, tok yerga o'tib, himoya ishlaydi va odamlar himoyalangan bo'ladi. Ulashdan oldin shu joyning o'zida kuchlanish yo'qligi ko'rsatkich bilan tekshiriladi. Yerlagich ulangan holda ajratkich yoki o'chirgichni ulash taqiqlanadi (blokirovka).",
  },
  transformer: {
    term: "Kuch transformatori",
    short: "Kuchlanishni o'zgartiradi (110 → 35 va 10 kV).",
    text: "Uch o'ramli transformator yuqori (110 kV), o'rta (35 kV) va past (10 kV) kuchlanish o'ramlariga ega. Sovutish turi D: moy radiatorlarda tabiiy aylanadi, ventilyatorlar radiatorlarni puflaydi (moyni bilvosita sovutadi). RPN yuklama ostida o'ramlar nisbatini o'zgartirib kuchlanishni rostlaydi, lekin quvvatni oshirmaydi. Himoyalari: differensial, maksimal tok, gaz relesi, moy harorati va sathi.",
  },
  CT: {
    term: "Tok transformatori (TT)",
    short: "Katta tokni o'lchov va himoya uchun kichik tokka aylantiradi.",
    text: "TT birlamchi zanjirga ketma-ket ulanadi va himoya relelari hamda hisoblagichlarga standart ikkilamchi tok beradi. Ikkilamchi zanjirini ochiq qoldirish xavfli — unda yuqori kuchlanish paydo bo'ladi.",
  },
  VT: {
    term: "Kuchlanish transformatori (TN)",
    short: "Yuqori kuchlanishni o'lchov va himoya uchun past kuchlanishga aylantiradi.",
    text: "TN shinaga ulanadi va voltmetrlar, hisoblagichlar, himoyalar uchun past kuchlanish beradi. 6–35 kV tarmoqlarda TN orqali yerga tutashuv signali (nol ketma-ketlik kuchlanishi) aniqlanadi.",
  },
  SA: {
    term: "OPN (o'ta kuchlanishni cheklagich)",
    short: "Chaqmoq va kommutatsiya o'ta kuchlanishlarini cheklaydi.",
    text: "OPN (metall-oksidli razryadnik) normal kuchlanishda deyarli tok o'tkazmaydi, o'ta kuchlanishda esa qarshiligi keskin kamayib, impulsni yerga o'tkazadi va izolyatsiyani himoya qiladi. Eski podstansiyalarda ventil razryadniklar (RV) ishlatilgan.",
  },
  bus: {
    term: "Shina (shinalar tizimi)",
    short: "Yacheykalarni bir-biriga ulovchi umumiy o'tkazgich.",
    text: "Shinalar seksiyalarga bo'linadi; seksiyalar seksiya o'chirgichi (SV) orqali bog'lanadi. Normal holatda SV ochiq, ABR tayyor: bir manba yo'qolsa ABR SV ni avtomatik ulaydi.",
  },
  line: {
    term: "Elektr uzatish liniyasi",
    short: "Podstansiyani tarmoq yoki iste'molchilar bilan bog'laydi.",
    text: "110 kV kirish liniyalari energiyani tizimdan olib keladi, 35 va 10 kV fiderlar iste'molchilarga tarqatadi. Liniyada ish olib borishdan oldin u ikki tomondan uzilib yerlanadi.",
  },
  load: {
    term: "Iste'molchilar toifalari",
    short: "1-toifa (kasalxona, suv ta'minoti…) eng ishonchli ta'minlanadi va oxirgi uziladi.",
    text: "1-toifa: uzilishi odamlar hayotiga xavf yoki katta zarar keltiradi — ikki mustaqil manbadan ta'minlanadi, ABR bilan. 2-toifa: uzilishi ommaviy mahsulot yetishmasligi, ishlab chiqarish to'xtashiga olib keladi. 3-toifa: qolganlar. Yuklamani kamaytirish kerak bo'lsa — avval 3-toifa, 1-toifa eng oxirida uziladi.",
  },
  point: { term: "Ulanish nuqtasi", short: "Yacheyka ichidagi uskunalar orasidagi bog'lanish.", text: "Sxemadagi ikki apparat orasidagi o'tkazgich qismi." },
  permit: {
    term: "Naryad-ruxsatnoma",
    short: "Xavfsiz ish uchun yozma topshiriq: kim, qayerda, qanday choralar bilan.",
    text: "Naryadda ish mazmuni, joyi, boshlanish va tugash vaqti, brigada tarkibi, xavfsizlik choralari va kuchlanish ostida qoladigan qismlar yoziladi. Ish joyi tayyorlangach, ruxsat beruvchi uni brigada bilan tekshiradi va dopusk beradi.",
  },
  rpn: {
    term: "RPN",
    short: "Yuklama ostida kuchlanishni rostlash qurilmasi.",
    text: "RPN transformator o'ramining pog'onalarini yuklamani uzmasdan almashtiradi. Pog'onalar bir-bir, pauza bilan o'zgartiriladi; yuqori tokda blokirovkalanadi. RPN quvvatni oshirmaydi.",
  },
  abr: {
    term: "ABR (avtomatik zaxirani ulash)",
    short: "Asosiy manba yo'qolganda zaxirani avtomatik ulaydi.",
    text: "Seksiyadagi kirish o'chirgichi o'chganda va kuchlanish yo'qolganda ABR seksiya o'chirgichini ulaydi — iste'molchilar qisqa uzilishdan keyin zaxira transformatordan ta'minlanadi.",
  },
  apv: {
    term: "APV (avtomatik qayta ulash)",
    short: "Himoya o'chirgan liniyani avtomatik qayta ulaydi.",
    text: "Havo liniyalaridagi ko'p nosozliklar o'tkinchi (shox, qush, chaqmoq). APV liniyani qisqa pauzadan keyin qayta ulaydi. APV muvaffaqiyatsiz bo'lsa — liniya ko'rigisiz «ko'r-ko'rona» qayta ulash taqiqlanadi.",
  },
};

/** Uskuna turi bo'yicha glossariy kaliti. */
export function glossaryKeyFor(kind: string): string {
  return kind in GLOSSARY ? kind : "point";
}
