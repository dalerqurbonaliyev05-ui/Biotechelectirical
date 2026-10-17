// Ball hisobi: 100 dan boshlanadi, jarimalar ayiriladi, 0 dan past tushmaydi.

import { STAR_THRESHOLDS } from "../data/rules";
import type { Penalty, SimState } from "./types";

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
