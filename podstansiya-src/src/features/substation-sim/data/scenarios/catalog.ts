// Stsenariylar katalogi (ro'yxat va daraja ochilishi uchun). To'liq stsenariy ma'lumotlari
// shu papkadagi alohida fayllarda; `playable: true` — hali yozilmagan (keyingi bosqichlar).

export interface ScenarioMeta {
  id: string;
  level: 1 | 2 | 3 | 4;
  title: string;
  objective: string;
  playable: boolean;
}

export const SCENARIO_CATALOG: ScenarioMeta[] = [
  { id: "S01", level: 1, title: "Podstansiya bilan tanishish", objective: "Har bir uskunaning vazifasi va sxemadagi belgisini o'rganish", playable: true },
  { id: "S02", level: 1, title: "Transformatorni rejali ta'mirga chiqarish", objective: "To'g'ri kommutatsiya, yerlash, plakat, naryad-ruxsatnoma, jurnal", playable: true },
  { id: "S03", level: 1, title: "Ta'mirdan so'ng transformatorni ishga tushirish", objective: "Teskari tartib: yerlagich va plakatlarni olish, ajratkich va o'chirgichlarni ulash", playable: true },
  { id: "S04", level: 1, title: "Dispetcherlik jurnalini yuritish", objective: "Kun davomida bir nechta buyruqni bajarish va jurnalga to'g'ri yozish", playable: true },
  { id: "S05", level: 1, title: "Kuchlanish past — RPN", objective: "RPN pog'onasini to'g'ri tanlab, kuchlanishni me'yorga keltirish", playable: true },
  { id: "S06", level: 2, title: "Yuklama oshib ketdi", objective: "Harorat grafigi, ventilyatorlar, qisqa muddatli ortiqcha yuklash chegarasi", playable: true },
  { id: "S07", level: 2, title: "Quvvat yetishmayapti", objective: "Zaxira transformatorni parallel ulash, fazirovka; RPN yordam bermasligi", playable: true },
  { id: "S08", level: 2, title: "Moyni filtrlash yoki almashtirish", objective: "Moy sinovi natijalari bo'yicha qaror", playable: true },
  { id: "S09", level: 2, title: "Transformator markasini tanlash", objective: "Berilgan yuklama bo'yicha to'g'ri marka", playable: true },
  { id: "S10", level: 3, title: "Gaz relesi signalga ishladi", objective: "Gaz namunasini olish va qaror qabul qilish", playable: true },
  { id: "S11", level: 3, title: "Yomg'irda bir fazali yerga tutashuv", objective: "Voltmetrlar bo'yicha aniqlash, fiderlarni navbat bilan uzib qidirish", playable: true },
  { id: "S12", level: 3, title: "Moy sathi tushib ketdi", objective: "Moy oqishi sababini topish va qaror", playable: true },
  { id: "S13", level: 3, title: "O'ramlar izolyatsiyasi buzilgan", objective: "Megger, o'ramlar qarshiligi, moy tahlili bo'yicha qaror", playable: true },
  { id: "S14", level: 3, title: "RPN nosozligi", objective: "Pog'onada to'xtab qolgan RPN bilan ishlash", playable: true },
  { id: "S15", level: 3, title: "Qorli kunda 110 kV liniyada qisqa tutashuv", objective: "Himoya, APV muvaffaqiyatsiz, obxod, muzni eritish", playable: true },
  { id: "S16", level: 4, title: "Transformatorda yong'in", objective: "Favqulodda holatda to'g'ri tartib, ABR, xabar berish", playable: true },
  { id: "S17", level: 4, title: "Kaskad nosozlik", objective: "Ustuvorlik va iste'molchilarni toifa bo'yicha uzish", playable: true },
  { id: "S18", level: 4, title: "Yangi 35 kV transformator o'rnatish", objective: "Qabul, yig'ish, sinovlar, fazirovka, ishga tushirish", playable: true },
  { id: "S19", level: 4, title: "ABR ishlamadi", objective: "Zaxirani qo'lda ulash", playable: true },
  { id: "S20", level: 4, title: "Chaqmoq urishi", objective: "OPN va himoyalar ishlagandan keyin ko'rik va tekshiruv", playable: true },
  { id: "S21", level: 4, title: "Smena rejimi", objective: "8 soatlik smena, tasodifiy hodisalar oqimi", playable: true },
];

/** Daraja ochiqmi: 1-daraja doim ochiq; keyingisi oldingi darajadagi barcha o'ynaladigan stsenariylar bajarilganda. */
export function isLevelUnlocked(level: number, completed: (id: string) => boolean, catalog = SCENARIO_CATALOG): boolean {
  if (level <= 1) return true;
  const prev = catalog.filter((s) => s.level === level - 1 && s.playable);
  if (prev.length === 0) return false;
  return prev.every((s) => completed(s.id)) && isLevelUnlocked(level - 1, completed, catalog);
}
