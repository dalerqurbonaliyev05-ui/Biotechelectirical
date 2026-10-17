// Xavfsizlik ketma-ketligi mantig'i (LOTO). DOM ga tegmaydi.

export function stepsOf(safetyData) {
  return safetyData.steps;
}

export function isComplete(done) {
  return done.includes('work');
}

/**
 * Qadamni bajarishga urinish.
 * Qaytaradi:
 *  {ok:true}
 *  {ok:false, already:true}
 *  {ok:false, severity:'minor'|'major'|'serious'|'critical', missing:[ids], why:string}
 */
export function tryStep(safetyData, done, stepId) {
  const step = safetyData.steps.find((s) => s.id === stepId);
  if (!step) return { ok: false, severity: 'minor', missing: [], why: '' };
  if (done.includes(stepId)) return { ok: false, already: true };
  const missing = step.requires.filter((r) => !done.includes(r));
  if (missing.length === 0) return { ok: true };
  const crit = missing.filter((m) => (step.criticalIfMissing || []).includes(m));
  // Eng muhim yetishmayotgan qadam bo'yicha izoh
  const key = crit[0] || missing[missing.length - 1];
  const why = step.whyIfMissing?.[key] || step.why;
  return {
    ok: false,
    severity: crit.length ? 'critical' : step.severity,
    missing,
    why
  };
}

/** Keyingi to'g'ri qadam (maslahat uchun) */
export function nextStep(safetyData, done) {
  return safetyData.steps.find((s) => !done.includes(s.id) && s.requires.every((r) => done.includes(r)));
}
