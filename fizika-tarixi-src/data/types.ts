import type { L } from "@/lib/i18n/types";

export type BranchId = "mexanika" | "optika" | "elektr" | "astronomiya" | "kvant" | "nisbiylik";

export interface Branch {
  id: BranchId;
  num: string;
  title: L;
  desc: L;
}

export interface Scientist {
  slug: string;
  initials: string;
  name: L;
  years: L;
  born: L;
  field: L;
  branches: BranchId[];
  summary: L;
  bio: L<string[]>;
  achievements: L<string[]>;
  /** Shu olim bilan bog'liq tajribalar (data/experiments.ts slug'lari) */
  experiments: string[];
}

export interface TimelineEvent {
  id: string;
  sort: number;
  year: L;
  title: L;
  text: L;
  branch: BranchId;
  scientist?: string;
  experiment?: string;
}

export interface ExperimentMeta {
  slug: string;
  branch: BranchId;
  scientist: string;
  title: L;
  lead: L;
  /** Formula(lar) — oddiy matn, mono shriftda ko‘rsatiladi */
  formula: L<string[]>;
  law: L;
  history: L;
  observe: L<string[]>;
}
