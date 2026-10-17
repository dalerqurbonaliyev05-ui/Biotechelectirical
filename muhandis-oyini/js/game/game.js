// O'yin yadrosi: holat, vaqt, harakat, o'lchash, xavfsizlik, maslahat, favqulodda chaqiruvlar.
// DOM ga bog'liq emas — UI faqat shu API ni chaqiradi, Node testlari ham.
import { rngFor, weightedPick, shuffle, deepClone, clamp, round } from '../util.js';
import { createWorld, applyPatch, resolveTargets, patchRng, getNp, nomCurrentOf, isPowered, isIsolated, stOf } from '../sim/world.js';
import { computePlant, settleTemps, stepWorld, eqStatus, workshopStatus, lossRatePerHour } from '../sim/plant.js';
import { measure, isLiveMeasurement, meggerGate } from '../sim/measure.js';
import { tryStep, nextStep } from '../sim/safety.js';
import { baseProfile } from '../sim/loadprofile.js';
import { decisionMethods } from './decisions.js';
import { reportMethods } from './report.js';

const CORNER = ['mech', 'weld', 'pump', 'vent'];

export class Game {
  constructor(data, state) {
    this.data = data;
    this.cfg = data.config;
    this.t = data.t;
    this.state = state;
    this.world = { data, cfg: data.config, defs: {}, dyn: state.dyn, seed: state.seed };
    for (const e of data.equipment.equipment) this.world.defs[e.id] = e;
    this.listeners = {};
    this.locs = Object.fromEntries(data.equipment.locations.map((l) => [l.id, l]));
    this.plant = computePlant(this.world);
  }

  // ---------- Yaratish / tiklash ----------

  static create(data, { seed = Math.floor(Math.random() * 1e9), difficulty = 'normal', mode = 'day', tutorial = true, force = {} } = {}) {
    const cfg = data.config;
    const world = createWorld(data, seed);
    const real = data.tasks.tasks.filter((t) => !t.tutorial);
    let ids;
    if (mode === 'practice') ids = real.map((t) => t.id);
    else {
      const n = cfg.difficulty[difficulty].tasks;
      const anchors = cfg.alwaysIncluded;
      const rest = shuffle(rngFor(seed, 'tasks'), real.filter((t) => !anchors.includes(t.id)).map((t) => t.id));
      ids = [...anchors, ...rest.slice(0, Math.max(0, n - anchors.length))];
    }
    if (tutorial) ids.unshift('T0');

    const tasks = {};
    for (const id of ids) tasks[id] = Game._makeTask(data, world, id, force[id]);
    const plant = settleTemps(world);
    for (const st of Object.values(world.dyn.st)) {
      if (st.initT) {
        Object.assign(st.T, st.initT);
        delete st.initT;
      }
    }
    void plant;

    const shiftMinutes = cfg.modes[mode].shiftMinutes;
    const emCount = mode === 'practice' ? 0 : cfg.difficulty[difficulty].emergencies;
    const emRng = rngFor(seed, 'emerg');
    const types = shuffle(emRng, data.tasks.emergencies);
    const emergencies = [];
    const e0 = cfg.emergency.firstAfterMin, e1 = cfg.emergency.lastBeforeMin;
    for (let i = 0; i < emCount; i++) {
      const at = Math.round(e0 + ((e1 - e0) * (i + emRng() * 0.7)) / emCount);
      emergencies.push({ id: 'em' + i, type: types[i % types.length].id, at, status: 'scheduled', deadline: at + cfg.emergency.deadlineMin, score: null });
    }

    const state = {
      v: 1, seed, difficulty, mode, tutorial,
      t: 0, endT: shiftMinutes, over: false, finished: false,
      player: { loc: 'dispatch', ppe: false },
      dyn: world.dyn,
      tasks, order: ids, current: null,
      emergencies,
      money: { loss: 0, spent: 0 },
      energy: { applied: [], trendRead: false },
      meas: [], measCount: {}, log: [],
      doneOrder: [], accidents: 0, tutorialStep: 0,
      result: null
    };
    const g = new Game(data, state);
    g.addLog('radio', g.t('msg.intro', { name: cfg.plant.name }));
    return g;
  }

