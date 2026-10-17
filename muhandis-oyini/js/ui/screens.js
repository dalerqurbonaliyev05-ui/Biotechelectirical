// Ekranlar: menyu, smena boshlanishi, xarita, joy, uskuna paneli, energiya tahlili.
import { h, clear, icon, eqIcon } from './dom.js';
import { fmtNum, fmtSom, fmtClock } from '../util.js';
import { cableAmpacity, nominalCurrent } from '../sim/electrical.js';
import { mountChart } from './charts.js';
import { beep } from './audio.js';
import * as Dialogs from './dialogs.js';
import { baseProfile } from '../sim/loadprofile.js';

// ======================= Menyu =======================

export function menuScreen(app) {
  const t = app.t;
  const wrap = h('div.menu');
  let setupOpen = false;
  const setup = h('div.setup', { hidden: true });
  const diffs = ['easy', 'normal', 'hard'];
  const state = { difficulty: app.settings.difficulty, mode: app.settings.mode, tutorial: !app.settings.tutorialDone, seed: '' };

  const radio = (name, value, label, desc, checked, onchange) =>
    h('label.opt', h('input', { type: 'radio', name, value, checked, onchange: () => onchange(value) }), h('span', h('strong', label), h('small', desc)));

  setup.append(
    h('h3', t('setup.difficulty')),
    h('div.opts', ...diffs.map((d) => radio('diff', d, t('setup.d.' + d), t('setup.d.' + d + 'Desc'), state.difficulty === d, (v) => (state.difficulty = v)))),
    h('h3', t('setup.mode')),
    h('div.opts', ...['day', 'practice'].map((m) => radio('mode', m, t('setup.m.' + m), t('setup.m.' + m + 'Desc'), state.mode === m, (v) => (state.mode = v)))),
    h('label.chk', h('input', { type: 'checkbox', checked: state.tutorial, onchange: (e) => (state.tutorial = e.target.checked) }), ' ', t('setup.tutorial')),
    h('label.seed', t('setup.seed'), ' ', h('input', { type: 'text', inputmode: 'numeric', placeholder: t('setup.seedPh'), oninput: (e) => (state.seed = e.target.value.trim()) })),
    h('button.btn.primary.big', {
      onclick: () => {
        const seed = state.seed && /^\d+$/.test(state.seed) ? Number(state.seed) : undefined;
        app.newGame({ difficulty: state.difficulty, mode: state.mode, tutorial: state.tutorial, seed });
      }
    }, icon('bolt'), t('setup.go'))
  );

  const hasSave = app.hasSave();
  wrap.append(
    h('div.hero',
      h('div.logo', icon('bolt')),
      h('h1', t('app.title')),
      h('p.tag', t('app.tagline')),
      h('p.disc', t('app.disclaimer'))
    ),
    h('div.menu-btns',
      hasSave ? h('button.btn.primary.big', { onclick: () => { if (!app.continueGame()) app.toast(t('menu.noSave'), 'warn'); } }, icon('clock'), t('menu.continue')) : null,
      h('button.btn.big', { class: hasSave ? '' : 'primary', onclick: () => {
        if (hasSave && !setupOpen && !confirm(t('menu.confirmNew'))) return;
        setupOpen = !setupOpen;
        setup.hidden = !setupOpen;
      } }, icon('bolt'), t('menu.new')),
      h('button.btn.big', { onclick: () => Dialogs.openHelp(app) }, icon('help'), t('menu.how')),
      h('button.btn.big', { onclick: () => Dialogs.openSettings(app) }, icon('menu'), t('menu.settings'))
    ),
    setup,
    h('p.foot', t('app.footer'))
  );
  return wrap;
}

// ======================= Smena boshlanishi =======================

export function briefingScreen(app) {
  const g = app.game;
  const t = app.t;
  const rows = h('div.taskrows');
  for (const id of g.state.order) {
    const def = g.taskDef(id);
    const w = g.taskWeight(id);
    rows.append(h('div.briefrow',
      h('span.code', id),
      h('div', h('strong', def.title), h('small', def.tutorial ? t('brief.tutorial') : t('brief.at', { place: g.locs[def.location].name }))),
      def.tutorial ? null : h('span.pill', { class: w >= 6 ? 'bad' : w >= 3 ? 'warn' : '' }, t('task.priority') + ': ' + (w >= 6 ? t('task.p.high') : w >= 3 ? t('task.p.mid') : t('task.p.low')))
    ));
  }
  if (g.state.tasks.T0 && g.state.current == null) g.selectTask('T0');
  return h('div.briefing',
    h('div.radio-card',
      h('div.radio-h', icon('radio'), h('strong', t('brief.from'))),
      h('p', t('brief.msg1', { name: g.cfg.plant.name, n: g.state.order.filter((x) => x !== 'T0').length })),
      h('p', t('brief.msg2')),
      rows,
      h('p.hint', t('brief.msg3')),
      h('p.disc', t('app.disclaimer'))
    ),
    h('button.btn.primary.big', { onclick: () => { beep('ok'); app.show('map'); } }, icon('bolt'), t('brief.start'))
  );
}

