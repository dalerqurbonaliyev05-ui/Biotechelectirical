// Dialog oynalar: tashxis, xavfsizlik, qaror, natija, favqulodda chaqiruv, smena yakuni, yordam, sozlamalar.
import { h, clear, icon } from './dom.js';
import { fmtNum, fmtSom, fmtClock, rngFor, shuffle } from '../util.js';
import { beep } from './audio.js';
import { clearSave } from '../game/storage.js';
import { buildReportHtml, openReportWindow, downloadReport } from './reportHtml.js';
import { protText } from './screens.js';

const SEV_ICON = { minor: 'warn', major: 'warn', serious: 'warn', critical: 'cross' };

// ======================= Umumiy =======================

export function openInfo(app, title, text, kind = 'info', extra = null) {
  const m = app.openModal(
    h('div', h('div.alert', { class: kind }, text), extra, h('div.btnrow.end', h('button.btn.primary', { onclick: () => m.close() }, app.t('common.ok')))),
    { title }
  );
  return m;
}

export function openMenu(app) {
  const t = app.t;
  const g = app.game;
  const m = app.openModal(
    h('div.menulist',
      h('button.btn.big', { onclick: () => { m.close(); app.show('map'); } }, icon('bolt'), t('menu.map')),
      h('button.btn.big', { onclick: () => { m.close(); app.toggleDrawer(true); } }, icon('tasks'), t('top.tasks')),
      h('button.btn.big', { onclick: () => { m.close(); openHelp(app); } }, icon('help'), t('menu.how')),
      h('button.btn.big', { onclick: () => { m.close(); openSettings(app); } }, icon('menu'), t('menu.settings')),
      h('button.btn.big', { onclick: () => { m.close(); openFinishConfirm(app); } }, icon('check'), t('disp.finish')),
      h('button.btn.big', { onclick: () => { m.close(); app.show('menu'); } }, icon('back'), t('menu.toMain'))
    ),
    { title: t('top.menu') }
  );
  void g;
}

export function openHelp(app) {
  const t = app.t;
  const sec = (k) => h('section', h('h3', t(`help.${k}.t`)), h('p', t(`help.${k}.p`)));
  const body = h('div.help', ...['goal', 'flow', 'tools', 'safety', 'decision', 'score', 'keys'].map(sec), h('p.disc', t('app.disclaimer')));
  if (app.game?.diff.limitsTable !== false) {
    const L = app.cfg.limits;
    body.append(h('section', h('h3', t('limits.title')), h('p', `${t('limits.voltage')}: ±${L.voltageDevWarnPct} % / ±${L.voltageDevBadPct} %; ${t('limits.unbalance')}: ≤ ${L.unbalanceOkPct} %; ${t('limits.temp')}: ${L.caseTempWarnC}/${L.caseTempBadC} °C; ${t('limits.vib')}: ${L.vibGoodMms}/${L.vibBadMms} mm/s; ${t('limits.ins')}: ${L.insGoodMOhm}/${L.insBadMOhm} MΩ; cosφ ≥ ${L.cosphiTarget}; K: ${L.trOkK}/${L.trMaxK}.`), h('p.note', t('limits.note'))));
  }
  app.openModal(body, { title: t('menu.how'), wide: true });
}

export function openSettings(app) {
  const t = app.t;
  const body = h('div.settings');
  const render = () => {
    clear(body);
    body.append(
      h('label.setrow', h('span', t('set.sound')), h('input', { type: 'checkbox', checked: app.settings.sound, onchange: (e) => { app.settings.sound = e.target.checked; app.saveSettings(); beep('ok'); } })),
      h('div.setrow', h('span', t('set.textLabel')),
        h('div.seg', ...['small', 'normal', 'large'].map((s) => h('button.btn.small', { class: app.settings.textSize === s ? 'primary' : '', onclick: () => { app.settings.textSize = s; app.saveSettings(); render(); } }, t('set.text.' + s))))),
      h('p.note', t('set.note'))
    );
  };
  render();
  app.openModal(body, { title: t('menu.settings') });
}

export function openAccident(app, text) {
  const t = app.t;
  beep('accident');
  app.openModal(
    h('div.accident',
      h('div.accident-i', icon('warn')),
      h('h2', t('acc.title')),
      h('p', text),
      h('p.note', t('acc.note')),
      h('div.btnrow.end', h('button.btn.primary', { onclick: () => { app.closeAllModals(); app.show('map'); } }, t('common.continue')))
    ),
    { dismissible: false, className: 'danger' }
  );
}

// ======================= Topshiriq tavsifi va maslahat =======================