  static _makeTask(data, world, id, forced) {
    const def = data.tasks.tasks.find((t) => t.id === id);
    const sym = data.faults.symptoms[def.symptom];
    const seed = world.seed;
    const rng = rngFor(seed, 'cause:' + id);
    const picked = weightedPick(rng, sym.causes.filter((c) => (c.weight ?? 1) > 0));
    const cause = forced ? sym.causes.find((c) => c.id === (forced.cause || forced)) || picked : picked;
    let variantIdx = -1;
    if (cause.variants?.length) variantIdx = forced?.variant != null ? forced.variant : Math.floor(rng() * cause.variants.length);
    const params = {};
    for (const [k, v] of Object.entries(cause.params || {})) params[k] = Array.isArray(v) ? v[Math.floor(rng() * v.length)] : v;
    const spare = rng() < (cause.spareChance ?? 0.5);
    const patches = [...(cause.patches || []), ...(variantIdx >= 0 ? cause.variants[variantIdx].patches || [] : [])];
    const prng = patchRng(world, id);
    const affected = new Set(), patched = new Set();
    for (const p of patches) {
      const tagged = { ...p, visual: (p.visual || []).map((v) => ({ ...v, tid: id })) };
      const targets = resolveTargets(world, p.target, def.equipment);
      applyPatch(world, tagged, def.equipment, prng);
      for (const tg of targets) {
        affected.add(tg);
        if (p.state || p.nameplate) patched.add(tg);
      }
    }
    if (cause.hazardPerMin && def.equipment) {
      const st = world.dyn.st[def.equipment];
      if (st) st.hazardPerMin = cause.hazardPerMin;
    }
    return {
      id, status: 'new', causeId: cause.id, variantIdx, params, spare,
      equipment: def.equipment, related: def.related || [],
      affected: [...affected], patched: [...patched],
      used: {}, extras: 0, decisiveHit: [], wrongHyp: [], hypOK: false, hypRevealed: false,
      hints: 0, hintCost: 0, penalties: [], touched: false, accident: false,
      minutes: 0, startedT: null, finishedT: null,
      burned: false, decision: null, peak: null, score: null
    };
  }

  static restore(data, saved) {
    const g = new Game(data, saved);
    return g;
  }

  serialize() {
    return JSON.stringify(this.state);
  }

  // ---------- Hodisalar ----------

  on(evt, fn) {
    (this.listeners[evt] ||= []).push(fn);
    return () => (this.listeners[evt] = this.listeners[evt].filter((f) => f !== fn));
  }
  emit(evt, payload) {
    for (const fn of this.listeners[evt] || []) fn(payload);
  }

  addLog(kind, text) {
    this.state.log.push({ t: this.state.t, kind, text });
    if (this.state.log.length > 200) this.state.log.shift();
    this.emit('message', { kind, text });
  }

  refreshPlant() {
    this.plant = computePlant(this.world);
    return this.plant;
  }

  // ---------- So'rovlar ----------

