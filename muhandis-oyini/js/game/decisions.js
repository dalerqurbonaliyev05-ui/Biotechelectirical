// Qaror bosqichi: variantlar, iqtisodiy hisob, bajarish, ball. Game.prototype ga qo'shiladi (this = Game).
import { deepClone, clamp, round } from '../util.js';
import { restoreHealthy, getNp, PAIRS } from '../sim/world.js';
import { computePlant } from '../sim/plant.js';
import { capacitorQc, SQRT3, unbalancePct, cosFromPQ } from '../sim/electrical.js';
import * as Eco from '../sim/economics.js';
import { diagnosisScore, safetyScore, timeScore, costScore, combine } from '../sim/scoring.js';
import { evaluatePortfolio, bestPortfolio, baseProfile, outageCheck, minimalOutagePlan } from '../sim/loadprofile.js';

const PAIR_LIST = ['AB', 'BC', 'CA'];

const welderIds = (g) => Object.keys(g.world.defs).filter((id) => g.world.defs[id].type === 'welder').sort();

export const decisionMethods = {
  // ======== Ma'lumot (UI uchun) ========

  decisionInfo(id) {
    const tk = this.task(id);
    const sym = this.symptom(id);
    const eq = tk.equipment;
    const cfg = this.cfg;
    const out = { economy: sym.economy, burned: tk.burned, options: [] };
    if (sym.economy === 'portfolio' || sym.economy === 'plan') return out;
    const def = this.def(eq);
    const np = this.np(eq);
    const cableLen = np.cable?.length || 0;
    for (const optId of sym.options) {
      const a = this.action(optId);
      const o = { id: optId, label: a.label, kind: a.kind, ui: a.ui || null, loto: !!a.loto };
      if (a.ui === 'replace') {
        o.capexFrom = Math.min(...this.replaceCatalog(id).map((r) => r.capex));
        o.hours = cfg.economy.replaceStockHours;
      } else if (a.ui === 'capacitor' || a.ui === 'assign') {
        o.capex = null;
        o.hours = a.hours;
      } else {
        o.capex = Eco.actionCost(a.cost, { np, cfg, cableLength: cableLen });
        const h = a.days ? a.days * cfg.economy.hoursPerWorkDay : a.hours || 0;
        o.hours = h;
        o.downtimeLoss = h * def.lossPerHour;
        if (sym.economy === 'benefit' && ['vfd', 'trim_impeller', 'timer'].includes(optId)) {
          const mode = optId === 'vfd' ? 'vfd' : optId === 'timer' ? 'timer' : 'trim';
          const st = this.st(eq);
          o.annualSaving = Eco.processAnnualSaving(mode, np, def.typical.load, st.process || def.process, cfg);
          o.payback = o.annualSaving > 0 ? o.capex / o.annualSaving : Infinity;
        }
        if (a.rewind) {
          o.days = a.days;
          o.etaAfter = Eco.etaEffective(np, cfg) - cfg.economy.etaLossPerRewind;
        }
      }
      out.options.push(o);
    }
    return out;
  },

  /** Almashtirish uchun dvigatel katalogi (+ hisoblangan ko'rsatkichlar) */
  replaceCatalog(id) {
    const tk = this.task(id);
    const def = this.def(tk.equipment);
    const np = this.np(tk.equipment);
    const cfg = this.cfg;
    const rows = Eco.replacementCatalog(np, cfg, tk.spare);
    const hours = Eco.annualHours(def, cfg);
    const etaOld = Eco.etaEffective(np, cfg);
    const load = def.typical.load;
    return rows.map((r) => {
      const saving = Eco.annualSaving(np.P, etaOld, r.eta, hours, cfg, load);
      const capex = r.price + cfg.economy.installFixed;
      const dh = Eco.replaceDowntimeHours(r, cfg);
      return { ...r, capex, downtimeHours: dh, downtimeLoss: dh * def.lossPerHour, annualSaving: saving, payback: Eco.paybackYears(r.price, Eco.motorPrice(cfg, np.P, 'IE2') * cfg.economy.rewindCostFracNew, saving) };
    });
  },

  // ======== Nomzodlar va baholash ========

  _demand(id) {
    const tk = this.task(id);
    const cause = this.cause(id);
    const def = this.def(tk.equipment);
    const st = this.st(tk.equipment);
    const np = this.np(tk.equipment);
    if (def.type !== 'motor') return { fix: 0, now: 0 };
    const typical = def.typical.load;
    return { fix: np.P * typical, now: np.P * (cause.replaceNeedsBigger ? Math.max(st.load, typical) : typical) };
  },

  _causeOk(id, optId) {
    const tk = this.task(id);
    const cause = this.cause(id);
    const a = this.action(optId);
    if (tk.burned) return { works: !!a.fixesBurned, fixes: !!a.fixesBurned };
    const fixes = (cause.fixedBy || []).includes(optId);
    return { works: fixes || (cause.alsoWorks || []).includes(optId), fixes };
  },

  /** Qaror hisob-kitoblari LOTO holatiga bog'liq bo'lmasligi uchun: izolyatsiyasiz (ta'minlangan) holatdagi zavod */
  _plantEnergized() {
    const saved = [];
    for (const st of Object.values(this.world.dyn.st)) {
      saved.push([st, st.isolated]);
      st.isolated = false;
    }
    const p = computePlant(this.world);
    for (const [st, v] of saved) st.isolated = v;
    return p;
  },

  optimalKvar(id) {
    const w = this._plantEnergized().ws[this.def(this.task(id).equipment).workshop];
    const target = this.cfg.economy.capacitor.target;
    return Eco.roundUpToStep(capacitorQc(w.P, w.cosBefore, target), this.cfg);
  },

  previewCapacitor(kvar) {
    const bank = this.st('weld_bank');
    const backup = deepClone(bank);
    const step = this.cfg.economy.capacitor.stepKvar;
    bank.installed = true;
    bank.controller = 'auto';
    bank.stagesOk = Math.round(kvar / step);
    bank.np = { ...bank.np, stages: bank.stagesOk, kvarStage: step };
    const p = this._plantEnergized();
    const r = { kvar, cos: p.ws.weld.cos, K: p.tm.TM1.K, totalCos: p.total.cos };
    this.world.dyn.st.weld_bank = backup;
    return r;
  },

  _pairLoad(id) {
    // sexdagi payvand bo'lmagan yuklamalar + har bir payvandchining faza hissasi
    const plant = this._plantEnergized();
    const ws = plant.ws.weld;
    const wids = welderIds(this);
    const contrib = {};
    let weldSum = [0, 0, 0];
    for (const w of wids) {
      const e = plant.eq[w];
      contrib[w] = e?.Iline ? e.Iline * (SQRT3 / 2) : 0;
      const [p0, p1] = PAIRS[this.st(w).pair];
      weldSum[p0] += contrib[w];
      weldSum[p1] += contrib[w];
    }
    const rest = ws.Ipre.map((x, k) => x - weldSum[k]);
    return { rest, contrib, wids, scale: ws.scale };
  },

  previewAssign(id, assign, L = null) {
    const { rest, contrib, wids, scale } = L || this._pairLoad(id);
    const I = rest.slice();
    let moved = 0;
    wids.forEach((w, i) => {
      const [p0, p1] = PAIRS[assign[i]];
      I[p0] += contrib[w];
      I[p1] += contrib[w];
      if (assign[i] !== this.st(w).pair) moved++;
    });
    const Is = I.map((x) => x * scale);
    return { I: Is, unbal: unbalancePct(Is), moved };
  },

  optimalAssign(id) {
    const L = this._pairLoad(id);
    const { wids } = L;
    const cur = wids.map((w) => this.st(w).pair);
    let best = null;
    let fallback = null;
    const n = wids.length;
    const total = 3 ** n;
    const a = new Array(n);
    for (let m = 0; m < total; m++) {
      let x = m;
      for (let i = 0; i < n; i++) {
        a[i] = PAIR_LIST[x % 3];
        x = Math.floor(x / 3);
      }
      const r = this.previewAssign(id, a, L);
      let moves = 0;
      for (let i = 0; i < n; i++) if (a[i] !== cur[i]) moves++;
      if (!fallback || r.unbal < fallback.unbal) fallback = { assign: a.slice(), moves, unbal: r.unbal };
      if (r.unbal > 6) continue;
      if (!best || moves < best.moves || (moves === best.moves && r.unbal < best.unbal)) best = { assign: a.slice(), moves, unbal: r.unbal };
    }
    return best || fallback;
  },

  currentAssign() {
    return welderIds(this).map((w) => this.st(w).pair);
  },

  _costCandidates(id, choice) {
    const tk = this.task(id);
    const sym = this.symptom(id);
    const cfg = this.cfg;
    const eq = tk.equipment;
    const def = this.def(eq);
    const np = this.np(eq);
    const loss = def.lossPerHour;
    const isMotor = def.type === 'motor';
    const hoursYear = Eco.annualHours(def, cfg);
    const dem = this._demand(id);
    const etaNow = isMotor ? Eco.etaEffective(np, cfg) : 1;
    const out = [];
    const downLoss = (h) => h * loss;
    for (const optId of sym.options) {
      const a = this.action(optId);
      const ok = this._causeOk(id, optId);
      if (a.ui === 'replace') {
        for (const row of this.replaceCatalog(id)) {
          const chk = Eco.checkReplacement(row, np, dem.now);
          out.push({
            id: `replace:${row.id}`, optionId: optId, rowId: row.id, row, label: this.t('dec.replaceRow', { label: a.label, P: row.P, cls: row.cls, rpm: row.rpm }),
            valid: ok.works && chk.ok, wasteful: ok.works && !ok.fixes, why: ok.works ? (chk.ok ? null : chk.reason) : 'cause',
            capex: row.capex, downtimeHours: row.downtimeHours, downtimeLoss: row.downtimeLoss, energyYear: Eco.annualEnergyCost(dem.now, row.eta, hoursYear, cfg)
          });
        }
      } else if (a.ui === 'capacitor') {
        const bestK = this.optimalKvar(id);
        out.push({ id: 'capacitor:best', optionId: optId, label: this.t('dec.capacitorRow', { kvar: bestK }), valid: ok.works, wasteful: ok.works && !ok.fixes, capex: Eco.capacitorCapex(bestK, cfg), downtimeHours: a.hours, downtimeLoss: downLoss(a.hours), energyYear: 0, kvar: bestK, hidden: true });
        if (choice?.optionId === optId) {
          const kv = choice.params?.kvar || 0;
          const pv = this.previewCapacitor(kv);
          const L = cfg.limits.cosphiTarget;
          const full = pv.cos >= L && pv.cos <= 0.995;
          const part = pv.cos >= L - 0.05 && pv.cos < L;
          out.push({ id: 'capacitor:chosen', optionId: optId, label: this.t('dec.capacitorRow', { kvar: kv }), valid: ok.works && (full || part), qualityMult: full ? 1 : 0.5, wasteful: ok.works && !ok.fixes, why: full ? null : pv.cos > 0.995 ? 'over' : 'under', cosAfter: pv.cos, capex: Eco.capacitorCapex(kv, cfg), downtimeHours: a.hours, downtimeLoss: downLoss(a.hours), energyYear: 0, kvar: kv });
        }
      } else if (a.ui === 'assign') {
        const opt = this.optimalAssign(id);
        out.push({ id: 'assign:best', optionId: optId, label: this.t('dec.assignRow', { moved: opt.moves }), valid: ok.works, wasteful: false, capex: Eco.actionCost(a.cost, { np, cfg, moved: opt.moves }), downtimeHours: a.hours * opt.moves, downtimeLoss: downLoss(a.hours * opt.moves), energyYear: 0, hidden: true });
        if (choice?.optionId === optId) {
          const pv = this.previewAssign(id, choice.params?.assign || this.currentAssign());
          const lim = cfg.limits.unbalanceOkPct;
          const good = pv.unbal <= lim;
          out.push({ id: 'assign:chosen', optionId: optId, label: this.t('dec.assignRow', { moved: pv.moved }), valid: ok.works && good && pv.moved > 0, qualityMult: pv.unbal <= 5 ? 1 : 0.85, why: good ? null : 'under', unbal: pv.unbal, capex: Eco.actionCost(a.cost, { np, cfg, moved: pv.moved }), downtimeHours: a.hours * pv.moved, downtimeLoss: downLoss(a.hours * pv.moved), energyYear: 0 });
        }
      } else {
        const h = a.days ? a.days * cfg.economy.hoursPerWorkDay : a.hours || 0;
        const eta = a.rewind ? etaNow - cfg.economy.etaLossPerRewind : etaNow;
        out.push({
          id: optId, optionId: optId, label: a.label, valid: ok.works, wasteful: ok.works && !ok.fixes,
          capex: Eco.actionCost(a.cost, { np, cfg, cableLength: np.cable?.length || 0 }), downtimeHours: h, downtimeLoss: downLoss(h),
          energyYear: isMotor ? Eco.annualEnergyCost(dem.fix, eta, hoursYear, cfg) : 0
        });
      }
    }
    return out;
  },

  _benefitCandidates(id) {
    const tk = this.task(id);
    const sym = this.symptom(id);
    const cfg = this.cfg;
    const def = this.def(tk.equipment);
    const st = this.st(tk.equipment);
    const np = this.np(tk.equipment);
    const out = [];
    for (const optId of sym.options) {
      const a = this.action(optId);
      if (optId === 'monitor') {
        out.push({ id: optId, optionId: optId, label: a.label, valid: true, isNoop: true, capex: 0, downtimeLoss: 0, annualSaving: 0 });
        continue;
      }
      const mode = optId === 'vfd' ? 'vfd' : optId === 'timer' ? 'timer' : 'trim';
      const capex = Eco.actionCost(a.cost, { np, cfg });
      const h = a.hours || 0;
      out.push({ id: optId, optionId: optId, label: a.label, valid: true, capex, downtimeLoss: h * def.lossPerHour, annualSaving: Eco.processAnnualSaving(mode, np, def.typical.load, st.process || def.process, cfg) });
    }
    return out;
  },

  /** Tanlangan variantni baholash. choice = {optionId, rowId?, params?} */
  evaluateChoice(id, choice) {
    const sym = this.symptom(id);
    const cfg = this.cfg;
    let cands, evald;
    if (sym.economy === 'benefit') {
      cands = this._benefitCandidates(id);
      evald = Eco.evaluateBenefitOptions(cands, cfg);
    } else {
      cands = this._costCandidates(id, choice);
      evald = Eco.evaluateCostOptions(cands, cfg);
    }
    let chosen = null;
    if (choice) {
      const key = choice.optionId === 'replace' ? `replace:${choice.rowId}` : choice.optionId === 'capacitor' ? 'capacitor:chosen' : choice.optionId === 'rebalance' ? 'assign:chosen' : choice.optionId;
      chosen = evald.find((c) => c.id === key) || null;
    }
    let quality = chosen ? chosen.quality * (chosen.qualityMult ?? 1) : 0;
    const task = this.task(id);
    if (task.burned && quality > 0) quality *= 0.75;
    return { economy: sym.economy, candidates: evald, chosen, quality: clamp(quality, 0, 1), valid: !!chosen?.valid };
  },

  /** Eng yaxshi nomzod (testlar va izoh uchun) */
  bestChoice(id) {
    const ev = this.evaluateChoice(id, null);
    const best = ev.candidates.filter((c) => c.isBest)[0];
    return best || null;
  },

  // ======== Bajarish ========

  lotoTarget(id, optId) {
    void optId;
    const cause = this.cause(id);
    return cause.safetyEq || this.taskDef(id).safetyEq || this.task(id).equipment;
  },

  /**
   * Qarorni bajarish. choice = {optionId, rowId?, params?}
   * Qaytaradi: {ok:false, needSafety:true, eq} yoki {ok:true, result}
   */
  executeDecision(id, choice) {
    const s = this.state;
    const tk = this.task(id);
    const sym = this.symptom(id);
    if (tk.status !== 'diagnosed') return { ok: false, error: 'notDiagnosed' };
    if (sym.economy === 'portfolio' || sym.economy === 'plan') return { ok: false, error: 'wrongKind' };
    const a = this.action(choice.optionId);
    const eqL = this.lotoTarget(id, choice.optionId);
    if (a.loto && !this.safetyComplete(eqL)) return { ok: false, needSafety: true, eq: eqL };

    const ev = this.evaluateChoice(id, choice);
    this.advance(a.workMin || 10);

    // Dunyoni yangilash: nosozlikni bartaraf etish
    this._applyFix(id, choice, ev);
    if (a.loto) this.releaseLockout(eqL, 1);
    else if (this.st(eqL).isolated || this.st(eqL).safety.done.length) this.releaseLockout(eqL, 1);
    s.money.spent += ev.chosen?.capex || 0;

    const result = this._finish(id, ev, choice);
    return { ok: true, result };
  },

  _applyFix(id, choice, ev) {
    const tk = this.task(id);
    const cause = this.cause(id);
    const cfg = this.cfg;
    const eq = tk.equipment;
    const def = this.def(eq);
    const np = this.np(eq);
    const dem = this._demand(id);
    const a = this.action(choice.optionId);
    const sym = this.symptom(id);
    const world = this.world;

    if (sym.economy === 'benefit') {
      const st = this.st(eq);
      if (['vfd', 'trim_impeller', 'timer'].includes(choice.optionId) && ev.chosen?.annualSaving > 0) {
        const process = st.process || def.process;
        const load0 = st.load;
        const mode = choice.optionId === 'vfd' ? 'vfd' : choice.optionId === 'timer' ? 'timer' : 'trim';
        // yuklamani o'rtacha tejalgan quvvat nisbatida kamaytirish
        const hoursTotal = (process.segments || [{ h: process.hours }]).reduce((x, y) => x + y.h, 0);
        const kwBase = (np.P * load0) / np.eta;
        const kwSaved = Eco.processAnnualSaving(mode, np, def.typical.load, process, cfg) / cfg.economy.TARIF_SOM_KWH / hoursTotal;
        st.load = Math.max(0.05, load0 * (1 - kwSaved / kwBase));
        if (mode === 'vfd') st.vfd = true;
      }
      this._finishPatched(id, { keepAll: true });
      return;
    }

    for (const pid of tk.patched) {
      const d = this.def(pid);
      const old = this.st(pid);
      const oldNp = getNp(d, old);
      if (d.type === 'motor') {
        const keep = { age: oldNp.age, rewinds: oldNp.rewinds };
        if (a.rewind) keep.rewinds = (oldNp.rewinds || 0) + 1;
        if (choice.optionId === 'replace' && choice.rowId && pid === eq) {
          const row = ev.candidates.find((c) => c.id === `replace:${choice.rowId}`)?.row;
          if (row) Object.assign(keep, { P: row.P, eta: row.eta, rpm: row.rpm, poles: row.poles, effClass: row.cls, age: 0, rewinds: 0 });
          const st = restoreHealthy(world, pid, { np: keep });
          if (row) st.load = clamp(dem.now / row.P, 0.05, 1.1);
          continue;
        }
        if (tk.burned && !a.rewind && choice.optionId !== 'replace') keep.rewinds = oldNp.rewinds;
        restoreHealthy(world, pid, { np: keep });
      } else if (d.type === 'welder') {
        // yaroqsiz tanlovda ham nosoz apparat tuzatilgan deb olinadi
        restoreHealthy(world, pid, {});
      } else {
        restoreHealthy(world, pid, {});
      }
    }

    // Maxsus holatlar
    if (choice.optionId === 'rebalance' || (cause.id === 'uneven_distribution')) {
      const assign = ev.chosen?.valid ? choice.params?.assign : this.optimalAssign(id).assign;
      welderIds(this).forEach((w, i) => (this.st(w).pair = assign[i]));
    }
    if (choice.optionId === 'capacitor' || (tk.causeId === 'no_compensation')) {
      const kv = ev.chosen?.valid && choice.optionId === 'capacitor' ? choice.params.kvar : this.optimalKvar(id);
      const bank = this.st('weld_bank');
      const step = cfg.economy.capacitor.stepKvar;
      bank.installed = true;
      bank.controller = 'auto';
      bank.stagesOk = Math.round(kv / step);
      bank.np = { ...bank.np, stages: bank.stagesOk, kvarStage: step };
    }
    if (tk.causeId === 'bank_stage_failed' || tk.causeId === 'bank_controller_off') {
      const bank = this.st('weld_bank');
      if (choice.optionId === 'capacitor' && ev.chosen?.valid) {
        const step = cfg.economy.capacitor.stepKvar;
        bank.stagesOk = Math.round(choice.params.kvar / step);
        bank.np = { ...bank.np, stages: bank.stagesOk, kvarStage: step };
      }
    }
    this._finishPatched(id, {});
  },

  /** Nosozlikni bartaraf etish (baxtsiz hodisadan keyin ham tizim izchil qolishi uchun) */
  _resolveFault(task) {
    const sym = this.symptom(task.id);
    if (sym.economy === 'cost') {
      this._applyFix(task.id, { optionId: 'monitor' }, { candidates: [], chosen: null });
      for (const pid of task.affected) {
        const st = this.st(pid);
        st.safety.done = [];
        st.isolated = false;
      }
    }
    this._clearVisuals(task.id);
  },

  _finishPatched(id, { keepAll } = {}) {
    void keepAll;
    this._clearVisuals(id);
    this.refreshPlant();
    // haroratlar tabiiy ravishda sovib boradi (stepWorld)
  },

  /** Ball hisoblash va topshiriqni yopish */
  _finish(id, ev, choice, extra = {}) {
    const s = this.state;
    const tk = this.task(id);
    const cfg = this.cfg;
    const a = choice ? this.action(choice.optionId) : null;
    const cause = this.cause(id);
    const keyOf = (spec) => (spec.includes('@') ? spec : `${spec}@${tk.equipment}`);
    const decisive = (cause.decisive || []).map(keyOf);
    const useful = (cause.useful || []).map(keyOf);
    let hit = 0, extras = 0;
    for (const k of decisive) if (tk.used[k]) hit++;
    for (const [k, n] of Object.entries(tk.used)) {
      if (!decisive.includes(k) && !useful.includes(k)) extras += n;
      else extras += Math.max(0, n - 1);
    }
    tk.extras = extras;
    tk.decisiveHit = decisive.filter((k) => tk.used[k]);
    const diagnosis = diagnosisScore({ wrong: tk.wrongHyp.length, solved: !tk.hypRevealed, decisiveTotal: decisive.length, decisiveHit: hit, extras, hintCost: tk.hintCost, bonusFrac: tk.peak?.acc ?? null }, cfg);
    const safety = safetyScore(tk.penalties, cfg);
    const safetyApplicable = tk.touched || !!a?.loto || tk.penalties.length > 0;
    const time = timeScore(tk.minutes, this.budgetOf(id), cfg);
    const cost = costScore(extra.quality ?? ev.quality, cfg);
    const total = combine({ diagnosis, safety, time, cost }, safetyApplicable, cfg);
    tk.score = { total, diagnosis, safety, time, cost, safetyApplicable, decisive, useful, hit, extras };
    tk.status = 'done';
    tk.finishedT = s.t;
    tk.decision = { optionId: choice?.optionId, rowId: choice?.rowId, quality: extra.quality ?? ev.quality, valid: extra.valid ?? ev.valid };
    s.doneOrder.push(id);
    if (s.current === id) s.current = null;
    this.refreshPlant();
    this.addLog('event', this.t('msg.taskDone', { id, total: round(total, 0) }));
    this.emit('taskDone', { id });
    this.emit('change');
    const chosenCand = ev.chosen;
    const why = chosenCand && !chosenCand.valid ? this._invalidNote(id, choice, chosenCand) : null;
    return {
      taskId: id, score: tk.score, choice, valid: extra.valid ?? ev.valid, quality: extra.quality ?? ev.quality, burned: tk.burned,
      candidates: ev.candidates, chosen: chosenCand, causeLabel: cause.label, explain: cause.explain, why, wasteful: !!chosenCand?.wasteful, economy: ev.economy, extra
    };
  },

  _invalidNote(id, choice, cand) {
    const cause = this.cause(id);
    const direct = cause.invalid?.[choice.optionId];
    if (direct) return direct;
    if (cand.why === 'speed') return this.t('dec.why.speed');
    if (cand.why === 'power') return this.t('dec.why.power');
    if (cand.why === 'under') return this.t('dec.why.under');
    if (cand.why === 'over') return this.t('dec.why.over');
    if (this.task(id).burned) return this.t('dec.why.burned');
    const names = (cause.fixedBy || []).map((x) => this.action(x).label).join('; ');
    return this.t('dec.why.generic', { right: names });
  },

  /** Tutorial: gipoteza to'g'ri bo'lsa yakunlanadi */
  finishTutorial() {
    const tk = this.task('T0');
    if (!tk || tk.status === 'done') return null;
    tk.status = 'done';
    tk.finishedT = this.state.t;
    this.state.tutorialStep = this.taskDef('T0').steps.length - 1;
    if (this.state.current === 'T0') this.state.current = null;
    this.addLog('event', this.t('msg.tutorialDone'));
    this.emit('taskDone', { id: 'T0' });
    this.emit('change');
    return { taskId: 'T0', explain: this.cause('T0').explain };
  },

  // ======== E1: yuklama grafigi va takliflar ========

  energyVariant(id) {
    return this.task(id)?.params?.energyVariant || 'weld_peak';
  },

  energyView(ids = []) {
    const e1 = this.state.tasks.E1;
    const variant = e1 ? this.energyVariant('E1') : 'weld_peak';
    const ev = evaluatePortfolio(this.world, this.plant, this.data.energy, variant, ids);
    return { variant, base: ev.base, ev };
  },

  /** Alohida takliflar uchun ko'rsatkichlar */
  proposalTable() {
    const e1 = this.state.tasks.E1;
    const variant = e1 ? this.energyVariant('E1') : 'weld_peak';
    return this.data.energy.proposals.map((p) => {
      const ev = evaluatePortfolio(this.world, this.plant, this.data.energy, variant, [p.id]);
      return { id: p.id, capex: ev.capex, annualNet: ev.annualNet, paybackYears: ev.paybackYears, cosAfter: ev.cos, peakAfter: ev.peakKw };
    });
  },

  submitPeakHours(id, hours) {
    const tk = this.task(id);
    const variant = this.energyVariant(id);
    const base = baseProfile(this.world, this.plant, this.data.energy, variant);
    const A = new Set(hours), B = new Set(base.peakHours);
    const inter = [...A].filter((h) => B.has(h)).length;
    const uni = new Set([...A, ...B]).size;
    tk.peak = { hours: hours.slice(), actual: base.peakHours, acc: uni ? inter / uni : 0 };
    this.advance(2);
    this.emit('change');
    return tk.peak;
  },

  previewPortfolio(id, ids) {
    return evaluatePortfolio(this.world, this.plant, this.data.energy, this.energyVariant(id), ids);
  },

  submitPortfolio(id, ids) {
    const tk = this.task(id);
    if (tk.status !== 'diagnosed') return { ok: false, error: 'notDiagnosed' };
    const budget = this.cfg.economy.e1Budget;
    const variant = this.energyVariant(id);
    const H = this.cfg.economy.horizonYears;
    const ev = evaluatePortfolio(this.world, this.plant, this.data.energy, variant, ids);
    const best = bestPortfolio(this.world, this.plant, this.data.energy, variant, budget);
    const net = H * ev.annualNet - ev.capex;
    let quality = 0;
    const over = ev.capex > budget;
    if (!over) {
      if (best.best.net <= 0) quality = ids.length === 0 ? 1 : 0;
      else quality = net <= 0 ? 0 : clamp(net / best.best.net, 0.3, 1);
    }
    this.advance(25);
    this.state.money.spent += ev.capex;
    // Dunyoga ta'sir: kondensator va VFD
    if (ids.includes('cap_bank')) {
      const bank = this.st('weld_bank');
      bank.installed = true;
      bank.controller = 'auto';
      bank.stagesOk = bank.np.stages ?? this.def('weld_bank').nameplate.stages;
    }
    this.state.energy.applied = ids.slice();
    const chosenPlan = { ids, ev, net, capex: ev.capex };
    const res = this._finish(id, { candidates: [], chosen: null, quality, valid: quality > 0, economy: 'portfolio' }, null, { quality, valid: quality > 0 });
    res.portfolio = { chosen: chosenPlan, best: { ids: best.best.ids, net: best.best.net, capex: best.best.ev?.capex ?? 0 }, over, budget };
    return { ok: true, result: res };
  },

  /** E1: byudjet doirasidagi eng yaxshi to'plam */
  energyBest() {
    const variant = this.energyVariant('E1');
    const b = bestPortfolio(this.world, this.plant, this.data.energy, variant, this.cfg.economy.e1Budget);
    return b.best;
  },

  /** E2: eng arzon yetarli to'plam (yoki bo'sh) */
  energyOutageBest(id) {
    return minimalOutagePlan(this.world, this.plant, this.data.energy, this.task(id).params.window);
  },

  // ======== E2: transformator ta'miri ========

  outageInfo(id) {
    const tk = this.task(id);
    const en = this.data.energy;
    return { window: tk.params.window, windowText: this.windowText(id), measures: en.e2.measures };
  },

  previewOutage(id, ids) {
    return outageCheck(this.world, this.plant, this.data.energy, this.task(id).params.window, ids);
  },

  submitOutage(id, ids) {
    const tk = this.task(id);
    if (tk.status !== 'diagnosed') return { ok: false, error: 'notDiagnosed' };
    const L = this.cfg.limits;
    const chosen = outageCheck(this.world, this.plant, this.data.energy, tk.params.window, ids);
    const bestPlan = minimalOutagePlan(this.world, this.plant, this.data.energy, tk.params.window);
    let quality = 0;
    if (chosen.K > L.trMaxK) quality = 0;
    else if (chosen.K > L.trPlanK) quality = 0.3;
    else if (!bestPlan) quality = 0.5;
    else if (bestPlan.cost === 0) quality = chosen.cost === 0 ? 1 : clamp(1 - chosen.cost / 4000000, 0.4, 0.95);
    else quality = clamp(bestPlan.cost / Math.max(chosen.cost, 1), 0.3, 1);
    this.advance(15);
    this.state.money.spent += chosen.cost;
    const res = this._finish(id, { candidates: [], chosen: null, quality, valid: quality > 0, economy: 'plan' }, null, { quality, valid: quality > 0 });
    res.outage = { chosen, best: bestPlan, ids };
    return { ok: true, result: res };
  }
};

export { cosFromPQ };