export function openBriefing(app, id) {
  const g = app.game;
  const t = app.t;
  const def = g.taskDef(id);
  const tk = g.task(id);
  const w = g.taskWeight(id);
  const body = h('div.briefing-modal',
    h('div.radio-card', h('div.radio-h', icon('radio'), h('strong', t('brief.from'))), h('p', g.taskText(id))),
    h('div.chips', h('span.chip', t('brief.at', { place: g.locs[def.location].name })),
      def.tutorial ? null : h('span.chip', t('task.priority') + ': ' + (w >= 6 ? t('task.p.high') : w >= 3 ? t('task.p.mid') : t('task.p.low'))),
      h('span.chip', t('task.budget', { m: Math.round(g.budgetOf(id)) })),
      h('span.chip', t('task.status.' + tk.status))),
    g.diff.firstHintFree && tk.hints === 0 && !def.tutorial ? h('div.alert.ok', t('task.easyHint', { hint: def.hints[0] })) : null,
    h('div.btnrow',
      ['done', 'failed'].includes(tk.status) ? null : h('button.btn.primary', { onclick: () => { g.selectTask(id); m.close(); } }, t('task.select')),
      g.diff.hintsAllowed && !def.tutorial && !['done', 'failed'].includes(tk.status) ? h('button.btn', { onclick: () => { m.close(); openHint(app, id); } }, icon('hint'), t('task.hint')) : null)
  );
  const m = app.openModal(body, { title: `${id}: ${def.title}` });
}

export function openHint(app, id) {
  const g = app.game;
  const t = app.t;
  const def = g.taskDef(id);
  const tk = g.task(id);
  const body = h('div.hintbox');
  const render = () => {
    clear(body);
    const hs = g.hintState(id);
    if (!hs.allowed) {
      body.append(h('div.alert.warn', t('hint.hard')));
      return;
    }
    if (tk.hints === 0) body.append(h('p', hs.firstFree ? t('hint.askFree') : t('hint.ask', { cost: hs.cost, m: g.cfg.clock.hintMinutes })));
    def.hints.slice(0, tk.hints).forEach((txt, i) => body.append(h('div.hintitem', h('strong', t('hint.n', { n: i + 1 })), ' ', txt)));
    if (tk.hints < def.hints.length) {
      body.append(h('button.btn.primary', { onclick: () => { const r = g.useHint(id); if (r.ok) beep('ok'); render(); } }, icon('hint'), tk.hints === 0 ? t('hint.get') : t('hint.more', { cost: hs.cost })));
    } else body.append(h('p.note', t('hint.none')));
  };
  render();
  app.openModal(body, { title: t('hint.title') });
}

// ======================= Tashxis (gipoteza) =======================

export function openHypothesis(app, id) {
  const g = app.game;
  const t = app.t;
  const tk = g.task(id);
  const def = g.taskDef(id);
  const sym = g.symptom(id);
  if (['done', 'failed'].includes(tk.status)) return;
  if (id === 'E1' && !g.state.energy.trendRead) return openInfo(app, t('hyp.title'), t('hyp.needTrend'), 'warn');
  if (id === 'E1' && !tk.peak) return openInfo(app, t('hyp.title'), t('hyp.needPeak'), 'warn');
  if (!g.canHypothesize(id)) return openInfo(app, t('hyp.title'), t('hyp.needMeasure'), 'warn');
  if (tk.hypOK) {
    if (tk.status === 'diagnosed') return afterDiagnosis(app, id);
    return;
  }
  g.selectTask(id);
  const order = shuffle(rngFor(g.state.seed, 'hyp:' + id), sym.causes.map((c) => c.id));
  let selected = null;
  const fb = h('div.fb');
  const list = h('div.hyplist');
  const evidence = h('div.evidence');
  const renderEv = () => {
    clear(evidence);
    const used = Object.keys(tk.used);
    evidence.append(h('small', t('hyp.evidence', { n: used.length })), h('div.chips', ...used.map((k) => { const [tool, eq] = k.split('@'); return h('span.chip', t('tool.' + tool + '.name') + (eq === 'plant' ? '' : ' · ' + (g.def(eq)?.name ?? eq))); })));
  };
  const submit = h('button.btn.primary', { disabled: true, onclick: () => go() }, t('hyp.confirm'));
  const renderList = () => {
    clear(list);
    for (const cid of order) {
      const c = sym.causes.find((x) => x.id === cid);
      const wrong = tk.wrongHyp.includes(cid);
      list.append(h('button.hyp', { class: `${selected === cid ? 'sel' : ''} ${wrong ? 'wrong' : ''}`, disabled: wrong, onclick: () => { selected = cid; submit.disabled = false; renderList(); } },
        h('span.rd'), h('span', c.label), wrong ? h('small', t('hyp.rejected')) : null));
    }
  };
  const go = () => {
    const r = g.submitHypothesis(id, selected);
    clear(fb);
    if (!r.ok) {
      fb.append(h('div.alert.warn', r.error === 'needMeasure' ? t('hyp.needMeasure') : t('common.error')));
      return;
    }
    if (r.correct) {
      beep('ok');
      m.close();
      if (def.tutorial) {
        const res = g.finishTutorial();
        app.settings.tutorialDone = true;
        app.saveSettings();
        openInfo(app, t('tut.doneTitle'), t('tut.done'), 'ok', h('p', res?.explain));
        return;
      }
      afterDiagnosis(app, id);
      return;
    }
    beep('error');
    renderList();
    submit.disabled = true;
    selected = null;
    fb.append(h('div.alert.bad',
      h('strong', t('hyp.wrong', { label: r.label })),
      h('p', t('hyp.signs', { signs: r.signs })),
      r.revealed ? h('p', h('strong', t('hyp.revealed', { label: r.correctLabel }))) : h('p', t('hyp.left', { n: r.left, pen: g.cfg.scoring.diagnosis.hypWrong }))
    ));
    if (r.revealed) {
      m.close();
      openInfo(app, t('hyp.title'), t('hyp.revealed', { label: r.correctLabel }), 'warn');
      app.scheduleRender();
      setTimeout(() => afterDiagnosis(app, id), 0);
    }
  };
  renderEv();
  renderList();
  const m = app.openModal(h('div.hypothesis',
    h('p.q', sym.question),
    evidence,
    list,
    fb,
    h('div.btnrow.end', h('button.btn.ghost', { onclick: () => m.close() }, t('common.cancel')), submit)
  ), { title: t('hyp.title') + ' · ' + id });
}

