// Kommutatsiya ketma-ketligini tekshirish. Qadamlar DAG ko'rinishida: har qadamning `after`
// ro'yxati bor, shuning uchun bir nechta to'g'ri tartib bo'lishi mumkin.

import type { ActionMatcher, StepDef } from "./scenario";
import type { Action } from "./types";

export function matcherMatches(m: ActionMatcher, a: Action): boolean {
  switch (m.type) {
    case "switch":
      return a.type === "switch" && a.deviceId === m.deviceId && a.to === m.to;
    case "verifyDead":
      return a.type === "verifyDead" && m.nodeIds.includes(a.nodeId);
    case "checkPosition":
      return a.type === "checkPosition" && a.deviceId === m.deviceId;
    case "poster":
      return a.type === "poster" && a.on === (m.on ?? true) && a.targetId === m.targetId && a.poster === m.poster;
    case "readback":
      return a.type === "readback" && a.messageId === m.messageId;
    case "report":
      return a.type === "report" && a.messageId === m.messageId;
    case "permitIssue":
      return a.type === "permitIssue";
    case "admit":
      return a.type === "admit";
    case "finishWork":
      return a.type === "finishWork";
    case "blankSubmit":
      return a.type === "blankSubmit";
    case "protocol":
      return a.type === "protocol";
    case "journal":
      return a.type === "journal";
    case "inspect":
      return a.type === "inspect" && a.targetId === m.targetId;
    case "tap":
      return a.type === "tap" && a.transformerId === m.transformerId && (m.dir === undefined || a.dir === m.dir);
    case "choice":
      return a.type === "choice" && a.decisionId === m.decisionId;
    case "measure":
      return a.type === "measure" && a.measurementId === m.measurementId;
    case "task":
      return a.type === "task" && a.taskId === m.taskId;
    case "call":
      return a.type === "call" && a.to === m.to;
    case "phasing":
      return a.type === "phasing";
    case "wait":
      return a.type === "wait" && a.sec >= m.minSec;
    case "fans":
      return a.type === "fans" && a.transformerId === m.transformerId && a.on === m.on;
  }
}

export function stepMatches(step: StepDef, a: Action): boolean {
  const ms = Array.isArray(step.match) ? step.match : [step.match];
  return ms.some((m) => matcherMatches(m, a));
}

export interface StepMatch {
  step: StepDef | null;
  /** Amal allaqachon bajarilgan qadamga mos (takror) */
  repeat: boolean;
  /** Oldin bajarilmagan majburiy qadamlar (tartib xatosi) */
  missingBefore: string[];
}

export function matchStep(steps: StepDef[], done: readonly string[], a: Action): StepMatch {
  const doneSet = new Set(done);
  const optional = new Set(steps.filter((s) => s.optional).map((s) => s.id));
  // Bir nechta mos qadam bo'lsa — shartlari bajarilganini afzal ko'ramiz (masalan bir nechta jurnal qadami)
  const matching = steps.filter((s) => !doneSet.has(s.id) && stepMatches(s, a));
  const ready = matching.find((s) => (s.after ?? []).every((id) => doneSet.has(id) || optional.has(id)));
  const candidate = ready ?? matching[0];
  if (!candidate) {
    const repeat = steps.some((s) => doneSet.has(s.id) && stepMatches(s, a));
    return { step: null, repeat, missingBefore: [] };
  }
  const missingBefore = (candidate.after ?? []).filter((id) => !doneSet.has(id) && !optional.has(id));
  return { step: candidate, repeat: false, missingBefore };
}

/** Bajarilmagan majburiy qadamlar. */
export function missingRequired(steps: StepDef[], done: readonly string[]): StepDef[] {
  const doneSet = new Set(done);
  return steps.filter((s) => !s.optional && !doneSet.has(s.id));
}

/** Keyingi bajarilishi mumkin bo'lgan qadamlar (barcha shartlari bajarilgan). */
export function availableSteps(steps: StepDef[], done: readonly string[]): StepDef[] {
  const doneSet = new Set(done);
  const optional = new Set(steps.filter((s) => s.optional).map((s) => s.id));
  return steps.filter((s) => !doneSet.has(s.id) && (s.after ?? []).every((id) => doneSet.has(id) || optional.has(id)));
}

/** DAG to'g'riligini tekshirish: noma'lum havola yoki sikl bo'lmasligi kerak (stsenariy testlari uchun). */
export function validateSteps(steps: StepDef[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const s of steps) {
    if (ids.has(s.id)) errors.push(`takroriy qadam: ${s.id}`);
    ids.add(s.id);
  }
  for (const s of steps) for (const d of s.after ?? []) if (!ids.has(d)) errors.push(`${s.id}: noma'lum qadam ${d}`);
  // Topologik tartiblash orqali siklni aniqlash
  const done = new Set<string>();
  let progress = true;
  while (progress) {
    progress = false;
    for (const s of steps) {
      if (!done.has(s.id) && (s.after ?? []).every((d) => done.has(d) || !ids.has(d))) {
        done.add(s.id);
        progress = true;
      }
    }
  }
  if (done.size !== steps.length) errors.push("qadamlar orasida sikl bor");
  return errors;
}