// ======================= Xarita =======================

let mapFocus = null;

function statusOfLoc(app, loc) {
  const g = app.game;
  const l = g.locs[loc];
  if (l.kind === 'workshop') return g.wsStatus(l.ws);
  if (l.kind === 'tp') {
    const K = Math.max(g.plant.tm.TM1.K, g.plant.tm.TM2.K);
    return K > g.cfg.limits.trMaxK ? 'bad' : K > g.cfg.limits.trOkK ? 'warn' : 'ok';
  }
  if (l.kind === 'dispatch') return g.activeEmergencies().length ? 'bad' : 'ok';
  if (l.kind === 'ru') return g.plant.total.cos < 0.85 ? 'warn' : 'ok';
  return 'ok';
}

export function mapScreen(app) {
  const g = app.game;
  const t = app.t;
  const locs = Object.values(g.locs);
  const here = g.locs[g.state.player.loc];
  mapFocus = mapFocus && g.locs[mapFocus] ? mapFocus : here.id;
  const ru = g.locs.ru;
  const svg = h('svg.map', { viewBox: '0 0 1000 640', role: 'group', 'aria-label': t('map.title') });
  svg.append(h('defs', null));
  // yo'llar
  const roads = h('g.roads');
  for (const l of locs) if (l.id !== 'ru') roads.append(h('line', { x1: ru.x, y1: ru.y, x2: l.x, y2: l.y }));
  svg.append(roads);
  const openByLoc = {};
  for (const id of g.openTasks()) {
    const def = g.taskDef(id);
    if (def.tutorial) continue;
    (openByLoc[def.location] ||= []).push(id);
  }
  const tutLoc = g.state.tasks.T0 && g.state.tasks.T0.status !== 'done' ? 'mech' : null;
  for (const l of locs) {
    const st = statusOfLoc(app, l.id);
    const grp = h('g.bld', {
      class: `${l.kind} ${st} ${mapFocus === l.id ? 'focus' : ''} ${tutLoc === l.id ? 'tut' : ''}`,
      tabindex: '0', role: 'button', 'aria-label': `${l.name}: ${t('status.' + st)}`,
      transform: `translate(${l.x - l.w / 2}, ${l.y - l.h / 2})`,
      onclick: () => { mapFocus = l.id; app.walkTo(l.id); },
      onkeydown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); app.walkTo(l.id); } },
      onfocus: () => { mapFocus = l.id; }
    },
      h('rect', { width: l.w, height: l.h, rx: 10 }),
      h('text.lbl.full', { x: l.w / 2, y: l.h / 2 - 4, 'text-anchor': 'middle' }, l.short || l.name),
      h('text.lbl.mini', { x: l.w / 2, y: l.h / 2 + 8, 'text-anchor': 'middle' }, l.mini || l.short || l.name),
      h('text.sub', { x: l.w / 2, y: l.h / 2 + 18, 'text-anchor': 'middle' }, t('map.kind.' + l.kind)),
      h('circle.dot', { cx: l.w - 16, cy: 16, r: 8 }),
      h('title', `${l.name} — ${t('status.' + st)}`)
    );
    (openByLoc[l.id] || []).slice(0, 5).forEach((id, i) => {
      grp.append(h('g.tk', { transform: `translate(${14 + i * 34}, ${l.h - 14})` }, h('rect', { x: -2, y: -13, width: 32, height: 18, rx: 4 }), h('text', { x: 14, y: 1, 'text-anchor': 'middle' }, id)));
    });
    svg.append(grp);
  }
  // o'yinchi
  const px = here.x, py = here.y + here.h / 2 + 20;
  svg.append(h('g.player', { style: { transform: `translate(${px}px, ${py}px)` } }, h('circle', { r: 11 }), h('path', { d: 'M-7 -3a7 7 0 0 1 14 0z', class: 'helmet' }), h('text', { y: 28, 'text-anchor': 'middle' }, t('map.you'))));

  const list = h('div.maplist');
  for (const l of locs) {
    const st = statusOfLoc(app, l.id);
    const mins = g.walkMinutes(g.state.player.loc, l.id);
    list.append(h('button.btn.loc', { class: 'st-' + st, onclick: () => app.walkTo(l.id) },
      h('span.dotc', { class: st }), h('strong', l.name), h('small', l.id === g.state.player.loc ? t('map.here') : t('map.walk', { m: Math.round(mins) }))));
  }
  return h('div.mapwrap',
    h('div.maphead', h('h2', t('map.title')), h('p', t('map.help'))),
    svg,
    h('div.legend', h('span', h('i.d.ok'), t('status.ok')), h('span', h('i.d.warn'), t('status.warn')), h('span', h('i.d.bad'), t('status.bad')), h('span.k', t('map.keys'))),
    list
  );
}

