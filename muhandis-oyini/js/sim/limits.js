// Chegaralar bo'yicha holat sinflash: 'good' | 'warn' | 'bad'  (config.json → limits)

export function classifyVoltage(devPct, L) {
  const a = Math.abs(devPct);
  return a <= L.voltageDevWarnPct ? 'good' : a <= L.voltageDevBadPct ? 'warn' : 'bad';
}
export function classifyUnbalance(pct, L) {
  return pct <= L.unbalanceOkPct ? 'good' : 'bad';
}
export function classifyCaseTemp(T, L) {
  return T < L.caseTempWarnC ? 'good' : T <= L.caseTempBadC ? 'warn' : 'bad';
}
export function classifyBearingTemp(T, L) {
  return T < L.bearingWarnC ? 'good' : T <= L.bearingBadC ? 'warn' : 'bad';
}
export function classifyTerminalTemp(T, L) {
  return T < L.terminalWarnC ? 'good' : T <= L.terminalBadC ? 'warn' : 'bad';
}
export function classifyVibration(v, L) {
  return v <= L.vibGoodMms ? 'good' : v <= L.vibBadMms ? 'warn' : 'bad';
}
export function classifyInsulation(R, L) {
  return R >= L.insGoodMOhm ? 'good' : R >= L.insBadMOhm ? 'warn' : 'bad';
}
export function classifyCosphi(c, L) {
  return c >= L.cosphiTarget ? 'good' : c >= L.cosphiTarget - 0.1 ? 'warn' : 'bad';
}
export function classifyTrK(K, L) {
  return K <= L.trOkK ? 'good' : K <= L.trMaxK ? 'warn' : 'bad';
}
export function classifyCurrentRatio(r, L) {
  return r <= L.currentRatioWarn ? 'good' : r <= L.currentRatioBad ? 'warn' : 'bad';
}

export const worst = (...s) => (s.includes('bad') ? 'bad' : s.includes('warn') ? 'warn' : 'good');