  get diff() {
    return this.cfg.difficulty[this.state.difficulty];
  }
  hazardScale() {
    return this.diff.hazardScale * (this.state.mode === 'practice' ? this.cfg.modes.practice.hazardScale : 1);
  }
  def(id) {
    return this.world.defs[id];
  }
  st(id) {
    return this.world.dyn.st[id];
  }
  task(id) {
    return this.state.tasks[id];
  }
  taskDef(id) {
    return this.data.tasks.tasks.find((t) => t.id === id);
  }
  symptom(id) {
    return this.data.faults.symptoms[this.taskDef(id).symptom];
  }
  cause(id) {
    const tk = this.task(id);
    return this.symptom(id).causes.find((c) => c.id === tk.causeId);
  }
  causes(id) {
    return this.symptom(id).causes;
  }
  action(id) {
    return this.data.faults.actions[id];
  }
  eqName(id) {
    return this.def(id)?.name ?? id;
  }
  eqLocation(id) {
    const ws = this.def(id).workshop;
    return CORNER.includes(ws) ? ws : ws; // 'mech','weld','pump','vent','ru','tp'
  }
  workshopEquipment(loc) {
    return this.data.equipment.equipment.filter((e) => e.workshop === loc);
  }
  status(id) {
    return eqStatus(this.world, this.plant, id);
  }
  wsStatus(ws) {
    return workshopStatus(this.world, this.plant, ws);
  }
  nominalCurrent(id) {
    return nomCurrentOf(this.def(id), this.st(id));
  }
  np(id) {
    return getNp(this.def(id), this.st(id));
  }
  currentTaskId() {
    return this.state.current;
  }
  taskText(id) {
    const tk = this.task(id);
    const def = this.taskDef(id);
    const w = this.data.energy.e2.windows[tk.params.window];
    const wt = w ? `${String(w.from).padStart(2, '0')}:00–${String(w.to).padStart(2, '0')}:00` : '';
    return def.briefing.replace('{window_text}', wt);
  }
  windowText(id) {
    const w = this.data.energy.e2.windows[this.task(id).params.window];
    return w ? `${String(w.from).padStart(2, '0')}:00–${String(w.to).padStart(2, '0')}:00` : '';
  }
  taskWeight(id) {
    const d = this.taskDef(id);
    return Math.max(1, (d.risk || 1) * (d.impact || 1));
  }
  openTasks() {
    return this.state.order.filter((id) => ['new', 'active', 'diagnosed'].includes(this.task(id).status));
  }
  budgetOf(id) {
    return this.taskDef(id).budget * this.diff.budgetScale;
  }
  totals() {
    const p = this.plant.total;
    return { P: p.P, S: p.S, cos: p.cos, penaltyFactor: p.penaltyFactor, tm1: this.plant.tm.TM1, tm2: this.plant.tm.TM2, loss: this.state.money.loss };
  }

  // ---------- Vaqt ----------

  advance(minutes, attribute = true) {
    let left = minutes;
    while (left > 1e-9) {
      const dt = Math.min(left, this.cfg.clock.stepMaxMin);
      left -= dt;
      this._tick(dt, attribute);
    }
    this.emit('clock');
  }

  _tick(dt, attribute) {
    const s = this.state;
    s.t += dt;
    if (attribute && s.current) {
      const tk = s.tasks[s.current];
      if (tk && (tk.status === 'active' || tk.status === 'diagnosed')) tk.minutes += dt;
    }
    const { events, plant } = stepWorld(this.world, dt, this.hazardScale());
    this.plant = plant;
    s.money.loss += (lossRatePerHour(this.world, plant) * dt) / 60;
    for (const ev of events) if (ev.type === 'burn') this._onBurn(ev.id);
    this._warnings();
    this._emergencyTick();
    if (s.t >= s.endT && !s.over) {
      s.over = true;
      this.addLog('warn', this.t('msg.shiftOver'));
      this.emit('over');
    }
  }

  /** Real vaqt bo'yicha sekin siljish (UI chaqiradi) */
  idleTick(realSeconds) {
    const rate = this.diff.realtimeMinPerSec;
    if (!rate || this.state.over || this.state.finished) return;
    this.advance(rate * realSeconds);
    this.emit('change');
  }

  _warnings() {
    for (const id of Object.keys(this.world.defs)) {
      const st = this.st(id);
      const def = this.def(id);
      if (def.type !== 'motor' && def.type !== 'welder') continue;
      if (st.burned) continue;
      if (!st.warned && st.damage >= 0.5) {
        st.warned = true;
        this.addLog('warn', this.t('msg.warnDamage', { eq: def.name }));
      }
    }
  }

