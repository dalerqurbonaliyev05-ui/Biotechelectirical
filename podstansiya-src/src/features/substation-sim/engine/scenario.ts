// Stsenariy sxemasi. Stsenariylar data/scenarios/ da shu turdagi ma'lumot sifatida yoziladi —
// yangi stsenariy qo'shish uchun engine kodini o'zgartirish shart emas.

import type { PosterKind, SwitchPos } from "./types";

export type ActionMatcher =
  | { type: "switch"; deviceId: string; to: SwitchPos }
  | { type: "verifyDead"; nodeIds: string[] }
  | { type: "checkPosition"; deviceId: string }
  | { type: "poster"; targetId: string; poster: PosterKind }
  | { type: "readback"; messageId: string }
  | { type: "report"; messageId: string }
  | { type: "permitIssue" }
  | { type: "admit" }
  | { type: "finishWork" }
  | { type: "journal" }
  | { type: "inspect"; targetId: string }
  | { type: "tap"; transformerId: string; dir?: 1 | -1 };

export interface StepDef {
  id: string;
  /** Topshiriq kartasida ko'rinadigan matn */
  label: string;
  /** Bitta yoki bir nechta muqobil amal (anyOf) */
  match: ActionMatcher | ActionMatcher[];
  /** Oldin bajarilishi shart bo'lgan qadamlar (ixtiyoriy qadamlar tartibga ta'sir qilmaydi) */
  after?: string[];
  /** Tavsiya etilgan, lekin majburiy bo'lmagan qadam */
  optional?: boolean;
  /** Nega shunday — natija ekranida va o'qitish rejimida */
  explain: string;
  /** Maslahat (o'qitish rejimida) */
  hint?: string;
}

export interface ReadbackOption {
  id: string;
  text: string;
  correct: boolean;
  /** Noto'g'ri variant nega noto'g'ri */
  why?: string;
}

export interface DispatcherMessage {
  id: string;
  /** Qachon keladi: boshida yoki biror qadam bajarilgach */
  trigger: "start" | { afterStep: string };
  from: string;
  text: string;
  readback?: { prompt: string; options: ReadbackOption[] };
  /** Bu buyruq qabul qilingach kommutatsiyaga ruxsat bor */
  isOrder?: boolean;
  /** Bajarilganidan keyin hisobot kutiladi */
  expectsReport?: { afterStep: string; text: string };
}

export type Goal =
  | { type: "device"; deviceId: string; pos: SwitchPos }
  | { type: "voltageInRange"; transformerId: string; winding: "lv"; min: number; max: number }
  | { type: "loadsSupplied"; loadIds: string[] }
  | { type: "inspected"; ids: string[] };

export type Weather = "clear" | "rain" | "snow" | "ice" | "wind" | "storm" | "heat" | "fog";

export interface ScenarioDef {
  id: string;
  level: 1 | 2 | 3 | 4;
  title: string;
  objective: string;
  briefing: string;
  kind: "tour" | "switching" | "journal" | "rpn";
  situation: {
    timeStart: string;
    weather: Weather;
    season: "winter" | "summer" | "spring" | "autumn";
    ambientC: number;
    loadFactor: number;
    sourceKv?: number;
  };
  initial?: {
    devices?: Record<string, SwitchPos>;
    posters?: Record<string, PosterKind[]>;
    taps?: Record<string, number>;
    permitIssued?: boolean;
    admitted?: boolean;
  };
  /** Kommutatsiya faqat dispetcher buyrug'i bilan */
  orderRequired: boolean;
  /** Dispetcher buyrug'i bilan ruxsat etilgan uzilishlar (jarima yo'q) */
  allowedOutages?: string[];
  messages: DispatcherMessage[];
  steps: StepDef[];
  goals?: Goal[];
  journal?: { required: boolean };
  /** Naryad-ruxsatnoma kerak bo'lgan ish (S02) */
  permit?: {
    workName: string;
    /** Ish joyi — tayyorlanganini tekshirish uchun */
    workZone: { earthSwitches: string[]; posters: Array<{ targetId: string; poster: PosterKind }> };
    /** To'g'ri belgilanishi kerak bo'lgan kuchlanish ostida qoladigan qismlar */
    liveParts: string[];
  };
  /** Ekskursiya uchun ko'rib chiqiladigan uskunalar */
  tour?: { targets: string[] };
  /** RPN stsenariysi */
  rpn?: { transformerId: string; targetMin: number; targetMax: number };
  /** Yakuniy tahlil matni */
  analysis: string;
}