/** Klaviatura bilan xaritada harakat: strelkalar eng yaqin joyga */
export function mapKey(app, ev) {
  const g = app.game;
  const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
  if (!dir && ev.key !== 'Enter') return;
  if (ev.key === 'Enter') {
    if (document.activeElement && document.activeElement.classList?.contains('bld')) return; // elementning o'zi ishlaydi
    ev.preventDefault();
    app.walkTo(mapFocus || g.state.player.loc);
    return;
  }
  ev.preventDefault();
  const cur = g.locs[mapFocus || g.state.player.loc];
  let best = null, bestScore = Infinity;
  for (const l of Object.values(g.locs)) {
    if (l.id === cur.id) continue;
    const dx = l.x - cur.x, dy = l.y - cur.y;
    const along = dx * dir[0] + dy * dir[1];
    if (along <= 10) continue;
    const across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
    const score = Math.hypot(dx, dy) + across * 1.5;
    if (score < bestScore) { best = l; bestScore = score; }
  }
  if (best) {
    mapFocus = best.id;
    app.render();
    const el = app.elMain.querySelector('.bld.focus');
    el?.focus({ preventScroll: true });
  }
}

// ======================= Joy =======================

function tasksAt(app, loc) {
  const g = app.game;
  return g.openTasks().filter((id) => g.taskDef(id).location === loc);
}

export function locationScreen(app, { loc }) {
  const g = app.game;
  const t = app.t;
  const l = g.locs[loc];
  const wrap = h('div.location');
  wrap.append(
    h('div.lochead',
      h('button.btn.small', { onclick: () => app.show('map') }, icon('back'), t('loc.back')),
      h('h2', l.name),
      h('span.pill', { class: l.kind === 'workshop' ? g.wsStatus(l.ws) : 'ok' }, l.kind === 'workshop' ? t('status.' + g.wsStatus(l.ws)) : t('map.kind.' + l.kind))
    )
  );
  const here = tasksAt(app, loc);
  if (here.length && l.kind !== 'dispatch') {
    wrap.append(h('div.hereTasks', h('strong', t('loc.tasksHere')), ...here.map((id) => h('button.btn.small', { class: g.state.current === id ? 'primary' : '', onclick: () => g.selectTask(id) }, h('span.code', id), ' ', g.taskDef(id).title))));
  }
  if (l.kind === 'dispatch') wrap.append(dispatchView(app));
  else {
    if (l.kind === 'tp') wrap.append(h('p.note', t('loc.tpNote')), tpExtras(app));
    if (l.kind === 'ru') wrap.append(h('p.note', t('loc.ruNote')), ruExtras(app));
    const eqs = g.workshopEquipment(l.kind === 'workshop' ? l.id : l.id).filter((e) => e.type !== 'cable' || true);
    const order = { panel: 0, ruFeeder: 0, transformer: 0, capbank: 2, cable: 3 };
    eqs.sort((a, b) => (order[a.type] ?? 1) - (order[b.type] ?? 1));
    const grid = h('div.eqgrid');
    for (const def of eqs) grid.append(eqCard(app, def));
    wrap.append(grid);
  }
  return wrap;
}

function statusText(app, id) {
  const g = app.game;
  const st = g.status(id);
  return st;
}

function eqCard(app, def) {
  const g = app.game;
  const t = app.t;
  const st = g.status(def.id);
  const s = g.st(def.id);
  const tasks = tasksOfEq(app, def.id);
  let state = '';
  if (s.burned) state = t('eq.burned');
  else if (s.isolated) state = t('eq.isolated');
  else if (def.type === 'motor') state = s.trip ? t('eq.trip.' + s.trip) : s.phaseMissing ? t('eq.stopped') : t('eq.running');
  else if (def.type === 'welder') state = t('eq.ready');
  return h('button.eqcard', { class: st, onclick: () => app.show('equipment', { eq: def.id }) },
    h('div.eqc-i', eqIcon(def)),
    h('div.eqc-t', h('strong', def.name), h('small', state)),
    h('span.pill', { class: st === 'ok' ? 'ok' : st === 'warn' || st === 'down' ? 'warn' : st === 'off' ? '' : 'bad' }, t('status.' + st)),
    tasks.length ? h('div.eqc-tasks', ...tasks.map((tk) => h('span.code', tk.id))) : null
  );
}

function tasksOfEq(app, eqId) {
  const g = app.game;
  return g.openTasks().map((id) => g.task(id)).filter((tk) => tk.equipment === eqId || tk.related.includes(eqId));
}