  _onBurn(id) {
    const st = this.st(id);
    const def = this.def(id);
    st.burned = true;
    st.insMOhm = 0.05;
    st.visual.push({ text: this.t('vis.burnedText'), iso: false, tid: 'burn' });
    for (const tk of Object.values(this.state.tasks)) {
      if (['new', 'active', 'diagnosed'].includes(tk.status) && tk.affected.includes(id)) tk.burned = true;
    }
    this.addLog('alarm', this.t('msg.burn', { eq: def.name }));
    this.emit('burn', { id });
  }

  // ---------- Harakat ----------

  walkMinutes(from, to) {
    if (from === to) return 0;
    const a = this.locs[from], b = this.locs[to];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    return Math.max(this.cfg.clock.walkMinMinutes, d * this.cfg.clock.walkMinPerUnit);
  }

  goTo(locId) {
    const s = this.state;
    if (s.player.loc === locId) return 0;
    const m = this.walkMinutes(s.player.loc, locId);
    this.advance(m);
    s.player.loc = locId;
    if (s.tasks.T0 && s.tasks.T0.status !== 'done' && locId === 'mech' && s.tutorialStep === 0) s.tutorialStep = 1;
    this.emit('change');
    return m;
  }

  // ---------- Topshiriq tanlash ----------

  selectTask(id) {
    const s = this.state;
    const tk = s.tasks[id];
    if (!tk || ['done', 'failed'].includes(tk.status)) return;
    s.current = id;
    if (tk.status === 'new') {
      tk.status = 'active';
      tk.startedT = s.t;
    }
    this.emit('change');
  }

  /** Qaysi topshiriq bu uskunaga tegishli (jarima/hisob uchun) */
  taskFor(eqId) {
    const s = this.state;
    const cur = s.current && s.tasks[s.current];
    const live = (tk) => tk && ['active', 'diagnosed', 'new'].includes(tk.status);
    const owns = (tk) => tk && (tk.equipment === eqId || tk.related.includes(eqId) || tk.affected.includes(eqId));
    if (live(cur) && owns(cur)) return cur;
    const owner = Object.values(s.tasks).find((tk) => live(tk) && owns(tk));
    if (owner) return owner;
    return live(cur) && cur.status !== 'new' ? cur : null;
  }

  // ---------- PPE va xavfsizlik ----------

  wearPPE() {
    const s = this.state;
    if (s.player.ppe) return false;
    this.advance(this.cfg.clock.ppeMinutes);
    s.player.ppe = true;
    this.tutorialAdvance('ppe');
    this.emit('change');
    return true;
  }

  _penalize(task, sev, text) {
    const points = this.cfg.scoring.safety[sev] ?? this.cfg.scoring.safety.major;
    if (task) {
      task.penalties.push({ sev, points, t: this.state.t, text });
      task.touched = true;
    }
    return points;
  }

  _accident(task, text) {
    const s = this.state;
    s.accidents++;
    if (task) {
      task.accident = true;
      task.touched = true;
      task.penalties.push({ sev: 'critical', points: this.cfg.scoring.weights.safety, t: s.t, text });
    }
    this.addLog('accident', text);
    this.emit('accident', { text, taskId: task?.id });
    if (task && !['done', 'failed'].includes(task.status)) this._failTask(task);
  }

  _failTask(task) {
    const s = this.state;
    task.status = 'failed';
    task.finishedT = s.t;
    task.score = { total: 0, accident: true, diagnosis: { value: 0, max: this.cfg.scoring.weights.diagnosis }, safety: { value: 0, max: this.cfg.scoring.weights.safety }, time: { value: 0, max: this.cfg.scoring.weights.time }, cost: { value: 0, max: this.cfg.scoring.weights.cost } };
    this._resolveFault(task, null);
    if (s.current === task.id) s.current = null;
    this.refreshPlant();
    this.emit('change');
  }

  safetyState(eqId) {
    const st = this.st(eqId);
    const done = st.safety.done.slice();
    return { done, next: nextStep(this.data.safety, done)?.id ?? null, complete: done.includes('work'), isolated: st.isolated };
  }

  safetyComplete(eqId) {
    return this.st(eqId).safety.done.includes('work');
  }