function afterDiagnosis(app, id) {
  const g = app.game;
  const t = app.t;
  const sym = g.symptom(id);
  if (sym.economy === 'portfolio') {
    app.show('energy', {});
    return openInfo(app, t('hyp.okTitle'), t('hyp.okE1'), 'ok');
  }
  if (sym.economy === 'plan') return openOutage(app);
  const m = app.openModal(h('div',
    h('div.alert.ok', h('strong', t('hyp.okTitle')), h('p', g.cause(id).label)),
    h('p', t('hyp.okNext')),
    h('div.btnrow.end', h('button.btn.primary', { onclick: () => { m.close(); openDecision(app, id); } }, t('eq.decide')))
  ), { title: t('hyp.title') });
}

// ======================= Xavfsizlik =======================

export function openSafety(app, eqId, { onComplete = null } = {}) {
  const g = app.game;
  const t = app.t;
  const steps = g.data.safety.steps;
  const order = shuffle(rngFor(g.state.seed, 'safety:' + eqId), steps.map((s) => s.id));
  const body = h('div.safety');
  const fb = h('div.fb');
  let m = null;
  const render = () => {
    clear(body);
    const stt = g.safetyState(eqId);
    const def = g.def(eqId);
    body.append(
      h('p', t('sf.intro', { eq: def.name })),
      h('div.sf-cols',
        h('div', h('h4', t('sf.done')), h('ol.sf-done', ...stt.done.map((id) => h('li', icon('check'), ' ', steps.find((s) => s.id === id).label))), stt.done.length === 0 ? h('p.note', t('sf.none')) : null),
        h('div', h('h4', t('sf.choose')), stt.complete ? h('div.alert.ok', t('sf.complete')) : h('div.sf-steps', ...order.filter((id) => !stt.done.includes(id)).map((id) => h('button.btn.step', { onclick: () => click(id) }, steps.find((s) => s.id === id).label))))
      ),
      fb,
      h('p.note', t('sf.disc'))
    );
    if (stt.complete) {
      body.append(h('div.btnrow.end', onComplete
        ? h('button.btn.primary', { onclick: () => { m.close(); onComplete(); } }, t('sf.toDecision'))
        : h('button.btn.primary', { onclick: () => m.close() }, t('common.close'))));
    }
  };
  const click = (id) => {
    const r = g.safetyStep(eqId, id);
    clear(fb);
    if (r.accident) {
      m?.close();
      return;
    }
    if (!r.ok && !r.already) {
      beep('error');
      fb.append(h('div.alert.bad', icon(SEV_ICON[r.severity] || 'warn'), h('div', h('strong', t('sf.wrong', { sev: t('sf.sev.' + r.severity), pts: r.points })), h('p', r.why))));
    } else if (r.ok) beep('click');
    render();
  };
  render();
  m = app.openModal(body, { title: t('sf.title'), wide: true });
  if (g.safetyState(eqId).complete && onComplete) {
    // allaqachon bajarilgan
  }
  return m;
}

// ======================= Qaror =======================

