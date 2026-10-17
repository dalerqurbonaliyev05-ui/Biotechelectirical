// Stsenariy sxemasi. Stsenariylar data/scenarios/ da shu turdagi ma'lumot sifatida yoziladi —
// yangi stsenariy qo'shish uchun engine kodini o'zgartirish shart emas.

import type { PermitForm, PosterKind, SwitchPos } from "./types";

export type ActionMatcher =
  | { type: "switch"; deviceId: string; to: SwitchPos }
  | { type: "verifyDead"; nodeIds: string[] }
  | { type: "checkPosition"; deviceId: string }
  | { type: "poster"; targetId: string; poster: PosterKind; on?: boolean }
  | { type: "readback"; messageId: string }
  | { type: "report"; messageId: string }
  | { type: "permitIssue" }
  | { type: "admit" }
  | { type: "finishWork" }
  | { type: "blankSubmit" }
  | { type: "protocol" }
  | { type: "journal" }
  | { type: "inspect"; targetId: string }
  | { type: "tap"; transformerId: string; dir?: 1 | -1 }
  | { type: "choice"; decisionId: string }
  | { type: "measure"; measurementId: string }
  | { type: "task"; taskId: string }
  | { type: "call"; to: "fire" | "ambulance" | "dispatcher" | "master" }
  | { type: "phasing" }
  | { type: "wait"; minSec: number }
  | { type: "fans"; transformerId: string; on: boolean };

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
  /** Stsenariy boshidan shu soniyagacha bajarilmasa — jarima (yoki kritik oqibat) */
  deadlineSec?: number;
  /** Muddat o'tsa kritik oqibat kodi (masalan "fireSpread") */
  deadlineCritical?: string;
  /** Shu xabar kelmaguncha topshiriq kartasida ko'rsatilmaydi (smena rejimi) */
  hiddenUntilMessage?: string;
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
  trigger: "start" | { afterStep: string } | { afterEvent: string };
  /** Xabar kelganda soat shu vaqtga suriladi ("HH:MM", kun davomidagi stsenariylar uchun) */
  at?: string;
  from: string;
  text: string;
  readback?: { prompt: string; options: ReadbackOption[] };
  /** Bu buyruq qabul qilingach kommutatsiyaga ruxsat bor */
  isOrder?: boolean;
  /** Bajarilganidan keyin hisobot kutiladi */
  expectsReport?: { afterStep: string; text: string; requireGoals?: boolean };
}

export type Goal =
  | { type: "device"; deviceId: string; pos: SwitchPos }
  | { type: "transformerLoadMax"; transformerId: string; k: number }
  | { type: "oilBelow"; transformerId: string; c: number }
  | { type: "noActiveAlarm"; code: string }
  | { type: "tapsEqual"; a: string; b: string }
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
    /** Oldindan rasmiylashtirilgan naryad (masalan, ish davom etayotgan stsenariy) */
    permit?: PermitForm;
    admitted?: boolean;
  };
  /** Kommutatsiya faqat dispetcher buyrug'i bilan */
  orderRequired: boolean;
  /** Topologiya varianti (standart — "Yangiobod" 110/35/10 kV) */
  topology?: "yangiobod" | "ps35";
  /** Har bir real soniyada simulyatsiya soati necha soniya yuradi (standart 1) */
  timeScale?: number;
  /** Vaqt chizig'i hodisalari */
  timeline?: TimelineEvent[];
  /** Qaror kartalari */
  decisions?: DecisionDef[];
  /** O'lchovlar va namunalar */
  measurements?: MeasurementDef[];
  /** Protsedura ishlari (montaj, sinov va h.k.) */
  tasks?: TaskDef[];
  /** Avtomatika: ABR (standart yoqilgan) */
  automation?: { abr?: boolean };
  /** Yuklamani toifa bo'yicha uzish qoidasi nazorat qilinadi */
  loadShedding?: boolean;
  /** Ortiqcha deb hisoblanmaydigan kommutatsiyalar (masalan yerga tutashuvni qidirish) */
  freeSwitching?: string[];
  /** Parallel ulashdan oldin fazirovka shart bo'lgan transformatorlar */
  phasingRequired?: string[];
  /** Dispetcher buyrug'i bilan ruxsat etilgan uzilishlar (jarima yo'q) */
  allowedOutages?: string[];
  messages: DispatcherMessage[];
  steps: StepDef[];
  goals?: Goal[];
  journal?: { required: boolean };
  /** Naryad-ruxsatnoma kerak bo'lgan ish */
  permit?: PermitSpec;
  /** Kommutatsiya blankasi */
  blank?: BlankSpec;
  /** Sinov protokoli (izolyatsiya o'lchovi) */
  protocol?: ProtocolSpec;
  /** Ekskursiya uchun ko'rib chiqiladigan uskunalar */
  tour?: { targets: string[] };
  /** RPN stsenariysi */
  rpn?: { transformerId: string; targetMin: number; targetMax: number };
  /** Yakuniy tahlil matni */
  analysis: string;
}