  /** Xavfsizlik qadamini bajarish */
  safetyStep(eqId, stepId) {
    const s = this.state;
    const st = this.st(eqId);
    const task = this.taskFor(eqId);
    if (this.eqLocation(eqId) !== s.player.loc) return { ok: false, error: 'wrongLocation' };
    if (task) task.touched = true;
    const done = st.safety.done;
    // PPE allaqachon kiyilgan bo'lsa — qadam tez bajariladi
    const r = tryStep(this.data.safety, done, stepId);
    if (r.already) return { ok: false, already: true };
    if (!r.ok) {
      this.advance(this.cfg.clock.safetyStepMinutes);
      if (r.severity === 'critical') {
        const why = this.t('msg.accidentStep', { why: r.why });
        this._accident(task, why);
        return { ok: false, severity: 'critical', accident: true, why };
      }
      const points = this._penalize(task, r.severity, r.why);
      return { ok: false, severity: r.severity, why: r.why, points };
    }
    done.push(stepId);
    const alreadyPpe = stepId === 'ppe' && s.player.ppe;
    this.advance(alreadyPpe ? 0.2 : this.cfg.clock.safetyStepMinutes);
    if (stepId === 'ppe') s.player.ppe = true;
    if (stepId === 'disconnect') st.isolated = true;
    this.refreshPlant();
    this.emit('change');
    return { ok: true, step: stepId, complete: stepId === 'work' };
  }

  /** Ish tugagach yoki bekor qilinganda: yerga ulashni olish, blokirovkani yechish, kuchlanish berish */
  releaseLockout(eqId, minutes = 2) {
    const st = this.st(eqId);
    if (!st.safety.done.length && !st.isolated) return false;
    st.safety.done = [];
    st.isolated = false;
    this.advance(minutes);
    this.refreshPlant();
    this.emit('change');
    return true;
  }

  // ---------- O'lchash ----------

  /** Asbob bilan o'lchash. Qaytaradi {ok, entry, ...} yoki {ok:false, error|blocked} */
  useTool(eqId, tool) {
    const s = this.state;
    const def = this.def(eqId);
    if (!def || !def.tools.includes(tool)) return { ok: false, error: 'unsupported' };
    if (s.over || s.finished) return { ok: false, error: 'over' };
    if (this.eqLocation(eqId) !== s.player.loc) return { ok: false, error: 'wrongLocation' };
    const st = this.st(eqId);
    const task = this.taskFor(eqId);
    const minutes = this.cfg.tools[tool].minutes;

    // Megger shartlari
    if (tool === 'megger') {
      const gate = meggerGate(this.world, eqId);
      if (!gate.ok) {
        if (task) task.touched = true;
        if (gate.kind === 'live') {
          this.advance(1);
          const text = this.t('msg.accidentMegger');
          this._accident(task, text);
          return { ok: false, blocked: 'live', accident: true, text };
        }
        this.advance(1);
        const text = this.t('msg.meggerUnverified');
        const points = this._penalize(task, 'serious', text);
        return { ok: false, blocked: 'unverified', text, points };
      }
    }
    if (tool === 'vibration' && !(isPowered(this.world, eqId) && !st.stalled && !st.phaseMissing)) {
      return { ok: false, blocked: 'notRotating' };
    }

    // Jonli o'lchovda PPE
    let ppeWarn = false;
    if (isLiveMeasurement(this.world, eqId, tool) && !s.player.ppe) {
      ppeWarn = true;
      if (task) task.touched = true;
      this._penalize(task, 'ppeLive', this.t('msg.ppeLive'));
    }

    this.advance(minutes);
    const key = `${eqId}:${tool}`;
    const n = (s.measCount[key] = (s.measCount[key] || 0) + 1);
    const res = measure(this.world, this.plant, eqId, tool, { n, tolerance: this.cfg.motor.noisePct * (this.state.difficulty === 'hard' ? 1.5 : 1) });
    if (!res.ok) return { ok: false, blocked: res.blocked };

    if (res.effect) {
      if (res.effect.trip) st.trip = res.effect.trip;
      if (res.effect.clearTrip && st.trip === 'magnetic') st.trip = null;
      this.refreshPlant();
    }
    const entry = { id: s.meas.length + 1, t: s.t, eq: eqId, tool, lines: res.lines, notes: res.notes || [], items: res.items || null, hidden: res.hidden || 0, task: task?.id || null, ppeWarn, n };
    s.meas.push(entry);
    this._recordUse(task, eqId, tool);
    this._tutorialHook('tool', { eqId, tool });
    this.emit('change');
    return { ok: true, entry, ppeWarn };
  }