export function openDecision(app, id) {
  const g = app.game;
  const t = app.t;
  const tk = g.task(id);
  const sym = g.symptom(id);
  if (tk.status !== 'diagnosed') return;
  if (sym.economy === 'portfolio') return app.show('energy', {});
  if (sym.economy === 'plan') return openOutage(app);
  const info = g.decisionInfo(id);
  const eq = tk.equipment;
  const def = g.def(eq);
  const np = g.np(eq);
  app.pending ||= {};
  const pend = app.pending[id] || (app.pending[id] = { optionId: null, rowId: null, kvar: null, assign: null });
  const body = h('div.decision');
  let m = null;

  const facts = () => {
    const rows = [];
    if (def.type === 'motor') {
      const etaEff = np.eta - g.cfg.economy.etaLossPerRewind * (np.rewinds || 0);
      rows.push([t('dec.f.age'), `${np.age} ${t('np.yearsU')}`], [t('dec.f.rewinds'), String(np.rewinds)], [t('dec.f.eta'), `${fmtNum(etaEff * 100, 1)} % (${np.effClass})`],
        [t('dec.f.spare'), tk.spare ? t('dec.f.spareYes') : t('dec.f.spareNo', { d: g.cfg.economy.replaceLeadDays })]);
    }
    rows.push([t('dec.f.loss'), fmtSom(def.lossPerHour) + ' / ' + t('common.hour')], [t('dec.f.tariff'), fmtNum(g.cfg.economy.TARIF_SOM_KWH, 0) + ' ' + t('dec.f.tariffU')], [t('dec.f.horizon'), `${g.cfg.economy.horizonYears} ${t('np.yearsU')}`]);
    if (def.type === 'motor') rows.push([t('dec.f.hours'), `${g.data.equipment.equipment.find((e) => e.id === eq).typical.hours ?? g.cfg.economy.annualHoursDefault} ${t('dec.f.hoursU')}`]);
    return h('table.tbl.facts', h('tbody', ...rows.map(([k, v]) => h('tr', h('th', k), h('td', v)))));
  };

  const render = () => {
    clear(body);
    body.append(
      h('div.alert.ok', h('strong', t('dec.cause')), ' ', g.cause(id).label),
      tk.burned ? h('div.alert.bad', t('dec.burned')) : null,
      h('details.card.facts', { open: true }, h('summary', t('dec.facts')), facts()),
      h('h4', t('dec.choose'))
    );
    const list = h('div.options');
    for (const o of info.options) {
      const sel = pend.optionId === o.id;
      const nums = [];
      if (o.capex != null) nums.push(h('span', t('dec.cost') + ': ' + fmtSom(o.capex)));
      if (o.capexFrom != null) nums.push(h('span', t('dec.costFrom') + ': ' + fmtSom(o.capexFrom)));
      if (o.hours) nums.push(h('span', t('dec.downtime') + ': ' + (o.days ? `${o.days} ${t('common.day')}` : fmtNum(o.hours, o.hours % 1 ? 1 : 0) + ' ' + t('common.hour'))));
      if (o.downtimeLoss) nums.push(h('span', t('dec.downLoss') + ': ' + fmtSom(o.downtimeLoss)));
      if (o.annualSaving != null) nums.push(h('span.good', t('dec.saving') + ': ' + fmtSom(o.annualSaving)), h('span', t('dec.payback') + ': ' + (isFinite(o.payback) ? fmtNum(o.payback, 1) + ' ' + t('prop.years') : '—')));
      if (o.etaAfter != null) nums.push(h('span', t('dec.etaAfter') + ': ' + fmtNum(o.etaAfter * 100, 1) + ' %'));
      if (o.loto) nums.push(h('span.lotoTag', icon('lock'), t('dec.needsLoto')));
      list.append(h('button.opt-card', { class: sel ? 'sel' : '', onclick: () => { pend.optionId = o.id; render(); } }, h('span.rd'), h('div', h('strong', o.label), h('div.nums', ...nums))));
    }
    body.append(list);
    const sub = h('div.subpanel');
    if (pend.optionId === 'replace') sub.append(replacePanel());
    if (pend.optionId === 'capacitor') sub.append(capacitorPanel());
    if (pend.optionId === 'rebalance') sub.append(assignPanel());
    body.append(sub);
    const ready = pend.optionId && (pend.optionId !== 'replace' || pend.rowId) && (pend.optionId !== 'capacitor' || pend.kvar) && (pend.optionId !== 'rebalance' || pend.assign);
    body.append(h('div.btnrow.end', h('button.btn.ghost', { onclick: () => m.close() }, t('common.cancel')), h('button.btn.primary', { disabled: !ready, onclick: () => execute() }, t('dec.execute'))));
  };

  const replacePanel = () => {
    const rows = g.replaceCatalog(id);
    return h('div', h('p.note', t('dec.replaceNote', { P: np.P, rpm: np.rpm })),
      h('div.tblwrap', h('table.tbl.cat', h('thead', h('tr', ...['', 'kW', t('dec.c.rpm'), t('dec.c.class'), 'η, %', t('dec.cost'), t('dec.c.stock'), t('dec.c.save'), t('dec.c.payback')].map((x) => h('th', x)))),
        h('tbody', ...rows.map((r) => h('tr', { class: pend.rowId === r.id ? 'sel' : '', onclick: () => { pend.rowId = r.id; render(); } },
          h('td', h('span.rd')), h('td', r.P), h('td', r.rpm), h('td', r.cls), h('td', fmtNum(r.eta * 100, 1)), h('td', fmtSom(r.capex)),
          h('td', r.inStock ? t('dec.c.inStock') : t('dec.c.order', { d: r.leadDays })), h('td', fmtSom(r.annualSaving)), h('td', isFinite(r.payback) ? fmtNum(r.payback, 1) + ' ' + t('prop.years') : '—')))))),
      h('p.note', t('dec.paybackNote')));
  };

  const capacitorPanel = () => {
    const p = g._plantEnergized().ws[def.workshop];
    const steps = [];
    for (let k = g.cfg.economy.capacitor.stepKvar; k <= g.cfg.economy.capacitor.maxKvar; k += g.cfg.economy.capacitor.stepKvar) steps.push(k);
    const pv = pend.kvar ? g.previewCapacitor(pend.kvar) : null;
    return h('div',
      h('table.tbl.facts', h('tbody', h('tr', h('th', 'P'), h('td', fmtNum(p.P, 0) + ' kW')), h('tr', h('th', t('dec.cap.cosNo')), h('td', fmtNum(p.cosBefore, 2))), h('tr', h('th', t('dec.cap.cosTarget')), h('td', fmtNum(g.cfg.economy.capacitor.target, 2))))),
      h('p.note', t('dec.cap.formula')),
      h('div.stepsel', ...steps.map((k) => h('button.btn.small', { class: pend.kvar === k ? 'primary' : '', onclick: () => { pend.kvar = k; render(); } }, k + ' kvar'))),
      pv ? h('div.preview', h('span', `cosφ → ${fmtNum(pv.cos, 3)}`), h('span', `TM-1 K → ${fmtNum(pv.K, 2)}`), h('span', t('dec.cost') + ': ' + fmtSom(app.game.data.config.economy.capacitor.pricePerKvar * pend.kvar + g.cfg.economy.capacitor.install))) : null);
  };

  const assignPanel = () => {
    const wids = Object.keys(g.world.defs).filter((x) => g.world.defs[x].type === 'welder').sort();
    pend.assign ||= g.currentAssign();
    const pv = g.previewAssign(id, pend.assign);
    return h('div', h('p.note', t('dec.assign.note')),
      h('div.assign', ...wids.map((w, i) => h('label', g.def(w).name.replace('-payvand apparati', ''), h('select', { onchange: (e) => { pend.assign[i] = e.target.value; render(); } }, ...['AB', 'BC', 'CA'].map((p) => h('option', { value: p, selected: pend.assign[i] === p }, p)))))),
      h('div.preview', h('span', `A: ${fmtNum(pv.I[0], 0)} A`), h('span', `B: ${fmtNum(pv.I[1], 0)} A`), h('span', `C: ${fmtNum(pv.I[2], 0)} A`),
        h('span', { class: pv.unbal <= g.cfg.limits.unbalanceOkPct ? 'good' : 'badtxt' }, t('dec.assign.unbal') + ': ' + fmtNum(pv.unbal, 1) + ' %'), h('span', t('dec.assign.moved') + ': ' + pv.moved)));
  };

  const execute = () => {
    const choice = { optionId: pend.optionId };
    if (pend.optionId === 'replace') choice.rowId = pend.rowId;
    if (pend.optionId === 'capacitor') choice.params = { kvar: pend.kvar };
    if (pend.optionId === 'rebalance') choice.params = { assign: pend.assign };
    const r = g.executeDecision(id, choice);
    if (r.needSafety) {
      m.close();
      const eqL = r.eq;
      const go = () => {
        openSafety(app, eqL, { onComplete: () => openDecision(app, id) });
      };
      if (g.eqLocation(eqL) !== g.state.player.loc) {
        openInfo(app, t('sf.title'), t('dec.safetyFirstGo', { place: g.locs[g.eqLocation(eqL)].name }), 'warn', h('div.btnrow', h('button.btn.primary', { onclick: () => { app.closeAllModals(); app.walkTo(g.eqLocation(eqL)); } }, t('eq.goThere'))));
        return;
      }
      openInfo(app, t('sf.title'), t('dec.safetyFirst'), 'warn', h('div.btnrow', h('button.btn.primary', { onclick: () => { app.closeAllModals(); go(); } }, t('sf.start'))));
      return;
    }
    if (!r.ok) {
      app.toast(t('common.error'), 'bad');
      return;
    }
    delete app.pending[id];
    m.close();
    app.scheduleRender();
    openResult(app, r.result);
  };

  render();
  m = app.openModal(body, { title: `${t('dec.title')} · ${id}`, wide: true });
}

