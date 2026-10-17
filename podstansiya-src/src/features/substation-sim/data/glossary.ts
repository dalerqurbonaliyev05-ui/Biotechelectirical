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
  gasRelay: {
    term: "Gaz relesi (Buxgolts relesi)",
    short: "Transformator ichida gaz ajralishi va moy oqimini sezadi.",
    text: "Gaz relesi bak bilan kengaytirgich orasidagi quvurga o'rnatiladi. Ichki nosozlikda izolyatsiya va moy parchalanib gaz hosil bo'ladi: oz gaz to'plansa rele signal beradi, kuchli moy oqimi yoki ko'p gazda transformatorni o'chiradi. Signal bo'yicha ko'rish oynasidagi gaz namunasi olinadi: rangi va yonuvchanligi nosozlik turini ko'rsatadi (havo, qog'oz, karton yoki moy parchalanishi).",
  },
  megger: {
    term: "Megaommetr va absorbsiya koeffitsienti",
    short: "Izolyatsiya qarshiligini o'lchaydi; R60/R15 — namlik ko'rsatkichi.",
    text: "Megaommetr (megger) o'ram va korpus orasidagi izolyatsiya qarshiligini o'lchaydi. O'lchash boshlanganidan 15 va 60 soniyadan keyingi ko'rsatkichlar yozib olinadi. Quruq izolyatsiyada qarshilik vaqt o'tishi bilan sezilarli oshadi, nam izolyatsiyada deyarli o'zgarmaydi — shuning uchun R60/R15 nisbati (absorbsiya koeffitsienti) namlikni baholashga yordam beradi. O'lchashdan keyin o'ram yerga ulab razryadlanadi.",
  },
  oilTest: {
    term: "Transformator moyi sinovi",
    short: "Probiv kuchlanishi, namlik va kislota soni moy holatini ko'rsatadi.",
    text: "Moy namunasi maxsus krandan, birinchi portsiya to'kib tashlangandan keyin toza quruq idishga olinadi. Probiv apparatida elektrodlar orasidagi kuchlanish bir tekis oshiriladi va moy teshilgan kuchlanish qayd etiladi. Namlik va kislota soni laboratoriyada aniqlanadi. Ko'rsatkichlar me'yordan chiqsa moy quritiladi, tozalanadi yoki almashtiriladi.",
  },
  earthFault: {
    term: "Yerga tutashuv (6–35 kV)",
    short: "Izolyatsiyalangan neytralli tarmoqda bir faza yerga ulanishi.",
    text: "6–35 kV tarmoqlarda neytral izolyatsiyalangan yoki kompensatsiyalangan bo'ladi, shuning uchun bir fazaning yerga ulanishi qisqa tutashuv emas: iste'molchilar ishlashda davom etadi, lekin shikastlangan faza kuchlanishi pasayadi, qolgan fazalarniki oshadi. Shikastlangan liniya fiderlarni navbat bilan qisqa vaqtga uzib topiladi va iloji boricha tezroq o'chiriladi.",
  },
  phasing: {
    term: "Fazirovka",
    short: "Parallel ulashdan oldin fazalar mosligini tekshirish.",
    text: "Ikki manba yoki transformatorni parallel ulashdan oldin bir nomli fazalar orasidagi kuchlanish o'lchanadi: mos fazalar orasida kuchlanish deyarli nolga teng bo'lishi kerak. Ulanish guruhlari yoki fazalar tartibi mos kelmasa, parallel ulash qisqa tutashuvga olib keladi.",
  },
  blank: {
    term: "Kommutatsiya blankasi",
    short: "Murakkab kommutatsiyalarning oldindan tuzilgan ketma-ketligi.",
    text: "Blankada barcha amallar (o'chirgich va ajratkichlar, kuchlanish yo'qligini tekshirish, yerlash, plakatlar) bajarilish tartibida yoziladi va tekshiriladi. Kommutatsiya blanka bo'yicha, har bir amal bajarilgach belgilab boriladi; blankadan chetga chiqish taqiqlanadi.",
  },
  journal: {
    term: "Operativ jurnal",
    short: "Navbatchi barcha buyruq va amallarni vaqti bilan yozadigan hujjat.",
    text: "Operativ jurnalga dispetcher buyruqlari, bajarilgan kommutatsiyalar, yerlagichlar, naryad bo'yicha dopusk va ish yakuni, signallar va nosozliklar vaqti bilan yoziladi. Jurnal smenani topshirishda va avariyani tahlil qilishda asosiy manba hisoblanadi.",
  },
  cooling: {
    term: "Transformator sovutish turlari",
    short: "M — tabiiy, D — havo puflash, DC — majburiy moy aylanishi.",
    text: "M turida moy va havo tabiiy aylanadi. D turida radiatorlarni ventilyatorlar puflaydi — ventilyatorlar o'chsa ruxsat etilgan yuklama kamayadi. DC (ДЦ) turida moy nasoslar bilan haydaladi va havo bilan puflanadi. Sovutish turi transformator markasidagi harf bilan belgilanadi.",
  },
};

/** Uskuna turi bo'yicha glossariy kaliti. */
export function glossaryKeyFor(kind: string): string {
  return kind in GLOSSARY ? kind : "point";
}
