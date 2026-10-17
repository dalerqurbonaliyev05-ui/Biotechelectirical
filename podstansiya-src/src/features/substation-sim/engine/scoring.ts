// Ball hisobi: 100 dan boshlanadi, jarimalar ayiriladi, 0 dan past tushmaydi.

import { NORMS } from "../data/norms";
import { STAR_THRESHOLDS } from "../data/rules";
import type { Penalty, SimState, Topology } from "./types";

export const START_SCORE = 100;

export function computeScore(penalties: readonly Penalty[]): number {
  const total = penalties.reduce((a, p) => a + p.points, 0);
  return Math.max(0, Math.min(START_SCORE, START_SCORE - total));
}

export function starsFor(score: number, failed: boolean): 0 | 1 | 2 | 3 {
  if (failed) return 0;
  if (score >= STAR_THRESHOLDS.three) return 3;
  if (score >= STAR_THRESHOLDS.two) return 2;
  if (score >= STAR_THRESHOLDS.one) return 1;
  return 0;
}

export interface ScoreSummary {
  score: number;
  stars: 0 | 1 | 2 | 3;
  errors: number;
  critical: boolean;
  byCode: Record<string, { count: number; points: number }>;
}

export function summarize(state: SimState): ScoreSummary {
  const failed = state.status === "failed";
  const score = failed ? 0 : computeScore(state.penalties);
  const byCode: ScoreSummary["byCode"] = {};
  for (const p of state.penalties) {
    const c = (byCode[p.code] ??= { count: 0, points: 0 });
    c.count += 1;
    c.points += p.points;
  }
  return {
    score,
    stars: starsFor(score, failed),
    errors: state.penalties.filter((p) => p.points > 0).length,
    critical: failed,
    byCode,
  };
}

export interface OutageRow {
  loadId: string;
  label: string;
  category: 1 | 2 | 3;
  minutes: number;
  /** Zarar, shartli birlik: daqiqa × MVt × toifa narxi (NORMS.outageCostPerMwMin — o'yin modeli) */
  cost: number;
  /** Rejali (stsenariyda ruxsat etilgan) uzilish */
  planned: boolean;
}

/** Iste'molchilar uzilishi va shartli iqtisodiy zarar. */
export function outageSummary(topology: Topology, state: SimState, allowed: readonly string[] = []): { rows: OutageRow[]; totalCost: number } {
  const price = NORMS.outageCostPerMwMin.value as Record<number, number>;
  const rows: OutageRow[] = [];
  for (const l of topology.loads) {
    const minutes = state.outageMin[l.id] ?? 0;
    if (minutes <= 0) continue;
    rows.push({ loadId: l.id, label: l.label, category: l.category, minutes, cost: minutes * l.mw * (price[l.category] ?? 0), planned: allowed.includes(l.id) });
  }
  return { rows, totalCost: rows.filter((r) => !r.planned).reduce((a, r) => a + r.cost, 0) };
}