// ======================= Natija =======================

function bar(label, value, max, cls = '') {
  return h('div.sbar', h('span.sl', label), h('div.bar', h('i', { class: cls, style: { width: Math.max(0, (value / max) * 100) + '%' } })), h('span.sv', `${fmtNum(value, 1)} / ${max}`));
}

export function openResult(app, res) {
  const g = app.game;
  const t = app.t;
  const sc = res.score;
  const verdict = res.quality >= 0.9 ? 'ok' : res.quality > 0 ? 'warn' : 'bad';
  const body = h('div.result');
  const def = g.taskDef(res.taskId);
  body.append(
    h('div.alert', { class: verdict }, h('strong', t('res.verdict.' + verdict)), res.why ? h('p', res.why) : null, res.wasteful ? h('p', t('res.wasteful')) : null),
    h('div.scorecard',
      h('div.bigscore', h('strong', fmtNum(sc.total, 0)), h('small', t('res.of100'))),
      h('div.bars',
        bar(t('cat.diagnosis'), sc.diagnosis.value, sc.diagnosis.max),
        sc.safetyApplicable ? bar(t('cat.safety'), sc.safety.value, sc.safety.max) : h('div.sbar', h('span.sl', t('cat.safety')), h('span.note', t('res.safetyNA'))),
        bar(t('cat.time'), sc.time.value, sc.time.max),
        bar(t('cat.cost'), sc.cost.value, sc.cost.max))),
    h('div.explain', h('h4', t('res.learn')), h('p', res.explain)),
    sc.decisive?.length ? h('p.note', t('res.decisive', { list: sc.decisive.map((k) => { const [tool, eq] = k.split('@'); return t('tool.' + tool + '.name') + (eq && eq !== 'plant' ? ' (' + (g.def(eq)?.name ?? eq) + ')' : ''); }).join(', ') })) : null,
    sc.extras ? h('p.note', t('res.extras', { n: sc.extras, pts: sc.extras * g.cfg.scoring.diagnosis.extraPenalty })) : null,
    res.burned ? h('div.alert.bad', t('res.burned')) : null
  );
  if (res.candidates?.length) {
    const rows = res.candidates.filter((c) => !c.hidden || c.isBest).slice().sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0));
    const benefit = res.economy === 'benefit';
    body.append(h('h4', t('res.compare')), h('div.tblwrap', h('table.tbl.cmp',
      h('thead', h('tr', h('th', t('res.c.option')), h('th', t('dec.cost')), h('th', t('dec.downLoss')), h('th', benefit ? t('res.c.net') : t('res.c.tco')), h('th', t('res.c.fit')))),
      h('tbody', ...rows.map((c) => h('tr', { class: `${c.chosen || (res.chosen && c.id === res.chosen.id) ? 'chosen' : ''} ${c.isBest ? 'best' : ''}` },
        h('td', c.label, c.isBest ? h('span.pill.ok', t('res.best')) : null, c.id === res.chosen?.id ? h('span.pill', t('res.yours')) : null),
        h('td', fmtSom(c.capex)), h('td', fmtSom(c.downtimeLoss)),
        h('td', benefit ? fmtSom(c.net) : fmtSom(c.tco)),
        h('td', c.valid ? Math.round((c.quality ?? 0) * 100) + ' %' : t('res.c.invalid'))))))));
  }
  if (res.portfolio) {
    const P = res.portfolio;
    body.append(h('h4', t('res.portfolio')),
      h('table.tbl', h('tbody',
        h('tr', h('th', t('res.yours')), h('td', P.chosen.ids.map((x) => t('prop.' + x + '.name')).join(', ') || '—')),
        h('tr', h('th', t('prop.sumCapex')), h('td', fmtSom(P.chosen.capex) + (P.over ? ' — ' + t('res.overBudget') : ''))),
        h('tr', h('th', t('res.net5', { n: g.cfg.economy.horizonYears })), h('td', fmtSom(P.chosen.net))),
        h('tr', h('th', t('res.best')), h('td', P.best.ids.map((x) => t('prop.' + x + '.name')).join(', ') || '—')),
        h('tr', h('th', t('res.net5', { n: g.cfg.economy.horizonYears })), h('td', fmtSom(P.best.net))))));
  }
  if (res.outage) {
    const O = res.outage;
    body.append(h('h4', t('res.outage')),
      h('table.tbl', h('tbody',
        h('tr', h('th', t('res.yours')), h('td', O.ids.map((x) => t('e2m.' + x)).join(', ') || t('e2.noMeasures'))),
        h('tr', h('th', 'K'), h('td', fmtNum(O.chosen.K, 2) + ' (' + fmtNum(O.chosen.S, 0) + ' kVA)')),
        h('tr', h('th', t('dec.cost')), h('td', fmtSom(O.chosen.cost))),
        h('tr', h('th', t('res.best')), h('td', O.best ? (O.best.ids.map((x) => t('e2m.' + x)).join(', ') || t('e2.noMeasures')) + ` — K ${fmtNum(O.best.K, 2)}, ${fmtSom(O.best.cost)}` : '—')))));
  }
  const m = app.openModal(h('div', body, h('div.btnrow.end', h('button.btn.primary', { onclick: () => { m.close(); app.show('location', { loc: g.state.player.loc }); } }, t('common.continue')))), { title: `${t('res.title')} · ${res.taskId}: ${def.title}`, wide: true, dismissible: false });
  beep(verdict === 'ok' ? 'ok' : 'error');
}

