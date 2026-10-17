// Mini-o'yinlar ma'lumotlari: gaz turlari, transformator ko'rigi nuqtalari, mashq uchun variantlar.
// Raqamli me'yorlar bu yerda emas — norms.ts da (oilBreakdownMinKv, meggerVoltageV va h.k.).

import { S03 } from "./scenarios/S03";
import { S08 } from "./scenarios/S08";

export type GasTypeId = "air" | "paper" | "carton" | "arc";

export interface GasType {
  id: GasTypeId;
  /** Ko'rish oynasidagi rang (matn) */
  color: string;
  /** Rasmda ko'rsatish uchun rang */
  hex: string;
  flammable: boolean;
  meaning: string;
  action: string;
  /** "Rangi" qiymatidagi kalit so'zlar (stsenariy natijasini turga moslash) */
  keywords: string[];
}

export const GAS_TYPES: GasType[] = [
  {
    id: "air",
    color: "rangsiz",
    hex: "#dbeafe",
    flammable: false,
    meaning: "Havo — moy quyish, ta'mir yoki nasos ishlaganidan keyin bakda qolgan havo.",
    action: "Havoni chiqarib yuborish, transformatorni ishlatishni kuzatuv bilan davom ettirish.",
    keywords: ["rangsiz"],
  },
  {
    id: "paper",
    color: "sariq",
    hex: "#facc15",
    flammable: true,
    meaning: "Qog'oz yoki yog'och izolyatsiyasining qizib yemirilishi.",
    action: "Yuklamani o'tkazib, transformatorni o'chirish; moy va gazni xromatografik tahlilga yuborish.",
    keywords: ["sariq"],
  },
  {
    id: "carton",
    color: "kulrang-oq",
    hex: "#d4d4d8",
    flammable: true,
    meaning: "Elektrokarton izolyatsiyasining shikastlanishi.",
    action: "Yuklamani o'tkazib, transformatorni o'chirish; tahlil va ichki ko'rik.",
    keywords: ["kulrang", "oq"],
  },
  {
    id: "arc",
    color: "qora",
    hex: "#262626",
    flammable: true,
    meaning: "Moyning elektr yoyi ta'sirida parchalanishi (ichki qisqa tutashuv, kontakt kuyishi).",
    action: "Transformatorni darhol o'chirish (himoya ishlamagan bo'lsa), tahlil va ta'mir.",
    keywords: ["qora"],
  },
];

export type InspectionSpotId = "bushings" | "gauge" | "breather" | "gasRelay" | "radiators" | "fans" | "pit" | "ground";

export interface InspectionSpot {
  id: InspectionSpotId;
  label: string;
  ok: string;
  defect: string;
}

/** Transformator ko'rigi (obxod) nuqtalari: me'yoriy holat va nosozlik belgisi. */
export const INSPECTION_SPOTS: InspectionSpot[] = [
  { id: "bushings", label: "Kiritmalar (vvodlar)", ok: "Chinni toza, yoriq yo'q, kiritma moy ko'rsatkichi me'yorda.", defect: "Chinnida yoriq va qoraygan kuyish izi." },
  { id: "gauge", label: "Kengaytirgich moy ko'rsatkichi", ok: "Moy sathi harorat belgisiga mos.", defect: "Moy sathi minimal belgidan past." },
  { id: "breather", label: "Havo quritgich (silikagel)", ok: "Indikator silikagel ko'k — quruq.", defect: "Indikator silikagel pushti — namlikka to'yingan, almashtirish kerak." },
  { id: "gasRelay", label: "Gaz relesi", ok: "Ko'rish oynasi to'liq moy bilan, gaz yo'q.", defect: "Ko'rish oynasining yuqorisida gaz to'plangan." },
  { id: "radiators", label: "Radiatorlar", ok: "Quruq, toza, zulfinlar ochiq.", defect: "Radiator pastki flanetsidan moy tomchilamoqda." },
  { id: "fans", label: "Ventilyatorlar", ok: "Barcha ventilyatorlar bir xil aylanmoqda, begona shovqin yo'q.", defect: "Bitta ventilyator aylanmayapti." },
  { id: "pit", label: "Moy qabul qilgich (chuqur)", ok: "Shag'al toza va quruq.", defect: "Shag'alda moy dog'i." },
  { id: "ground", label: "Bak yerlanishi", ok: "Yerlash o'tkazgichi butun, bolt mahkam.", defect: "Yerlash o'tkazgichi bakdan uzilgan." },
];

/** Stsenariy o'lchov natijasi turi → ko'rikda topilishi kerak bo'lgan nosozliklar. */
export const INSPECTION_CASES: Record<string, InspectionSpotId[]> = {
  leak: ["gauge", "radiators", "pit"],
};

/** Mashq rejimida moy sinovi variantlari — S08 dagi o'quv ma'lumoti. */
export const OIL_PRACTICE = S08.measurements![0].variants;

/** Mashq rejimida megger: S03 dagi asbob ko'rsatkichlari. */
export const MEGGER_PRACTICE = S03.protocol!;