function dispatchView(app) {
  const g = app.game;
  const t = app.t;
  const s = g.state;
  const log = h('div.radiolog.big');
  for (const e of s.log.slice().reverse().slice(0, 40)) {
    const c = fmtClock(e.t, g.cfg.clock.startHour);
    log.append(h('div.logrow', { class: e.kind }, h('span.logt', c.text), h('span', e.text)));
  }
  const tl = h('div.tasktable');
  for (const id of s.order) {
    const tk = s.tasks[id];
    const def = g.taskDef(id);
    tl.append(h('div.briefrow', { class: tk.status },
      h('span.code', id),
      h('div', h('strong', def.title), h('small', t('brief.at', { place: g.locs[def.location].name }))),
      h('span.pill', { class: tk.status === 'done' ? 'ok' : tk.status === 'failed' ? 'bad' : '' }, t('task.status.' + tk.status)),
      ['done', 'failed'].includes(tk.status) ? null : h('button.btn.small', { onclick: () => g.selectTask(id) }, t('task.select'))
    ));
  }
  const open = g.openTasks().filter((x) => x !== 'T0').length;
  return h('div.dispatch',
    h('div.card', h('h3', icon('radio'), t('top.radio')), log),
    h('div.card', h('h3', icon('tasks'), t('top.tasks')), tl),
    h('div.card', h('h3', t('disp.finishTitle')), h('p', open ? t('disp.finishOpen', { n: open }) : t('disp.finishAll')),
      h('button.btn.primary', { onclick: () => Dialogs.openFinishConfirm(app) }, t('disp.finish')))
  );
}

function tpExtras(app) {
  const g = app.game;
  const t = app.t;
  const e2 = g.state.tasks.E2;
  const items = [];
  const tm1 = g.plant.tm.TM1, tm2 = g.plant.tm.TM2;
  items.push(h('div.card',
    h('h3', t('tp.title')),
    h('table.tbl', h('thead', h('tr', h('th', ''), h('th', 'S, kVA'), h('th', 'K'), h('th', 'cosφ'), h('th', t('tp.feeds')))),
      h('tbody', ...[['TM-1', tm1], ['TM-2', tm2]].map(([n, x]) => h('tr', h('td', n), h('td', '—'), h('td', '—'), h('td', '—'), h('td', x.feeds.map((w) => g.data.equipment.workshops[w].short).join(', ') || '—'))))),
    h('p.note', t('tp.hidden'))
  ));
  if (e2 && ['active', 'diagnosed', 'new'].includes(e2.status)) {
    items.push(h('div.card.task', h('h3', h('span.code', 'E2'), ' ', g.taskDef('E2').title), h('p', g.taskText('E2')),
      h('div.btnrow',
        h('button.btn.small', { onclick: () => app.show('energy', {}) }, icon('bolt'), t('energy.open')),
        e2.status === 'diagnosed' ? h('button.btn.primary', { onclick: () => { g.selectTask('E2'); Dialogs.openOutage(app); } }, t('e2.plan')) : h('button.btn.primary', { onclick: () => { g.selectTask('E2'); Dialogs.openHypothesis(app, 'E2'); } }, t('eq.diagnose'))
      )));
  }
  return h('div', ...items);
}

function ruExtras(app) {
  const g = app.game;
  const t = app.t;
  const e1 = g.state.tasks.E1;
  const items = [h('div.card',
    h('h3', t('ru.energyTitle')),
    h('p', t('ru.energyNote')),
    h('button.btn.primary', { onclick: () => app.show('energy', {}) }, icon('bolt'), t('energy.open'))
  )];
  if (e1 && ['active', 'diagnosed', 'new'].includes(e1.status)) {
    items.push(h('div.card.task', h('h3', h('span.code', 'E1'), ' ', g.taskDef('E1').title), h('p', g.taskText('E1')),
      h('div.btnrow',
        e1.status === 'diagnosed'
          ? h('button.btn.primary', { onclick: () => { g.selectTask('E1'); app.show('energy', {}); } }, t('energy.proposals'))
          : h('button.btn.primary', { onclick: () => { g.selectTask('E1'); Dialogs.openHypothesis(app, 'E1'); } }, t('eq.diagnose')))));
  }
  return h('div', ...items);
}

// ======================= Uskuna paneli =======================

export function protText(app, p) {
  const t = app.t;
  const parts = [];
  if (p?.breakerIn) parts.push(t('np.breaker', { In: p.breakerIn, mag: p.magMult, trip: p.breakerIn * p.magMult }));
  if (p?.relayA) parts.push(t('np.relay', { A: p.relayA }));
  if (p?.fuseA) parts.push(t('np.fuse', { A: p.fuseA }));
  return parts.join('; ') || '—';
}