export interface PermitSpec {
  workName: string;
  place: string;
  /** To'g'ri naryadda bo'lishi shart bo'lgan ro'yxatlar (ish joyini tayyorlash) */
  required: {
    switchedOff: string[];
    earthing: string[];
    posters: Array<{ targetId: string; poster: PosterKind }>;
    liveParts: string[];
  };
  /** Formadagi tanlov variantlari (to'g'rilari + chalg'ituvchilar) */
  candidates: { switchedOff: string[]; earthing: string[]; posters: string[]; liveParts: string[] };
}

export interface BlankSpec {
  /** Blankasiz kommutatsiya qoidabuzarlikmi */
  required: boolean;
  /** Blankaga kiradigan qadamlar (stsenariy qadamlari id'lari) */
  stepIds: string[];
  /** Chalg'ituvchi (noto'g'ri) amallar kartalari */
  distractors: Array<{ id: string; label: string }>;
}

export interface ProtocolSpec {
  kind: "insulation";
  tempC: number;
  /** O'lchov asbobi ko'rsatkichlari, MOm; factoryR60 — zavod qiymati (shu haroratga keltirilgan) */
  readings: Array<{ winding: string; label: string; r15: number; r60: number; factoryR60: number }>;
}

export type SimEvent =
  | { kind: "setLoad"; factor: number }
  | { kind: "alarm"; code: string; params?: Record<string, string> }
  | { kind: "clearAlarm"; code: string }
  | { kind: "earthFault"; nodeId: string; phase: "A" | "B" | "C"; severity: number; hazard?: boolean }
  /** Liniyada QT: o'chirgich o'chadi, APV; barqaror bo'lsa — qarama-qarshi uch ham o'chadi */
  | { kind: "lineFault"; breakerId: string; nodeId: string; sourceId: string; apv: "success" | "fail" }
  /** Himoya o'chirgichlarni o'chiradi (keyin ABR) */
  | { kind: "trip"; deviceIds: string[]; code: string }
  | { kind: "transformerFault"; transformerId: string; fault: "fire" | "gas" | "internal"; trip: boolean; onlyIfEnergized?: boolean }
  | { kind: "sourceKv"; kv: number }
  | { kind: "rpnStuck"; transformerId: string }
  | { kind: "fansFail"; transformerId: string }
  | { kind: "abrFail" }
  | { kind: "sourceLoss"; sourceId: string }
  | { kind: "weather"; weather: Weather; ambientC?: number }
  | { kind: "message"; messageId: string };

export interface TimelineEvent {
  id: string;
  /** "start" — darhol; afterSec — boshlanishdan keyin; afterStep — qadamdan keyin; at — soat */
  trigger: "start" | { afterSec: number } | { afterStep: string } | { at: string };
  event: SimEvent;
}

export interface DecisionOption {
  id: string;
  text: string;
  /** Doim to'g'ri/noto'g'ri */
  correct?: boolean;
  /** O'lchov natijasiga bog'liq to'g'rilik */
  correctWhen?: { measurementId: string; categories: string[] };
  why?: string;
  /** Noto'g'ri tanlov jiddiyligi (standart — qoidabuzarlik) */
  severity?: "violation" | "critical";
  /** Kritik oqibat kodi */
  failCode?: string;
}

export interface DecisionDef {
  id: string;
  prompt: string;
  options: DecisionOption[];
  /** Qaysi qadamdan keyin ko'rinadi (bo'lmasa — darhol) */
  after?: string;
}

export interface MeasurementDef {
  id: string;
  label: string;
  /** Qaysi uskunada bajariladi (uskuna kartasida tugma) */
  targetId: string;
  kind: "oilSample" | "gasSample" | "voltmeter" | "inspection" | "megger" | "windingResistance" | "ratio" | "vectorGroup" | "noLoad" | "counter" | "thermo" | "docs";
  /** Natija variantlari; urug' bo'yicha tanlanadi (fixed — doim shu variant) */
  variants: Array<{ category: string; values: Record<string, string>; weight?: number }>;
  fixed?: number;
  durationSec?: number;
}

export interface TaskDef {
  id: string;
  label: string;
  durationSec: number;
  /** Bajarilgach ko'rsatiladigan izoh */
  result?: string;
}
