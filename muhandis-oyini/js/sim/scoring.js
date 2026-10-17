// Ball hisoblash (sof funksiyalar). Og'irliklar config.json → scoring.
import { clamp, round } from '../util.js';

export function diagnosisScore({ wrong, solved, decisiveTotal, decisiveHit, extras, hintCost = 0, bonusFrac = null }, cfg) {
  const d = cfg.scoring.diagnosis;
  const W = cfg.scoring.weights.diagnosis;
  const hyp = solved ? Math.max(0, d.hypMax - d.hypWrong * wrong) : 0;
  let fracMeas = decisiveTotal ? decisiveHit / decisiveTotal : 1;
  if (bonusFrac != null) fracMeas = (fracMeas + bonusFrac) / 2;
  const meas = Math.max(0, d.measMax * fracMeas - d.extraPenalty * extras);
  const raw = Math.max(0, hyp + meas - hintCost);
  return { value: clamp((raw / (d.hypMax + d.measMax)) * W, 0, W), hyp, meas, extras, hintCost, max: W };
}

export function safetyScore(penalties, cfg) {
  const W = cfg.scoring.weights.safety;
  const lost = penalties.reduce((s, p) => s + p.points, 0);
  return { value: clamp(W - lost, 0, W), lost, max: W };
}

export function timeScore(minutes, budget, cfg) {
  const W = cfg.scoring.weights.time;
  const z = cfg.scoring.time.zeroAtFactor;
  const v = minutes <= budget ? 1 : clamp(1 - (minutes - budget) / (budget * (z - 1)), 0, 1);
  return { value: W * v, frac: v, minutes, budget, max: W };
}

export function costScore(quality, cfg) {
  const W = cfg.scoring.weights.cost;
  return { value: W * clamp(quality, 0, 1), quality, max: W };
}

/**
 * Jami: safetyApplicable=false bo'lsa, xavfsizlik og'irligi boshqa toifalarga mutanosib taqsimlanadi.
 */
export function combine({ diagnosis, safety, time, cost }, safetyApplicable, cfg) {
  const W = cfg.scoring.weights;
  let sum = diagnosis.value + time.value + cost.value + (safetyApplicable ? safety.value : 0);
  const max = W.diagnosis + W.time + W.cost + (safetyApplicable ? W.safety : 0);
  return round((sum / max) * 100, 1);
}

export function rankOf(total, cfg) {
  let r = cfg.scoring.ranks[0].id;
  for (const x of cfg.scoring.ranks) if (total >= x.min) r = x.id;
  return r;
}

/** Kendall tau → [0,1]: bajarilgan topshiriqlar tartibi ideal (muhimlik kamayishi) tartibiga qanchalik mos */
export function priorityAgreement(doneOrder, weightOf) {
  const n = doneOrder.length;
  if (n < 2) return null;
  let conc = 0, disc = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const wi = weightOf(doneOrder[i]);
      const wj = weightOf(doneOrder[j]);
      if (wi > wj) conc++;
      else if (wi < wj) disc++;
    }
  }
  const tot = conc + disc;
  return tot ? (conc - disc) / tot / 2 + 0.5 : 1;
}