  /** 24 soatlik trendni yuklab olish (RU dagi analizator) */
  readTrend() {
    const s = this.state;
    if (s.player.loc !== 'ru') return { ok: false, error: 'wrongLocation' };
    const task = this.taskFor('ru_mech');
    if (!s.energy.trendRead) {
      this.advance(this.cfg.tools.trend.minutes);
      s.energy.trendRead = true;
    }
    const task2 = [...Object.values(s.tasks)].find((tk) => ['active', 'diagnosed'].includes(tk.status) && ['E1', 'E2'].includes(tk.id));
    this._recordUse(task2 || task, 'plant', 'trend');
    this.emit('change');
    return { ok: true };
  }

  _recordUse(task, eqId, tool) {
    if (!task || ['done', 'failed'].includes(task.status)) return;
    const key = `${tool}@${eqId}`;
    task.used[key] = (task.used[key] || 0) + 1;
    task.touched = task.touched || false;
  }

  // ---------- Maslahat ----------

  hintState(id) {
    const tk = this.task(id);
    const def = this.taskDef(id);
    const d = this.diff;
    return { allowed: d.hintsAllowed, used: tk.hints, total: def.hints.length, cost: d.hintCost, firstFree: d.firstHintFree && tk.hints === 0 };
  }

  useHint(id) {
    const tk = this.task(id);
    const def = this.taskDef(id);
    const d = this.diff;
    if (!d.hintsAllowed) return { ok: false, error: 'noHints' };
    if (tk.hints >= def.hints.length) return { ok: false, error: 'noMore' };
    const text = def.hints[tk.hints];
    const free = d.firstHintFree && tk.hints === 0;
    tk.hints++;
    if (!free) tk.hintCost += d.hintCost;
    this.advance(this.cfg.clock.hintMinutes);
    this.emit('change');
    return { ok: true, text, free };
  }

  // ---------- Gipoteza (tashxis) ----------

  canHypothesize(id) {
    const tk = this.task(id);
    const n = Object.values(tk.used).reduce((s, x) => s + x, 0);
    return n >= this.cfg.scoring.diagnosis.minMeasurementsForHypothesis;
  }

  submitHypothesis(id, causeId) {
    const tk = this.task(id);
    const sym = this.symptom(id);
    if (tk.hypOK) return { ok: false, error: 'already' };
    if (!this.canHypothesize(id)) return { ok: false, error: 'needMeasure' };
    const chosen = sym.causes.find((c) => c.id === causeId);
    const cause = this.cause(id);
    if (!chosen) return { ok: false, error: 'unknown' };
    this.advance(1);
    if (chosen.id === cause.id) {
      tk.hypOK = true;
      tk.status = 'diagnosed';
      this._tutorialHook('hyp', { id });
      this.emit('change');
      return { ok: true, correct: true, wrong: tk.wrongHyp.length };
    }
    tk.wrongHyp.push(causeId);
    const left = this.cfg.scoring.diagnosis.maxWrong - tk.wrongHyp.length;
    let revealed = false;
    if (left <= 0) {
      tk.hypOK = true;
      tk.hypRevealed = true;
      tk.status = 'diagnosed';
      revealed = true;
    }
    this.emit('change');
    return { ok: true, correct: false, revealed, left: Math.max(0, left), signs: chosen.signs, label: chosen.label, correctLabel: revealed ? cause.label : null };
  }

  // ---------- Qo'llanma (tutorial) ----------