// ======================= E1/E2 =======================

export function submitPortfolio(app, ids) {
  const g = app.game;
  const r = g.submitPortfolio('E1', ids);
  if (r.ok) {
    app.energySel = new Set();
    app.energyHours = new Set();
    openResult(app, r.result);
  }
}

export function openOutage(app) {
  const g = app.game;
  const t = app.t;
  const id = 'E2';
  const tk = g.task(id);
  if (tk.status !== 'diagnosed') return;
  const info = g.outageInfo(id);
  const sel = new Set();
  const body = h('div.outage');
  let m = null;
  const render = () => {
    clear(body);
    const pv = g.previewOutage(id, [...sel]);
    const L = g.cfg.limits;
    const cls = pv.K > L.trMaxK ? 'bad' : pv.K > L.trPlanK ? 'warn' : 'ok';
    body.append(
      h('p', t('e2.intro', { window: info.windowText })),
      h('div.gauge', { class: cls }, h('span', t('e2.k')), h('strong', fmtNum(pv.K, 2)), h('small', `S = ${fmtNum(pv.S, 0)} kVA (${String(pv.peakHour).padStart(2, '0')}:00), cosφ ${fmtNum(pv.cos, 2)}, TM-2: 400 kVA`)),
      h('p.note', t('e2.limit', { k: L.trPlanK })),
      h('div.proposals', ...info.measures.map((ms) => h('label.prop', { class: sel.has(ms.id) ? 'on' : '' },
        h('input', { type: 'checkbox', checked: sel.has(ms.id), onchange: (e) => { e.target.checked ? sel.add(ms.id) : sel.delete(ms.id); render(); } }),
        h('div', h('strong', t('e2m.' + ms.id)), h('small', t('e2m.' + ms.id + 'D')), h('div.propnums', h('span', t('dec.cost') + ': ' + fmtSom(ms.costSom))))))),
      h('div.btnrow.end', h('button.btn.ghost', { onclick: () => m.close() }, t('common.cancel')), h('button.btn.primary', { onclick: () => {
        const r = g.submitOutage(id, [...sel]);
        if (r.ok) { m.close(); app.scheduleRender(); openResult(app, r.result); }
      } }, t('e2.submit')))
    );
  };
  render();
  m = app.openModal(body, { title: `E2 · ${t('e2.title')}`, wide: true });
}

