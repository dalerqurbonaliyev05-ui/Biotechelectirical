// Transformator markasidagi harflarning ma'nosi (GOST 11677 va kataloglardagi belgilash tizimi bo'yicha).
// Ensiklopediya, marka dekoderi va viktorina shu ma'lumotdan foydalanadi. Raqamli me'yor yo'q — faqat izohlar.

export type MarkGroup = "auto" | "phases" | "split" | "cooling" | "protection" | "windings" | "regulation";

export interface MarkLetter {
  /** Kirill yozuvidagi belgi */
  cyr: string;
  /** Lotin yozuvidagi belgi (o'zbek/ingliz kataloglarida) */
  lat: string;
  group: MarkGroup;
  meaning: string;
}

/** Tartib — markadagi o'rni bo'yicha; sovutish belgilarida uzunrog'i oldin (ДЦ, Д dan oldin). */
export const MARK_LETTERS: MarkLetter[] = [
  { cyr: "А", lat: "A", group: "auto", meaning: "avtotransformator (o'ramlar elektr jihatdan bog'langan)" },
  { cyr: "О", lat: "O", group: "phases", meaning: "bir fazali" },
  { cyr: "Т", lat: "T", group: "phases", meaning: "uch fazali" },
  { cyr: "Р", lat: "R", group: "split", meaning: "past kuchlanish o'rami ikki parchali (ikkiga bo'lingan)" },
  { cyr: "ДЦ", lat: "DTs", group: "cooling", meaning: "moyli, majburiy havo puflash va moyning majburiy aylanishi (nasos)" },
  { cyr: "МЦ", lat: "MTs", group: "cooling", meaning: "moyli, tabiiy havo va moyning majburiy aylanishi" },
  { cyr: "Ц", lat: "Ts", group: "cooling", meaning: "moy-suv sovutish, moyning majburiy aylanishi" },
  { cyr: "Д", lat: "D", group: "cooling", meaning: "moyli, radiatorlarni ventilyatorlar puflaydi (moy tabiiy aylanadi)" },
  { cyr: "М", lat: "M", group: "cooling", meaning: "moyli, tabiiy sovutish (moy va havo tabiiy aylanadi)" },
  { cyr: "С", lat: "S", group: "cooling", meaning: "quruq (havo bilan tabiiy sovutish)" },
  { cyr: "З", lat: "Z", group: "protection", meaning: "moy himoyalangan (azot yostig'i bilan, kengaytirgichsiz)" },
  { cyr: "Г", lat: "G", group: "protection", meaning: "germetik bajarilgan (kengaytirgichsiz, bak to'liq moy bilan to'ldirilgan)" },
  { cyr: "Т", lat: "T", group: "windings", meaning: "uch o'ramli" },
  { cyr: "Н", lat: "N", group: "regulation", meaning: "kuchlanish yuklama ostida rostlanadi (RPN)" },
];

/** Iqlim bajarilishi (marka oxiridagi qo'shimcha, masalan -У1, -ХЛ1). */
export const CLIMATE: Record<string, string> = {
  У: "mo'tadil iqlim",
  ХЛ: "sovuq iqlim",
  УХЛ: "mo'tadil va sovuq iqlim",
  Т: "tropik iqlim",
};

/** Joylashtirish toifasi (iqlim belgisidan keyingi raqam). */
export const PLACEMENT: Record<string, string> = {
  "1": "ochiq havoda",
  "2": "soyabon ostida",
  "3": "isitilmaydigan yopiq binoda",
  "4": "isitiladigan yopiq binoda",
};

/** Marka harflarining guruhlar bo'yicha nomi. */
export const MARK_GROUP_LABEL: Record<MarkGroup, string> = {
  auto: "Turi",
  phases: "Fazalar soni",
  split: "O'ram bajarilishi",
  cooling: "Sovutish",
  protection: "Moy himoyasi",
  windings: "O'ramlar soni",
  regulation: "Kuchlanishni rostlash",
};