function nameplateRows(app, id) {
  const g = app.game;
  const t = app.t;
  const def = g.def(id);
  const np = g.np(id);
  const st = g.st(id);
  const row = (k, v) => [t('np.' + k), v];
  const rows = [];
  const cable = np.cable && np.cable.section ? `${np.cable.section} mm², ${np.cable.length} m (${t('np.ampacity')}: ${cableAmpacity(np.cable.section)} A)` : null;
  switch (def.type) {
    case 'motor':
      rows.push(row('P', `${fmtNum(np.P, np.P % 1 ? 1 : 0)} kW`), row('U', `${np.U} V`), row('I', `${fmtNum(nominalCurrent(np.P, np.U, np.cosphi, np.eta), 1)} A`), row('cos', fmtNum(np.cosphi, 2)),
        row('eta', `${fmtNum(np.eta * 100, 1)} % (${np.effClass})`), row('rpm', `${np.rpm} ${t('np.rpmU')}`), row('ins', np.insClass), row('maxT', `${np.maxCaseC} °C`),
        row('age', `${np.age} ${t('np.yearsU')}`), row('rewinds', String(np.rewinds)), row('prot', protText(app, np.protection)), row('starter', np.starter));
      if (cable) rows.push(row('cable', cable));
      break;
    case 'welder':
      rows.push(row('S', `${np.S} kVA`), row('U', `${np.U} V`), row('I', `${fmtNum((np.S * 1000) / np.U, 0)} A`), row('cos', fmtNum(np.cosphi, 2)), row('duty', np.duty), row('ins', np.insClass), row('maxT', `${np.maxCaseC} °C`),
        row('age', `${np.age} ${t('np.yearsU')}`), row('pair', `${st.pair} (${t('np.pairNote')})`), row('prot', protText(app, np.protection)));
      if (cable) rows.push(row('cable', cable));
      break;
    case 'panel':
      rows.push(row('U', `${np.U} V`), row('prot', protText(app, np.protection)));
      if (cable) rows.push(row('feeder', cable));
      rows.push(row('age', `${np.age} ${t('np.yearsU')}`));
      break;
    case 'cable':
      rows.push(row('U', `${np.U} V`), row('ins', np.insClass), row('maxT', `${np.maxCaseC} °C`), row('prot', protText(app, np.protection)));
      if (cable) rows.push(row('cable', cable));
      break;
    case 'capbank':
      rows.push(row('bank', `${np.stages} × ${np.kvarStage} kvar = ${np.stages * np.kvarStage} kvar`), row('U', `${np.U} V`), row('age', `${np.age} ${t('np.yearsU')}`), row('prot', protText(app, np.protection)));
      break;
    case 'transformer':
      rows.push(row('S', `${np.S} kVA`), row('hvlv', `${np.Uhv} / ${np.Ulv} kV`), row('uk', `${np.uk} %`), row('group', np.group), row('age', `${np.age} ${t('np.yearsU')}`), row('maxT', `${np.maxCaseC} °C (${t('np.oil')})`));
      break;
    default:
      rows.push(row('prot', protText(app, np.protection)));
  }
  return rows;
}

const TOOL_ORDER = ['clamp', 'clampStart', 'multimeter', 'megger', 'thermal', 'vibration', 'visual', 'analyzer'];

export function renderEntry(app, m) {
  const t = app.t;
  const g = app.game;
  const colors = g.diff.statusColors;
  const c = fmtClock(m.t, g.cfg.clock.startHour);
  const body = h('div.entry-b');
  if (m.items) {
    const ul = h('ul.visual');
    for (const it of m.items) ul.append(h('li', { class: it.deep ? 'deep' : '' }, it.text ? it.text : t(it.key, it.vars ? weldVars(it.vars) : undefined)));
    if (m.hidden) ul.append(h('li.locked', icon('lock'), ' ', t('vis.hidden', { n: m.hidden })));
    body.append(ul);
  } else {
    for (const ln of m.lines) {
      if (ln.hide) continue;
      let val;
      if (typeof ln.v === 'number') val = fmtNum(ln.v, ln.dec ?? (Math.abs(ln.v) >= 100 ? 0 : Math.abs(ln.v) >= 10 ? 1 : 2));
      else if (ln.k === 'freq') val = t('freq.' + ln.v);
      else val = ln.v;
      body.append(h('div.ml', { class: colors && ln.st ? ln.st : '' }, h('span.k', t('meas.' + ln.k)), h('span.v', val + (ln.u ? ' ' + ln.u : ''))));
    }
  }
  for (const n of m.notes || []) body.append(h('div.note', t('note.' + n)));
  return h('div.entry', h('div.entry-h', h('span.logt', c.text), ' ', h('strong', t('tool.' + m.tool + '.name')), m.task ? h('span.code', m.task) : null), body);
}

function weldVars(v) {
  return { AB: v.AB, BC: v.BC, CA: v.CA };
}