// ======================= Favqulodda chaqiruv =======================

export function openEmergency(app, emId) {
  const g = app.game;
  const t = app.t;
  const em = g.state.emergencies.find((e) => e.id === emId);
  if (!em || em.status !== 'active') return;
  const ty = g.emergencyType(em);
  let selected = null;
  const body = h('div.emergency');
  let m = null;
  const render = () => {
    clear(body);
    const left = Math.max(0, em.deadline - g.state.t);
    body.append(
      h('div.radio-card', h('div.radio-h', icon('radio'), h('strong', t('em.dispatcher'))), h('p', ty.message)),
      h('p.note', t('em.deadline', { m: Math.round(left), cost: ty.timeCost })),
      h('div.options', ...ty.options.map((o, i) => h('button.opt-card', { class: selected === i ? 'sel' : '', onclick: () => { selected = i; render(); } }, h('span.rd'), h('div', o.text)))),
      h('div.btnrow.end', h('button.btn.ghost', { onclick: () => m.close() }, t('em.later')), h('button.btn.primary', { disabled: selected == null, onclick: () => {
        const r = g.respondEmergency(emId, selected);
        clear(body);
        body.append(h('div.alert', { class: r.score >= 0.9 ? 'ok' : r.score >= 0.5 ? 'warn' : 'bad' }, h('strong', t('em.result.' + (r.score >= 0.9 ? 'good' : r.score >= 0.5 ? 'part' : 'bad'))), h('p', r.explain)),
          h('div.btnrow.end', h('button.btn.primary', { onclick: () => m.close() }, t('common.ok'))));
      } }, t('em.send')))
    );
  };
  render();
  m = app.openModal(body, { title: ty.title, className: 'danger' });
}

// ======================= Smena yakuni =======================

export function openFinishConfirm(app) {
  const g = app.game;
  const t = app.t;
  const open = g.openTasks().filter((x) => x !== 'T0');
  const m = app.openModal(h('div',
    h('p', open.length ? t('fin.confirmOpen', { n: open.length }) : t('fin.confirmAll')),
    h('div.btnrow.end', h('button.btn.ghost', { onclick: () => m.close() }, t('common.cancel')), h('button.btn.primary', { onclick: () => { m.close(); openShiftEnd(app); } }, t('disp.finish')))
  ), { title: t('disp.finish') });
}

