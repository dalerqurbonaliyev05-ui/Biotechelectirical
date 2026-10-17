// Ideal o'yinchi (bot): topshiriqni yashirin sababni bilgan holda eng yaxshi tarzda bajaradi.
// Maqsad: har bir (topshiriq, sabab, seed) yechilishini va ball tizimi to'g'riligini tekshirish.

export function doSafety(g, eq, upTo = 'work') {
  const order = ['permit', 'ppe', 'disconnect', 'lock', 'verify', 'ground', 'fence', 'work'];
  const stop = order.indexOf(upTo);
  for (let i = 0; i <= stop; i++) {
    if (g.st(eq).safety.done.includes(order[i])) continue;
    const r = g.safetyStep(eq, order[i]);
    if (!r.ok && !r.already) throw new Error(`xavfsizlik qadami ${order[i]} muvaffaqiyatsiz: ${JSON.stringify(r)}`);
  }
}

export function keyParts(spec, eq) {
  return spec.includes('@') ? spec.split('@') : [spec, eq];
}

export function playTask(g, id, { verbose = false } = {}) {
  const def = g.taskDef(id);
  const tk = g.task(id);
  const cause = g.cause(id);
  const sym = g.symptom(id);
  g.selectTask(id);
  g.goTo(def.location);
  // Asboblar
  for (const spec of cause.decisive || []) {
    const [tool, eq] = keyParts(spec, def.equipment);
    if (tool === 'trend') {
      g.goTo('ru');
      g.readTrend();
      g.goTo(def.location);
      continue;
    }
    const eqLoc = g.eqLocation(eq);
    if (g.state.player.loc !== eqLoc) g.goTo(eqLoc);
    if (tool === 'megger') doSafety(g, eq, 'verify');
    else if (['clamp', 'clampStart', 'multimeter'].includes(tool)) g.wearPPE();
    const r = g.useTool(eq, tool);
    if (!r.ok) throw new Error(`${id}: asbob ${tool}@${eq} ishlamadi: ${JSON.stringify(r)}`);
  }
  if (!g.canHypothesize(id)) throw new Error(`${id}: o'lchov yetarli emas`);
  if (g.state.player.loc !== def.location) g.goTo(def.location);
  if (id === 'E1') {
    const peak = g.profile(g.energyVariant('E1')).peakHours;
    g.submitPeakHours(id, peak);
  }
  const hyp = g.submitHypothesis(id, cause.id);
  if (!hyp.ok || !hyp.correct) throw new Error(`${id}: gipoteza: ${JSON.stringify(hyp)}`);
  if (def.tutorial) return g.finishTutorial();

  if (sym.economy === 'portfolio') {
    const best = g.energyBest();
    const r = g.submitPortfolio(id, best.ids);
    return r.result;
  }
  if (sym.economy === 'plan') {
    const info = g.outageInfo(id);
    const best = g.energyOutageBest(id);
    const r = g.submitOutage(id, best ? best.ids : []);
    void info;
    return r.result;
  }
  const best = g.bestChoice(id);
  if (!best) throw new Error(`${id}: eng yaxshi variant topilmadi`);
  const choice = { optionId: best.optionId };
  if (best.rowId) choice.rowId = best.rowId;
  if (best.optionId === 'capacitor') choice.params = { kvar: best.kvar };
  if (best.optionId === 'rebalance') choice.params = { assign: g.optimalAssign(id).assign };
  const a = g.action(best.optionId);
  if (a.loto) {
    const eqL = g.lotoTarget(id, best.optionId);
    const loc = g.eqLocation(eqL);
    if (g.state.player.loc !== loc) g.goTo(loc);
    doSafety(g, eqL);
  }
  const ex = g.executeDecision(id, choice);
  if (!ex.ok) throw new Error(`${id}: bajarish: ${JSON.stringify(ex)}`);
  if (verbose) console.log(id, cause.id, best.id, ex.result.score.total);
  return ex.result;
}