export function equipmentScreen(app, { eq }) {
  const g = app.game;
  const t = app.t;
  const def = g.def(eq);
  const st = g.st(eq);
  const status = g.status(eq);
  const here = g.eqLocation(eq) === g.state.player.loc;
  g.noteOpen(eq);
  const wrap = h('div.equipment');
  const back = () => app.show('location', { loc: g.eqLocation(eq) });
  wrap.append(h('div.lochead',
    h('button.btn.small', { onclick: back }, icon('back'), t('loc.back2')),
    h('h2', eqIcon(def), ' ', def.name),
    h('span.pill', { class: status === 'ok' ? 'ok' : status === 'warn' || status === 'down' ? 'warn' : status === 'off' ? '' : 'bad' }, t('status.' + status))
  ));
  if (!here) {
    wrap.append(h('div.alert.warn', t('eq.notHere', { place: g.locs[g.eqLocation(eq)].name }), ' ', h('button.btn.small', { onclick: () => app.walkTo(g.eqLocation(eq)) }, t('eq.goThere'))));
  }

  // holat chizig'i
  const chips = h('div.chips',
    h('span.chip', { class: g.state.player.ppe ? 'ok' : 'warn' }, icon('ppe'), g.state.player.ppe ? t('eq.ppeOn') : t('eq.ppeOff')),
    st.isolated ? h('span.chip.ok', icon('lock'), t('eq.isolated')) : h('span.chip', t('eq.live')),
    st.safety.done.includes('work') ? h('span.chip.ok', icon('check'), t('eq.permit')) : null
  );
  wrap.append(chips);

  // shildik
  const np = h('table.tbl.np', h('tbody', ...nameplateRows(app, eq).map(([k, v]) => h('tr', h('th', k), h('td', v)))));
  const wide = window.matchMedia('(min-width: 900px)').matches;
  const lim = g.diff.limitsTable ? limitsCard(app) : null;
  const left = h('div.col',
    h('details.card.npcard', { open: wide }, h('summary', t('eq.nameplate')), np),
    lim
  );

  // asboblar
  const tools = h('div.tools');
  for (const tool of TOOL_ORDER) {
    if (!def.tools.includes(tool)) continue;
    const minutes = g.cfg.tools[tool].minutes;
    tools.append(h('button.tool', { disabled: !here, onclick: () => useTool(app, eq, tool) },
      h('strong', t('tool.' + tool + '.name')), h('small', t('tool.' + tool + '.hint')), h('span.mins', icon('clock'), minutes + ' ' + t('common.min'))));
  }
  const acts = h('div.btnrow');
  if (!st.safety.done.includes('work') || st.isolated) {
    acts.append(h('button.btn', { disabled: !here, onclick: () => Dialogs.openSafety(app, eq) }, icon('lock'), t('eq.safety')));
  } else acts.append(h('button.btn', { onclick: () => Dialogs.openSafety(app, eq) }, icon('lock'), t('eq.safetyView')));
  if (!g.state.player.ppe) acts.append(h('button.btn', { disabled: !here, onclick: () => { g.wearPPE(); beep('ok'); app.toast(t('eq.ppeDone'), 'ok'); } }, icon('ppe'), t('eq.wearPpe')));
  if (st.isolated || st.safety.done.length) acts.append(h('button.btn.ghost', { disabled: !here, onclick: () => { g.releaseLockout(eq); app.toast(t('eq.released'), 'info'); } }, t('eq.release')));

  const taskBox = h('div.card.taskbox');
  const tks = tasksOfEq(app, eq);
  if (tks.length) {
    taskBox.append(h('h3', t('eq.tasksTitle')));
    for (const tk of tks) {
      const def2 = g.taskDef(tk.id);
      taskBox.append(h('div.taskline',
        h('span.code', tk.id), h('span', def2.title),
        tk.status === 'diagnosed'
          ? h('button.btn.primary.small', { onclick: () => { g.selectTask(tk.id); Dialogs.openDecision(app, tk.id); } }, t('eq.decide'))
          : h('button.btn.small', { onclick: () => { g.selectTask(tk.id); Dialogs.openHypothesis(app, tk.id); } }, t('eq.diagnose'))
      ));
    }
  } else taskBox.append(h('p.note', t('eq.noTask')));

  // jurnal
  const meas = g.state.meas.filter((m) => m.eq === eq).slice().reverse();
  const log = h('div.card', h('h3', t('eq.log')), meas.length ? h('div.entries', ...meas.slice(0, 20).map((m) => renderEntry(app, m))) : h('p.note', t('eq.logEmpty')));

  const right = h('div.col', h('div.card', h('h3', t('eq.tools')), tools, h('div.hr'), acts), taskBox, log);
  wrap.append(h('div.cols', left, right));
  return wrap;
}

