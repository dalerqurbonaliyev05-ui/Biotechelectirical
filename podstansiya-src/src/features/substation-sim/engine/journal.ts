// Operativ (dispetcherlik) jurnali yozuvini tekshirish: vaqt mosligi, uskuna nomlari to'g'ri
// yozilganmi, barcha muhim amallar yozilganmi, tartib to'g'rimi, bajaruvchi ko'rsatilganmi.

import { NORMS } from "../data/norms";
import type { JournalEntry } from "./types";

export interface JournalOp {
  label: string;
  /** Amal vaqti, sekund */
  t: number;
}

export interface JournalIssue {
  code: "journalTime" | "journalNames" | "journalMissingOps" | "journalOrder" | "journalExecutor" | "journalEmpty";
  params?: Record<string, string>;
}

// Kirill harflari lotinga o'xshash bo'lsa (masalan "Т-1" kirillcha) — lotinga o'giriladi
const CYR_TO_LAT: Record<string, string> = { А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X", У: "Y" };

export function normalizeText(s: string): string {
  return s
    .toUpperCase()
    .replace(/[АВЕКМНОРСТХУ]/g, (c) => CYR_TO_LAT[c] ?? c)
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s*-\s*/g, "-");
}

/** Matndan uskuna nomlarini (Q-…, QS-…, QSG-…) ajratib oladi — yozilish tartibida. */
export function extractDeviceNames(text: string): string[] {
  const norm = normalizeText(text);
  return norm.match(/\b(?:QSG|QS|Q)-[A-Z0-9]+(?:-[A-Z0-9]+)*/g) ?? [];
}

export function parseTime(hhmm: string): number | null {
  const m = /^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 3600 + min * 60;
}

export function formatClock(sec: number): string {
  const s = ((Math.floor(sec) % 86400) + 86400) % 86400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function checkJournalEntry(entry: JournalEntry, ops: JournalOp[], knownLabels: readonly string[], nowSec: number): JournalIssue[] {
  const issues: JournalIssue[] = [];
  if (!entry.doneText.trim() && !entry.orderText.trim()) return [{ code: "journalEmpty" }];

  const t = parseTime(entry.time);
  const refTime = ops.length ? ops[ops.length - 1].t : nowSec;
  const tol = NORMS.journalTimeToleranceMin.value * 60;
  // Sutka almashishini hisobga olgan farq (masalan 23:55 va 00:05)
  const diff = t === null ? Infinity : Math.abs(((((t - refTime) % 86400) + 129600) % 86400) - 43200);
  if (diff > tol) {
    issues.push({ code: "journalTime", params: { expected: formatClock(refTime), got: entry.time || "—" } });
  }

  const names = extractDeviceNames(`${entry.orderText} ${entry.doneText}`);
  const known = new Set(knownLabels.map(normalizeText));
  const unknown = [...new Set(names.filter((n) => !known.has(n)))];
  if (unknown.length) issues.push({ code: "journalNames", params: { names: unknown.join(", ") } });

  const doneNames = extractDeviceNames(entry.doneText);
  const missing = [...new Set(ops.map((o) => o.label))].filter((l) => !doneNames.includes(normalizeText(l)));
  if (missing.length) issues.push({ code: "journalMissingOps", params: { names: missing.join(", ") } });

  // Tartib: yozilgan amallar bajarilish tartibida bo'lishi kerak
  const opOrder = ops.map((o) => normalizeText(o.label));
  const positions = doneNames.map((n) => opOrder.indexOf(n)).filter((i) => i >= 0);
  if (positions.some((p, i) => i > 0 && p < positions[i - 1])) issues.push({ code: "journalOrder" });

  if (!entry.executor.trim()) issues.push({ code: "journalExecutor" });
  return issues;
}