  tutorialInfo() {
    const tk = this.state.tasks.T0;
    if (!tk || tk.status === 'done') return null;
    const steps = this.taskDef('T0').steps;
    const idx = clamp(this.state.tutorialStep, 0, steps.length - 1);
    return { index: idx, total: steps.length, text: steps[idx].text, id: steps[idx].id };
  }

  tutorialAdvance(stepId) {
    const s = this.state;
    const steps = this.taskDef('T0')?.steps;
    if (!steps || !s.tasks.T0 || s.tasks.T0.status === 'done') return;
    const idx = steps.findIndex((x) => x.id === stepId);
    if (idx >= 0 && s.tutorialStep <= idx) {
      s.tutorialStep = Math.min(steps.length - 1, idx + 1);
      this.emit('change');
    }
  }

  _tutorialHook(kind, info) {
    if (kind === 'tool' && info.eqId === 'mech_m1' && info.tool === 'clamp') this.tutorialAdvance('tool');
  }

  noteOpen(eqId) {
    if (eqId === 'mech_m1') this.tutorialAdvance('open');
  }

  // ---------- Favqulodda chaqiruvlar ----------

  emergencyType(em) {
    return this.data.tasks.emergencies.find((e) => e.id === em.type);
  }

  activeEmergencies() {
    return this.state.emergencies.filter((e) => e.status === 'active');
  }

  _emergencyTick() {
    const s = this.state;
    for (const em of s.emergencies) {
      if (em.status === 'scheduled' && s.t >= em.at) {
        em.status = 'active';
        const ty = this.emergencyType(em);
        this.addLog('alarm', ty.message);
        if (ty.effect?.extraKW) {
          const st = this.st(ty.effect.panel);
          st.extraKW = (st.extraKW || 0) + ty.effect.extraKW;
          em.applied = ty.effect;
        }
        this.emit('emergency', { id: em.id });
      } else if (em.status === 'active' && s.t > em.deadline) {
        em.status = 'missed';
        em.score = 0;
        this._removeEmergencyEffect(em);
        const ty = this.emergencyType(em);
        s.money.loss += 8000000;
        this.addLog('alarm', this.t('msg.emMissed', { title: ty.title }));
        this.emit('change');
      } else if (em.status === 'done' && em.applied && em.applied.durationMin && s.t > em.respondedAt + em.applied.durationMin) {
        this._removeEmergencyEffect(em);
      }
    }
  }

  _removeEmergencyEffect(em) {
    if (em.applied?.extraKW) {
      const st = this.st(em.applied.panel);
      st.extraKW = Math.max(0, (st.extraKW || 0) - em.applied.extraKW);
      em.applied = null;
    }
  }

  respondEmergency(emId, optionIndex) {
    const em = this.state.emergencies.find((e) => e.id === emId);
    if (!em || em.status !== 'active') return { ok: false };
    const ty = this.emergencyType(em);
    const opt = ty.options[optionIndex];
    this.advance(ty.timeCost);
    em.status = 'done';
    em.respondedAt = this.state.t;
    em.score = opt.score;
    em.choice = optionIndex;
    if (opt.score >= 0.6) this._removeEmergencyEffect(em);
    this.refreshPlant();
    this.emit('change');
    return { ok: true, score: opt.score, explain: ty.explain, best: ty.options.findIndex((o) => o.score === 1) };
  }

  // ---------- Qaror natijasidan keyin nosozlikni hal etish ----------

  /** Nosozlik yamoqlarining vizual izlarini tozalash */
  _clearVisuals(taskId) {
    for (const st of Object.values(this.world.dyn.st)) st.visual = st.visual.filter((v) => v.tid !== taskId && v.tid !== 'burn');
  }

  // ---------- Yordamchilar ----------

  statusLabelKey(s) {
    return 'status.' + s;
  }

  profile(variant) {
    return baseProfile(this.world, this.plant, this.data.energy, variant);
  }

  clone() {
    return Game.restore(this.data, deepClone(this.state));
  }
}

Object.assign(Game.prototype, decisionMethods, reportMethods);

export { stOf, round };