function limitsCard(app) {
  const t = app.t;
  const L = app.cfg.limits;
  return h('details.card.limits', h('summary', t('limits.title')),
    h('table.tbl',
      h('tbody',
        h('tr', h('th', t('limits.voltage')), h('td', t('limits.voltageV', { a: L.voltageDevWarnPct, b: L.voltageDevBadPct }))),
        h('tr', h('th', t('limits.unbalance')), h('td', `≤ ${L.unbalanceOkPct} %`)),
        h('tr', h('th', t('limits.temp')), h('td', `< ${L.caseTempWarnC} °C; ${L.caseTempWarnC}–${L.caseTempBadC} °C; > ${L.caseTempBadC} °C`)),
        h('tr', h('th', t('limits.vib')), h('td', `≤ ${L.vibGoodMms}; ${L.vibGoodMms}–${L.vibBadMms}; > ${L.vibBadMms} mm/s`)),
        h('tr', h('th', t('limits.ins')), h('td', `≥ ${L.insGoodMOhm} MΩ; ${L.insBadMOhm}–${L.insGoodMOhm} MΩ; < ${L.insBadMOhm} MΩ`)),
        h('tr', h('th', 'cosφ'), h('td', `≥ ${L.cosphiTarget}`)),
        h('tr', h('th', t('limits.trK')), h('td', `≤ ${L.trOkK}; ${L.trOkK}–${L.trMaxK}; > ${L.trMaxK}`)),
        h('tr', h('th', t('limits.current')), h('td', t('limits.currentV', { a: Math.round((L.currentRatioWarn - 1) * 100), b: Math.round((L.currentRatioBad - 1) * 100) })))
      )),
    h('p.note', t('limits.note')));
}

function useTool(app, eq, tool) {
  const g = app.game;
  const t = app.t;
  const r = g.useTool(eq, tool);
  if (r.ok) {
    beep('click');
    if (r.ppeWarn) app.toast(t('msg.ppeLive'), 'warn');
    return;
  }
  if (r.accident) return; // baxtsiz hodisa oynasi hodisa orqali ochiladi
  if (r.blocked === 'unverified') {
    beep('error');
    Dialogs.openInfo(app, t('tool.blocked.title'), r.text, 'bad');
    return;
  }
  if (r.blocked === 'notRotating') app.toast(t('tool.blocked.notRotating'), 'warn');
  else if (r.error === 'wrongLocation') app.toast(t('eq.notHere', { place: '' }), 'warn');
  else if (r.error === 'over') Dialogs.openShiftOver(app);
}

// ======================= Energiya tahlili =======================

