// Engine turlari. Engine UI'ga bog'liq emas: sof TypeScript, React/DOM importi yo'q.

export type SwitchPos = "open" | "closed";
export type Severity = "ok" | "info" | "violation" | "critical";
export type GameMode = "training" | "practice" | "exam";
export type ConsumerCategory = 1 | 2 | 3;

// ---------- Topologiya ----------

export interface NodeDef {
  id: string;
  kv: number;
  /** Shina (bus) — sxemada qalin chiziq; point — ulanish nuqtasi. */
  kind: "bus" | "point" | "line";
  label?: string;
}

export interface SwitchDef {
  id: string;
  kind: "breaker" | "disconnector";
  a: string;
  b: string;
  label: string;
  /** Ajratkich qaysi tomonda: transformator/liniya tomoni yoki shina tomoni (tartib qoidalari uchun). */
  side?: "equipment" | "bus";
  /** Uskuna qaysi yacheykaga (bay) tegishli: masalan "T1-10". */
  bay?: string;
}

export interface EarthSwitchDef {
  id: string;
  kind: "earthSwitch";
  node: string;
  label: string;
  bay?: string;
}

export interface TransformerDef {
  id: string;
  label: string;
  /** data/transformers.ts dagi model kaliti. */
  model: string;
  hv: string;
  mv?: string;
  lv: string;
}

export interface SourceDef {
  id: string;
  node: string;
  label: string;
}

export interface LoadDef {
  id: string;
  node: string;
  label: string;
  category: ConsumerCategory;
  /** Faol quvvat, MVt (stsenariyda yuklama koeffitsienti bilan ko'paytiriladi). */
  mw: number;
}

/** Ma'lumot uchun uskunalar (TT, TN, OPN) — kommutatsiya qilinmaydi, lekin ko'rib o'rganiladi. */
export interface InstrumentDef {
  id: string;
  kind: "CT" | "VT" | "SA";
  node: string;
  label: string;
}

export interface Topology {
  nodes: NodeDef[];
  switches: SwitchDef[];
  earthSwitches: EarthSwitchDef[];
  transformers: TransformerDef[];
  sources: SourceDef[];
  loads: LoadDef[];
  instruments: InstrumentDef[];
}

// ---------- Holat ----------

export type PosterKind = "doNotSwitch" | "workHere" | "earthed" | "stopVoltage";

/** Elektr xavfsizligi bo'yicha guruh (II–V). */
export type SafetyGroup = 2 | 3 | 4 | 5;

export interface PermitPerson {
  name: string;
  group: SafetyGroup;
}

/** Naryad-ruxsatnoma (to'liq). Talaba to'ldiradi, engine/permit.ts tekshiradi. */
export interface PermitForm {
  number: string;
  workName: string;
  /** Ish joyi (uskuna id, masalan "T-1") */
  place: string;
  /** "HH:MM" */
  startTime: string;
  endTime: string;
  /** Naryad beruvchi */
  issuer: PermitPerson;
  /** Ruxsat beruvchi (dopusk beradigan operativ xodim) */
  admitter: PermitPerson;
  /** Ishlar rahbari */
  leader: PermitPerson;
  /** Ishlarni bajaruvchi (brigada boshlig'i) */
  producer: PermitPerson;
  /** Brigada a'zolari (bajaruvchidan tashqari) */
  members: PermitPerson[];
  /** O'chiriladigan (ochiq turishi kerak) apparatlar */
  switchedOff: string[];
  /** Ulanadigan yerlagichlar */
  earthing: string[];
  /** "Ulamang" plakati osiladigan apparatlar */
  posters: string[];
  /** Kuchlanish ostida qoladigan qismlar */
  liveParts: string[];
}

/** Izolyatsiya o'lchovi protokoli (sinov dalolatnomasi). */
export interface InsulationProtocolForm {
  kind: "insulation";
  tempC: number;
  rows: Array<{ winding: string; r15: number; r60: number }>;
  conclusion: "fit" | "unfit";
}

export interface JournalEntry {
  /** "HH:MM" */
  time: string;
  from: string;
  orderText: string;
  doneText: string;
  executor: string;
}

export interface LogEntry {
  t: number;
  action: Action;
  severity: Severity;
  code: string;
  applied: boolean;
  stepId?: string;
  /** Matn parametrlari (uskuna nomi va h.k.). */
  params?: Record<string, string>;
}

export interface Penalty {
  t: number;
  code: string;
  points: number;
  params?: Record<string, string>;
}

export interface SimState {
  /** Simulyatsiya vaqti, sekund (00:00 dan). */
  time: number;
  devices: Record<string, SwitchPos>;
  /** Kuchlanish yo'qligi tekshirilgan tugunlar → tekshirilgan vaqt. Tugun kuchlanishga tushsa o'chadi. */
  verifiedDead: Record<string, number>;
  posters: Record<string, PosterKind[]>;
  /** Joyida holati tekshirilgan o'chirgichlar. */
  positionChecked: Record<string, boolean>;
  taps: Record<string, number>;
  rpnBusyUntil: Record<string, number>;
  fans: Record<string, boolean>;
  oilTemp: Record<string, number>;
  /** Izolyatsiya eskirishi (ekvivalent soatlar). */
  agingHours: Record<string, number>;
  sourcesAvailable: Record<string, boolean>;
  permit: PermitForm | null;
  /** Kundalik dopusk va ish yakuni qaydlari */
  permitLog: Array<{ kind: "admit" | "finish"; t: number }>;
  /** Kommutatsiya blankasi: talaba tuzgan tartib (qadam id'lari) */
  blank: { order: string[]; approved: boolean } | null;
  protocols: InsulationProtocolForm[];
  admitted: boolean;
  workFinished: boolean;
  journal: JournalEntry[];
  acceptedOrders: string[];
  reports: string[];
  deliveredMessages: string[];
  /** Xabar kelgan vaqt, sekund */
  messageTimes: Record<string, number>;
  inspected: string[];
  doneSteps: string[];
  log: LogEntry[];
  penalties: Penalty[];
  status: "running" | "completed" | "failed";
  failure: { code: string; params?: Record<string, string> } | null;
  /** Yuklama koeffitsienti (stsenariy/yuklama grafigi). */
  loadFactor: number;
  ambientC: number;
  /** 110 kV manba kuchlanishi, kV (RPN stsenariylari uchun). */
  sourceKv: number;
}

// ---------- Amallar ----------

export type Action =
  | { type: "switch"; deviceId: string; to: SwitchPos }
  | { type: "verifyDead"; nodeId: string }
  | { type: "checkPosition"; deviceId: string }
  | { type: "poster"; targetId: string; poster: PosterKind; on: boolean }
  | { type: "readback"; messageId: string; optionId: string }
  | { type: "report"; messageId: string }
  | { type: "permitIssue"; permit: PermitForm }
  | { type: "admit" }
  | { type: "finishWork" }
  | { type: "blankSubmit"; order: string[] }
  | { type: "protocol"; form: InsulationProtocolForm }
  | { type: "journal"; entry: JournalEntry }
  | { type: "inspect"; targetId: string }
  | { type: "tap"; transformerId: string; dir: 1 | -1 }
  | { type: "fans"; transformerId: string; on: boolean }
  | { type: "tick"; dtSec: number }
  | { type: "finish" };

export interface ActionOutcome {
  state: SimState;
  severity: Severity;
  code: string;
  applied: boolean;
  params?: Record<string, string>;
  stepId?: string;
  /** Tartib xatosi bo'lsa — qaysi qadamlar oldin bajarilishi kerak edi. */
  missingBefore?: string[];
  penalties: Penalty[];
}
