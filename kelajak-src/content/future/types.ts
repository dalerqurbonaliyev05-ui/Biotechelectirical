// Kelajak loyihasi sahifasining kontent sxemasi. Yangi loyiha qo'shish uchun shu turdagi ma'lumot fayli
// yozib, content/future/index.ts ga qo'shish kifoya. Vizual/simulyator komponentlari ixtiyoriy:
// components/projects/registry.ts da `slug/stepId` bo'yicha topilmasa, qadam ularsiz ko'rsatiladi.

export interface FormulaVar {
  sym: string;
  desc: string;
  unit?: string;
}

export interface Formula {
  /** Unicode bilan yozilgan formula, masalan "I₂ = I₁ · I₂nom / I₁nom" */
  expr: string;
  /** Formula nima ekanini qisqa izohlaydi */
  note?: string;
  vars: FormulaVar[];
}

export interface Part {
  name: string;
  spec: string;
}

export interface Mistake {
  problem: string;
  fix: string;
}

export interface QuizQuestion {
  id: string;
  q: string;
  options: string[];
  correct: number;
  explain: string;
}

export interface Step {
  id: string;
  title: string;
  /** "Nima qilamiz?" — 2-4 jumla */
  what: string;
  /** Animatsiya ostidagi izoh */
  visualCaption?: string;
  /** Simulyatorda nima qilish kerakligi haqida topshiriq */
  simTask?: string;
  formulas: Formula[];
  parts: Part[];
  mistakes: Mistake[];
  quiz: QuizQuestion[];
  /** Qadam ichidagi ogohlantirish (qizil blok) */
  danger?: string;
}

export interface DemoModel {
  title: string;
  intro: string;
  parts: Part[];
  steps: string[];
  safety: string;
}

export interface Project {
  slug: string;
  title: string;
  short: string;
  /** "Bu sahifada siz ... ni 7 qadamda quramiz" */
  promise: string;
  /** CSS aksent rangi (hex) va uning to'q varianti (matn uchun) */
  accent: string;
  accentInk: string;
  level: "Boshlang‘ich" | "O‘rta" | "Murakkab";
  minutes: number;
  /** Sahifa boshidagi asosiy xavfsizlik ogohlantirishi */
  danger: { title: string; points: string[] };
  /** "O'quv model" belgisi — raqamlar taxminiy ekanini aytadi */
  modelNote?: string;
  steps: Step[];
  demo: DemoModel;
  finalQuiz: QuizQuestion[];
  badge: { name: string; emoji: string; text: string };
}

/** Bosh ro'yxat uchun qisqa ma'lumot (tayyor bo'lmagan loyiha ham ko'rsatiladi). */
export interface ProjectCard {
  slug: string;
  title: string;
  short: string;
  accent: string;
  ready: boolean;
}