export function energyScreen(app) {
  const g = app.game;
  const t = app.t;
  const e1 = g.state.tasks.E1;
  const e1Active = e1 && ['active', 'diagnosed', 'new'].includes(e1.status);
  const wrap = h('div.energy');
  wrap.append(h('div.lochead',
    h('button.btn.small', { onclick: () => app.show('location', { loc: g.state.player.loc === 'tp' ? 'tp' : 'ru' }) }, icon('back'), t('loc.back2')),
    h('h2', icon('bolt'), t('energy.title'))
  ));
  if (g.state.player.loc !== 'ru' && g.state.player.loc !== 'tp') {
    wrap.append(h('div.alert.warn', t('energy.goRu'), ' ', h('button.btn.small', { onclick: () => app.walkTo('ru') }, t('eq.goThere'))));
    return wrap;
  }
  if (!g.state.energy.trendRead) {
    wrap.append(h('div.card', h('p', t('energy.trendNote')), h('button.btn.primary', {
      onclick: () => {
        const r = g.readTrend();
        if (!r.ok) app.toast(t('eq.notHere', { place: g.locs.ru.name }), 'warn');
        else beep('ok');
      }
    }, icon('bolt'), t('energy.download', { m: g.cfg.tools.trend.minutes }))));
    return wrap;
  }
  const variant = e1 ? g.energyVariant('E1') : 'weld_peak';
  const selectedProps = app.energySel || (app.energySel = new Set());
  const selectedHours = app.energyHours || (app.energyHours = new Set());
  const canPick = e1Active && e1.status !== 'new' && !e1.peak;
  const data = g.data.energy;
  const zones = g.cfg.economy.tariffZones;
  const ids = [...selectedProps];
  const ev = g.previewPortfolio(e1 ? 'E1' : null, ids);
  const base = ev.base;
  const showAfter = ids.length > 0;
  const canvas = h('canvas.chart', { 'aria-label': t('energy.chartLabel') });
  const tip = h('div.charttip', t('energy.tip'));
  const series = () => [
    { key: 'total', label: t('energy.total'), values: base.total, color: '#ffb454', width: 3 },
    ...(showAfter ? [{ key: 'after', label: t('energy.after'), values: ev.profile, color: '#5ad1a0', dashed: true, width: 3 }] : []),
    ...Object.entries(base.byWs).map(([ws, vals]) => ({ key: ws, label: g.data.equipment.workshops[ws].short, values: vals, color: { mech: '#7aa2ff', weld: '#ff7a6b', pump: '#46c6d6', vent: '#b58cff' }[ws], width: 1.3 }))
  ];
  const chartOpts = () => ({ series: series(), zones, selected: [...selectedHours], peaks: e1 && e1.peak ? e1.peak.actual : [], yUnit: 'kW' });
  const chartBox = h('div.chartbox', canvas);
  const info = h('div.energy-info');
  wrap.append(h('div.card', h('h3', t('energy.chartTitle')), chartBox, h('div.legend', ...series().map((s) => h('span', h('i.d', { style: { background: s.color } }), s.label)), h('span', h('i.zone.hi'), t('energy.zoneHi')), h('span', h('i.zone.lo'), t('energy.zoneLo'))), tip, info));
  requestAnimationFrame(() => mountChart(canvas, chartOpts, {
    onHour: (hr) => {
      if (!canPick) return;
      selectedHours.has(hr) ? selectedHours.delete(hr) : selectedHours.add(hr);
      app.scheduleRender();
    }
  }));

  const cos = g.plant.total.cos;
  const bill = ev.bill0;
  const dayKwh = base.total.reduce((s, x) => s + x, 0);
  info.append(h('div.statgrid',
    h('div.stat', h('small', t('energy.peakKw')), h('strong', fmtNum(base.Pmax, 0) + ' kW')),
    h('div.stat', h('small', t('energy.dayKwh')), h('strong', fmtNum(dayKwh, 0) + ' kWh')),
    h('div.stat', h('small', 'cosφ'), h('strong', fmtNum(cos, 2))),
    h('div.stat', h('small', t('energy.bill')), h('strong', fmtSom(bill.total))),
    h('div.stat', h('small', t('energy.penalty')), h('strong', '×' + fmtNum(bill.penaltyFactor, 3))),
    showAfter ? h('div.stat.good', h('small', t('energy.saving')), h('strong', fmtSom(ev.annualSaving - ev.opex))) : null
  ));

  if (canPick) {
    wrap.append(h('div.card', h('h3', t('energy.peakTitle')), h('p', t('energy.peakNote')),
      h('div.hours', ...Array.from({ length: 24 }, (_, hr) => h('button.hourbtn', { class: selectedHours.has(hr) ? 'on' : '', onclick: () => { selectedHours.has(hr) ? selectedHours.delete(hr) : selectedHours.add(hr); app.scheduleRender(); } }, String(hr).padStart(2, '0')))),
      h('button.btn.primary', { disabled: selectedHours.size === 0, onclick: () => { g.submitPeakHours('E1', [...selectedHours]); beep('ok'); } }, t('energy.peakConfirm'))));
  } else if (e1 && e1.peak) {
    wrap.append(h('div.alert.ok', t('energy.peakResult', { pct: Math.round(e1.peak.acc * 100), hours: e1.peak.actual.map((x) => String(x).padStart(2, '0')).join(', ') })));
  }

  // takliflar
  const table = g.proposalTable();
  const budget = g.cfg.economy.e1Budget;
  const list = h('div.proposals');
  for (const p of data.proposals) {
    const row = table.find((x) => x.id === p.id);
    const on = selectedProps.has(p.id);
    list.append(h('label.prop', { class: on ? 'on' : '' },
      h('input', { type: 'checkbox', checked: on, onchange: (e) => { e.target.checked ? selectedProps.add(p.id) : selectedProps.delete(p.id); app.scheduleRender(); } }),
      h('div', h('strong', t('prop.' + p.id + '.name')), h('small', t('prop.' + p.id + '.desc')),
        h('div.propnums', h('span', t('prop.capex') + ': ' + fmtSom(row.capex)), h('span', t('prop.net') + ': ' + fmtSom(row.annualNet)), h('span', t('prop.payback') + ': ' + (isFinite(row.paybackYears) ? fmtNum(row.paybackYears, 1) + ' ' + t('prop.years') : '—'))))
    ));
  }
  const over = ev.capex > budget;
  const canSubmit = e1Active && e1 && e1.status === 'diagnosed';
  wrap.append(h('div.card', h('h3', t('energy.proposals')), e1Active ? h('p.note', t('energy.budget', { b: fmtSom(budget) })) : h('p.note', t('energy.viewOnly')), list,
    h('div.sumrow', h('span', t('prop.sumCapex') + ': ', h('strong', { class: over && e1Active ? 'badtxt' : '' }, fmtSom(ev.capex))), h('span', t('prop.sumNet') + ': ', h('strong', fmtSom(ev.annualNet))), h('span', t('prop.sumPayback') + ': ', h('strong', isFinite(ev.paybackYears) && ev.paybackYears > 0 ? fmtNum(ev.paybackYears, 1) + ' ' + t('prop.years') : '—')), h('span', t('prop.sumCos') + ': ', h('strong', fmtNum(ev.cos, 2)))),
    e1Active ? h('div.btnrow',
      e1.status === 'new' || e1.status === 'active' ? h('button.btn.primary', { onclick: () => { g.selectTask('E1'); Dialogs.openHypothesis(app, 'E1'); } }, t('eq.diagnose')) : null,
      canSubmit ? h('button.btn.primary', { disabled: over, onclick: () => Dialogs.submitPortfolio(app, ids) }, t('energy.submit')) : null) : null));
  void variant; void baseProfile; void clear; void fmtClock;
  return wrap;
}