export function openShiftOver(app) {
  const t = app.t;
  if (app.modals.some((x) => x.el.classList.contains('shiftover'))) return;
  const m = app.openModal(h('div', h('p', t('fin.over')), h('div.btnrow.end', h('button.btn.primary', { onclick: () => { m.close(); openShiftEnd(app); } }, t('fin.report')))), { title: t('fin.overTitle'), dismissible: false, className: 'shiftover' });
}

export function openShiftEnd(app) {
  const g = app.game;
  const t = app.t;
  const r = g.finishShift();
  clearSave();
  const shiftNo = g.state.shiftNo;
  if (shiftNo) {
    app.settings.shiftsDone = Math.max(app.settings.shiftsDone || 0, shiftNo);
    app.saveSettings();
  }
  app.closeAllModals();
  const body = h('div.shiftend');
  const cats = ['diagnosis', 'safety', 'time', 'cost'];
  const withPct = cats.filter((c) => r.cats[c].pct != null);
  const strongest = withPct.slice().sort((a, b) => r.cats[b].pct - r.cats[a].pct)[0];
  const weakest = withPct.slice().sort((a, b) => r.cats[a].pct - r.cats[b].pct)[0];
  body.append(
    shiftNo ? h('p.shiftbanner', h('strong', t('fin.shiftDone', { n: shiftNo })), ' ', t('fin.shiftNext', { next: shiftNo + 1 })) : null,
    h('div.rankbox', h('div.bigscore', h('strong', fmtNum(r.total, 0)), h('small', t('res.of100'))), h('div', h('h2', t('rank.' + r.rank)), h('p', t('rank.' + r.rank + 'D')))),
    h('div.bars', ...cats.map((c) => (r.cats[c].pct == null ? h('div.sbar', h('span.sl', t('cat.' + c)), h('span.note', '—')) : bar(t('cat.' + c) + (c === strongest ? ' ★' : c === weakest ? ' ▼' : ''), r.cats[c].value, r.cats[c].max || 1, r.cats[c].pct >= 85 ? 'ok' : r.cats[c].pct >= 60 ? 'warn' : 'bad')))),
    withPct.length ? h('p.note', t('fin.strongWeak', { s: t('cat.' + strongest), w: t('cat.' + weakest) })) : null,
    h('div.statgrid',
      h('div.stat', h('small', t('fin.weighted')), h('strong', fmtNum(r.weighted, 1))),
      h('div.stat', h('small', t('fin.priority')), h('strong', r.priority == null ? '—' : '+' + fmtNum(r.bonus, 1))),
      h('div.stat', h('small', t('fin.emerg')), h('strong', r.emPenalty ? '−' + fmtNum(r.emPenalty, 1) : '0')),
      h('div.stat', h('small', t('fin.accidents')), h('strong', r.accidents ? '−' + r.accidents * g.cfg.scoring.shift.accidentPenalty : '0')),
      h('div.stat', h('small', t('fin.loss')), h('strong', fmtSom(r.money.loss))),
      h('div.stat', h('small', t('fin.spent')), h('strong', fmtSom(r.money.spent)))
    ),
    h('h3', t('fin.tasks')),
    h('div.tblwrap', h('table.tbl', h('thead', h('tr', ...['', t('fin.task'), t('fin.status'), t('fin.min'), t('fin.score')].map((x) => h('th', x)))),
      h('tbody', ...r.tasks.map((x) => h('tr', h('td', h('span.code', x.id)), h('td', x.title), h('td', t('task.status.' + x.status)), h('td', x.minutes), h('td', x.status === 'done' || x.status === 'failed' ? fmtNum(x.total, 0) : '—')))))),
    h('h3', t('fin.mistakes')),
    r.mistakes.length ? h('ul.mistakes', ...r.mistakes.map((mm) => h('li', { class: mm.kind }, h('span.code', mm.taskId), ' ', h('strong', mm.text), mm.tip ? h('div.tip', mm.tip) : null))) : h('p.note', t('fin.noMistakes')),
    h('h3', t('fin.achievements')),
    r.achievements.length ? h('div.achs', ...r.achievements.map((a) => h('div.ach', h('strong', '🏅 ' + t('ach.' + a + '.n')), h('small', t('ach.' + a + '.d'))))) : h('p.note', t('fin.noAch')),
    h('p.disc', t('app.disclaimer')),
    h('div.btnrow',
      h('button.btn.primary', { onclick: () => openReportWindow(app, r) }, t('fin.print')),
      h('button.btn', { onclick: () => downloadReport(app, r) }, t('fin.download')),
      h('button.btn', { onclick: () => { m.close(); app.show('menu'); } }, t('fin.toMenu'))
    )
  );
  void buildReportHtml; void fmtClock; void protText;
  const m = app.openModal(body, { title: t('fin.title'), wide: true, dismissible: false });
  beep('ok');
}
