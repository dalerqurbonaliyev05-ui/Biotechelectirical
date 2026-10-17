// Smena yakuni: umumiy ball, daraja, xatolar tahlili, yutuqlar. Game.prototype ga qo'shiladi (this = Game).
import { clamp, round } from '../util.js';
import { rankOf, priorityAgreement } from '../sim/scoring.js';

const ACHIEVEMENTS = [
  { id: 'no_extra', test: (c) => c.done.length >= 3 && c.done.every((x) => x.tk.score.extras === 0) },
  { id: 'safety_100', test: (c) => c.safe.length >= 3 && c.safe.every((x) => x.tk.penalties.length === 0) },
  { id: 'cheapest', test: (c) => c.done.filter((x) => (x.tk.decision?.quality ?? 0) >= 0.99).length >= 3 },
  { id: 'no_hints', test: (c) => c.done.length >= 3 && c.done.every((x) => x.tk.hints === 0) },
  { id: 'no_accident', test: (c) => c.done.length >= 3 && c.accidents === 0 },
  { id: 'fast', test: (c) => c.done.filter((x) => x.tk.score.time.frac >= 0.999).length >= 3 },
  { id: 'no_burn', test: (c) => c.done.length >= 4 && c.done.every((x) => !x.tk.burned) },
  { id: 'first_try', test: (c) => c.done.filter((x) => x.tk.wrongHyp.length === 0 && !x.tk.hypRevealed).length >= 4 },
  { id: 'energy_pro', test: (c) => c.done.some((x) => x.id === 'E1' && (x.tk.decision?.quality ?? 0) >= 0.9) },
  { id: 'all_done', test: (c) => c.all && c.done.length === c.total }
];

export const reportMethods = {
  /** Smenani yakunlash va natijani hisoblash */
  finishShift() {
    const s = this.state;
    if (s.finished && s.result) return s.result;
    const cfg = this.cfg;
    const ids = s.order.filter((id) => id !== 'T0');
    const items = ids.map((id) => {
      const tk = s.tasks[id];
      return { id, tk, w: this.taskWeight(id), total: tk.score?.total ?? 0, done: tk.status === 'done', failed: tk.status === 'failed' };
    });
    const sumW = items.reduce((x, i) => x + i.w, 0) || 1;
    const weighted = items.reduce((x, i) => x + i.w * i.total, 0) / sumW;

    const done = items.filter((i) => i.done);
    const cats = {};
    for (const k of ['diagnosis', 'safety', 'time', 'cost']) {
      const list = done.filter((i) => k !== 'safety' || i.tk.score.safetyApplicable);
      const val = list.reduce((x, i) => x + i.tk.score[k].value, 0);
      const max = list.reduce((x, i) => x + i.tk.score[k].max, 0);
      cats[k] = { value: val, max, pct: max ? (val / max) * 100 : null };
    }

    const order = s.doneOrder.filter((id) => id !== 'T0');
    const pa = priorityAgreement(order, (id) => this.taskWeight(id));
    const bonus = pa == null ? 0 : cfg.scoring.shift.priorityBonusMax * pa;

    const em = s.emergencies;
    const emMissed = em.filter((e) => e.status === 'missed' || e.status === 'active' || e.status === 'scheduled' && s.t > e.at).length;
    const emWrong = em.filter((e) => e.status === 'done' && e.score < 0.6).length;
    const emPenalty = emMissed * cfg.scoring.shift.emergencyMissed + emWrong * cfg.scoring.shift.emergencyWrong;
    const accPenalty = s.accidents * cfg.scoring.shift.accidentPenalty;

    const total = round(clamp(weighted + bonus - emPenalty - accPenalty, 0, 100), 1);
    const rank = rankOf(total, cfg);

    const mistakes = this._mistakes(items);
    const ctx = {
      done, accidents: s.accidents, total: ids.length, all: s.mode === 'practice' || true,
      safe: done.filter((i) => i.tk.score.safetyApplicable)
    };
    const achievements = ACHIEVEMENTS.filter((a) => a.test(ctx)).map((a) => a.id);

    s.result = {
      total, rank, weighted: round(weighted, 1), bonus: round(bonus, 1), emPenalty, accPenalty,
      cats,
      tasks: items.map((i) => ({ id: i.id, title: this.taskDef(i.id).title, status: i.tk.status, total: i.total, w: i.w, minutes: round(i.tk.minutes, 0), burned: i.tk.burned, score: i.tk.score ? { diagnosis: i.tk.score.diagnosis.value, safety: i.tk.score.safetyApplicable ? i.tk.score.safety.value : null, time: i.tk.score.time.value, cost: i.tk.score.cost.value } : null })),
      mistakes, achievements,
      priority: pa,
      emergencies: em.map((e) => ({ id: e.id, type: e.type, status: e.status, score: e.score })),
      money: { loss: s.money.loss, spent: s.money.spent },
      accidents: s.accidents,
      day: Math.floor(s.t / 540) + 1, t: s.t
    };
    s.finished = true;
    this.emit('finished');
    return s.result;
  },

  _mistakes(items) {
    const out = [];
    const push = (taskId, kind, text, tip) => out.push({ taskId, kind, text, tip });
    for (const i of items) {
      const tk = i.tk;
      const sym = this.symptom(i.id);
      const def = this.taskDef(i.id);
      if (tk.status === 'new' || tk.status === 'active' || tk.status === 'diagnosed') {
        push(i.id, 'unfinished', this.t('rep.unfinished', { title: def.title }), this.t('rep.unfinishedTip'));
        continue;
      }
      for (const w of tk.wrongHyp) {
        const c = sym.causes.find((x) => x.id === w);
        push(i.id, 'hypothesis', this.t('rep.wrongHyp', { label: c?.label ?? w }), c?.signs ? this.t('rep.signsTip', { signs: c.signs }) : '');
      }
      if (tk.extras > 0) push(i.id, 'extra', this.t('rep.extraMeas', { n: tk.extras }), this.t('rep.extraTip'));
      for (const p of tk.penalties) push(i.id, p.sev === 'critical' ? 'accident' : 'safety', p.text, this.t('rep.safetyTip'));
      if (tk.hintCost > 0) push(i.id, 'hint', this.t('rep.hint', { n: tk.hints }), '');
      if (tk.burned) push(i.id, 'burn', this.t('rep.burned'), this.t('rep.burnedTip'));
      if (tk.status === 'done' && tk.decision && tk.decision.valid === false) {
        const c = this.cause(i.id);
        const note = c.invalid?.[tk.decision.optionId] || this.t('dec.why.generic', { right: (c.fixedBy || []).map((x) => this.action(x).label).join('; ') });
        push(i.id, 'decision', this.t('rep.wrongDecision', { label: tk.decision.optionId ? (this.data.faults.actions[tk.decision.optionId]?.label ?? tk.decision.optionId) : '' }), note);
      } else if (tk.status === 'done' && tk.decision && tk.decision.quality > 0 && tk.decision.quality < 0.9) {
        push(i.id, 'cost', this.t('rep.costlier', { pct: Math.round(tk.decision.quality * 100) }), this.t('rep.costlierTip'));
      }
      if (tk.score && tk.score.time.frac < 0.7) push(i.id, 'time', this.t('rep.slow', { min: Math.round(tk.minutes), budget: Math.round(this.budgetOf(i.id)) }), '');
    }
    return out;
  }
};
