// Oddiy issiqlik modeli (soddalashtirilgan): harorat = f(yuklama, sovitish, vaqt)
import { cableAmpacity } from './electrical.js';

/**
 * Dvigatelning turg'un haroratlari.
 * Irat — tok nisbati (I/I_nom), cooling — sovitish samaradorligi (0..1).
 */
export function motorSteadyTemps({ Irat, I, cooling, heatWinding = 0, heatBearing = 0, heatTerminal = 0, vib = 0, stalled = false, contactR = 0, powered = true }, plantCfg, thermCfg) {
  const amb = plantCfg.ambientC;
  if (!powered) return { case: amb, bearing: amb, terminal: amb };
  const base = thermCfg.deltaCaseNomC * Irat * Irat;
  const rise = base / Math.max(cooling, 0.05);
  return {
    case: amb + rise + 0.5 * heatWinding,
    bearing: amb + thermCfg.bearingFrac * rise + heatBearing + Math.max(0, vib - 4.5) * 3 + (stalled ? thermCfg.stalledBearingBonusC : 0),
    terminal: amb + thermCfg.terminalFrac * base + thermCfg.contactHeatCPerW * I * I * contactR + heatTerminal
  };
}

/** Payvand apparati korpusi */
export function welderSteadyTemps({ S, Srated, heatWinding = 0, contactR = 0, I = 0, powered = true }, plantCfg, thermCfg) {
  const amb = plantCfg.ambientC;
  if (!powered) return { case: amb, terminal: amb };
  const r = S / Srated;
  return {
    case: amb + 18 + 25 * r * r + 0.4 * heatWinding,
    terminal: amb + 12 + thermCfg.contactHeatCPerW * I * I * contactR
  };
}

/** Kabel va uning ulanish nuqtasi */
export function cableSteadyTemps({ I, section, contactR = 0, powered = true }, plantCfg, thermCfg) {
  const amb = plantCfg.ambientC;
  if (!powered || !I) return { cable: amb, terminal: amb };
  const r = I / cableAmpacity(section);
  const cable = amb + Math.min(thermCfg.cableDeltaNomC * r * r, 85);
  return { cable, terminal: amb + 0.5 * (cable - amb) + thermCfg.contactHeatCPerW * I * I * contactR };
}

/** T(t+dt) = T_ust + (T − T_ust)·exp(−dt/τ) */
export function stepTemp(T, Tss, dtMin, tau) {
  return Tss + (T - Tss) * Math.exp(-dtMin / tau);
}

/** Shikast to'planish tezligi (1/daq): nosozlikning o'z tezligi + harorat ta'siri */
export function hazardRate(caseT, causeRate, hazardCfg) {
  return (causeRate || 0) + Math.max(0, caseT - hazardCfg.tempStartC) / hazardCfg.tempScale;
}
