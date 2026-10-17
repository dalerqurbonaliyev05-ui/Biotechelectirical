// O'yin mantig'i testlari: barcha topshiriq/sabab variantlari yechiladi, xavfsizlik, kuyish, saqlash, hisobot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTestData } from './helpers/load.mjs';
import { Game } from '../js/game/game.js';
import { playTask, doSafety } from './helpers/bot.mjs';
import { measure, TOOLS } from '../js/sim/measure.js';

const data = await loadTestData();
const mk = (opts = {}) => Game.create(data, { seed: 3, difficulty: 'normal', mode: 'practice', tutorial: false, ...opts });

test('ma\'lumotlar: 1 tutorial + 15 topshiriq, har birida maslahatlar va bir nechta yashirin sabab', () => {
  const tasks = data.tasks.tasks;
  assert.equal(tasks.filter((t) => t.tutorial).length, 1);
  assert.equal(tasks.filter((t) => !t.tutorial).length, 15);
  for (const t of tasks) {
    assert.equal(t.hints.length, 3, t.id);
    const sym = data.faults.symptoms[t.symptom];
    if (!t.tutorial) assert.ok(sym.causes.filter((c) => (c.weight ?? 1) > 0).length >= (t.id === 'P3' || t.id === 'V2' ? 2 : 3), t.id);
    for (const c of sym.causes) {
      assert.ok(c.explain !== undefined && c.signs, `${t.id}/${c.id}`);
      if ((c.weight ?? 1) > 0 && t.id !== 'T0') assert.ok(c.decisive?.length, `${t.id}/${c.id} decisive`);
    }
  }
});

test('har sexda kamida bitta «almashtirish shart emas» holati bor', () => {
  const byWs = {};
  for (const t of data.tasks.tasks) {
    if (t.tutorial || t.kind === 'energy') continue;
    const sym = data.faults.symptoms[t.symptom];
    for (const c of sym.causes) {
      const needsReplace = (c.fixedBy || []).some((a) => ['replace', 'rewind', 'replace_welder'].includes(a));
      if (!needsReplace && (sym.economy === 'cost' || sym.economy === 'benefit')) byWs[t.ws] = (byWs[t.ws] || 0) + 1;
    }
  }
  for (const ws of ['mech', 'weld', 'pump', 'vent']) assert.ok(byWs[ws] >= 1, ws);
});

test('bir xil seed — bir xil sabablar va holat; boshqa seed — boshqacha', () => {
  const a = mk({ seed: 42, mode: 'day' });
  const b = mk({ seed: 42, mode: 'day' });
  const causes = (g) => g.state.order.map((id) => g.task(id).causeId).join(',');
  assert.equal(causes(a), causes(b));
  assert.equal(a.serialize(), b.serialize());
  const seen = new Set();
  for (let s = 1; s <= 12; s++) seen.add(causes(mk({ seed: s, mode: 'day' })));
  assert.ok(seen.size > 6, 'har yangi smenada holat boshqacha');
  // qiyinlik: topshiriqlar soni
  assert.equal(Game.create(data, { seed: 1, difficulty: 'easy', tutorial: false }).state.order.length, 6);
  assert.equal(Game.create(data, { seed: 1, difficulty: 'normal', tutorial: false }).state.order.length, 8);
  assert.equal(Game.create(data, { seed: 1, difficulty: 'hard', tutorial: false }).state.order.length, 10);
  for (const d of ['easy', 'normal', 'hard']) for (const id of ['M1', 'P1', 'N1', 'V1']) assert.ok(Game.create(data, { seed: 5, difficulty: d, tutorial: false }).state.tasks[id]);
});

test('barcha topshiriq × sabab × variant: ideal o\'yinda to\'liq yechiladi (ball ≥ 99)', () => {
  let n = 0;
  for (const tdef of data.tasks.tasks) {
    const sym = data.faults.symptoms[tdef.symptom];
    for (const c of sym.causes.filter((x) => (x.weight ?? 1) > 0)) {
      const variants = c.variants?.length ? c.variants.map((_, i) => i) : [undefined];
      for (const v of variants) for (const seed of [1, 2, 3]) {
        n++;
        const g = Game.create(data, { seed, difficulty: 'normal', mode: 'practice', tutorial: false, force: { [tdef.id]: { cause: c.id, variant: v } } });
        if (tdef.id === 'T0') continue;
        playTask(g, tdef.id);
        const sc = g.task(tdef.id).score;
        assert.ok(sc.total >= 99, `${tdef.id}/${c.id}/${v}/${seed}: ${sc.total}`);
        assert.equal(g.task(tdef.id).status, 'done');
      }
    }
  }
  assert.ok(n >= 100);
});

test('tutorial: sog\'lom dvigatelni o\'lchab xulosa qilish', () => {
  const g = Game.create(data, { seed: 2, difficulty: 'easy', mode: 'day', tutorial: true });
  assert.equal(g.tutorialInfo().index, 0);
  g.goTo('mech');
  assert.equal(g.tutorialInfo().id, 'open');
  g.noteOpen('mech_m1');
  g.wearPPE();
  assert.equal(g.tutorialInfo().id, 'tool');
  g.useTool('mech_m1', 'clamp');
  assert.equal(g.tutorialInfo().id, 'log');
  g.tutorialAdvance('log');
  assert.equal(g.tutorialInfo().id, 'hyp');
  g.selectTask('T0');
  assert.equal(g.submitHypothesis('T0', 'healthy').correct, true);
  assert.ok(g.finishTutorial());
  assert.equal(g.tutorialInfo(), null);
});

test('megommetr faqat o\'chirilgan va kuchlanishi tekshirilgan dvigatelda ishlaydi', () => {
  // jonli dvigatelda — baxtsiz hodisa
  let g = mk({ force: { M1: 'insulation_fail' } });
  g.selectTask('M1');
  g.goTo('mech');
  const r = g.useTool('mech_m3', 'megger');
  assert.equal(r.ok, false);
  assert.equal(r.accident, true);
  assert.equal(g.task('M1').status, 'failed');
  assert.equal(g.state.accidents, 1);
  // o'chirilgan, lekin kuchlanish tekshirilmagan — rad etiladi va jarima
  g = mk({ force: { M1: 'insulation_fail' } });
  g.selectTask('M1');
  g.goTo('mech');
  doSafety(g, 'mech_m3', 'lock');
  const r2 = g.useTool('mech_m3', 'megger');
  assert.equal(r2.ok, false);
  assert.equal(r2.blocked, 'unverified');
  assert.ok(g.task('M1').penalties.length === 1 && g.task('M1').penalties[0].points >= 12);
  // to'g'ri tartib
  doSafety(g, 'mech_m3', 'verify');
  const r3 = g.useTool('mech_m3', 'megger');
  assert.equal(r3.ok, true);
  assert.ok(r3.entry.lines[0].v < 0.5, 'izolyatsiya buzilgan: < 0,5 MΩ');
});

test('xavfsizlik: PPE\'siz o\'chirish — baxtsiz hodisa; ketma-ketlik buzilishi — jarima; ta\'mir tugmalari faqat ruxsatdan keyin', () => {
  let g = mk({ force: { M2: 'breaker_setting' } });
  g.selectTask('M2');
  g.goTo('mech');
  g.safetyStep('mech_m2', 'permit');
  const r = g.safetyStep('mech_m2', 'disconnect');
  assert.equal(r.accident, true);
  assert.equal(g.task('M2').status, 'failed');
  assert.equal(g.task('M2').score.total, 0);
  // yerga ulash tekshirmasdan — katta jarima, qadam bajarilmaydi
  g = mk({ force: { M2: 'breaker_setting' } });
  g.selectTask('M2');
  g.goTo('mech');
  for (const s of ['permit', 'ppe', 'disconnect', 'lock']) g.safetyStep('mech_m2', s);
  const w = g.safetyStep('mech_m2', 'ground');
  assert.equal(w.ok, false);
  assert.ok(w.points >= 8);
  assert.ok(!g.st('mech_m2').safety.done.includes('ground'));
  // ta'mir (LOTO kerak) — ruxsatsiz bajarib bo'lmaydi
  g.useTool('mech_m2', 'clampStart');
  g.submitHypothesis('M2', 'breaker_setting');
  const ex = g.executeDecision('M2', { optionId: 'set_breaker' });
  assert.equal(ex.needSafety, true);
});

test('noto\'g\'ri gipoteza ball kamaytiradi; 3 ta xatodan keyin sabab ochiladi', () => {
  const g = mk({ force: { M1: 'cooling_blocked' } });
  g.selectTask('M1');
  g.goTo('mech');
  assert.equal(g.submitHypothesis('M1', 'mech_overload').error, 'needMeasure');
  g.wearPPE();
  g.useTool('mech_m3', 'thermal');
  g.useTool('mech_m3', 'visual');
  const a = g.submitHypothesis('M1', 'mech_overload');
  assert.equal(a.correct, false);
  assert.ok(a.signs.length > 5);
  assert.equal(g.submitHypothesis('M1', 'insulation_fail').correct, false);
  assert.equal(g.task('M1').wrongHyp.length, 2);
  assert.equal(g.submitHypothesis('M1', 'cooling_blocked').correct, true);
  const withWrong = (() => { g.executeDecision; return null; })();
  void withWrong;
  // 4 ta sababli topshiriq (N1): 3 ta xato — sabab ochiladi
  const h = mk({ force: { N1: 'relay_tripped' } });
  h.selectTask('N1');
  h.goTo('pump');
  h.wearPPE();
  h.useTool('pump_p2', 'multimeter');
  h.submitHypothesis('N1', 'fuse_blown');
  h.submitHypothesis('N1', 'rotor_jam');
  const rev = h.submitHypothesis('N1', 'insulation_fail_n');
  assert.equal(rev.revealed, true);
  assert.equal(h.task('N1').status, 'diagnosed');
  assert.equal(h.task('N1').hypRevealed, true);
  // ballga ta'siri
  const clean = mk({ force: { M1: 'cooling_blocked' } });
  playTask(clean, 'M1');
  const dirty = mk({ force: { M1: 'cooling_blocked' } });
  dirty.selectTask('M1');
  dirty.goTo('mech');
  dirty.wearPPE();
  dirty.useTool('mech_m3', 'thermal');
  dirty.useTool('mech_m3', 'visual');
  dirty.submitHypothesis('M1', 'mech_overload');
  dirty.submitHypothesis('M1', 'cooling_blocked');
  const ex = dirty.bestChoice('M1');
  const g2 = dirty.executeDecision('M1', { optionId: ex.optionId });
  doSafety(dirty, 'mech_m3');
  const ex2 = dirty.executeDecision('M1', { optionId: ex.optionId });
  void g2;
  assert.ok(ex2.ok);
  assert.ok(dirty.task('M1').score.diagnosis.value < clean.task('M1').score.diagnosis.value - 5);
});

test('o\'lchash: asbob uskuna joylashgan joyda ishlaydi, jonli o\'lchovda PPE\'siz jarima', () => {
  const g = mk({ force: { M1: 'mech_overload' } });
  g.selectTask('M1');
  assert.equal(g.useTool('mech_m3', 'clamp').error, 'wrongLocation');
  g.goTo('mech');
  const r = g.useTool('mech_m3', 'clamp');
  assert.equal(r.ok, true);
  assert.equal(r.ppeWarn, true);
  assert.equal(g.task('M1').penalties.length, 1);
  const ratio = r.entry.lines.find((l) => l.k === 'ratio').v;
  assert.ok(ratio > 115 && ratio < 160, `tok nominaldan ${ratio} %`);
  // vibratsiya o'chirilgan dvigatelda o'lchanmaydi
  g.wearPPE();
  doSafety(g, 'mech_m3', 'disconnect');
  assert.equal(g.useTool('mech_m3', 'vibration').blocked, 'notRotating');
});

test('nosozlik oshib boradi: vaqtida chora ko\'rilmasa dvigatel kuyadi, qaror faqat qayta o\'rash/almashtirish', () => {
  const g = mk({ force: { M1: 'cooling_blocked' }, difficulty: 'hard', mode: 'day' });
  g.selectTask('M1');
  let t = 0;
  while (!g.task('M1').burned && t < 600) { g.advance(5); t += 5; }
  assert.equal(g.task('M1').burned, true);
  assert.equal(g.st('mech_m3').burned, true);
  assert.ok(g.state.money.loss > 0);
  // diagnoz
  g.goTo('mech');
  g.wearPPE();
  g.useTool('mech_m3', 'thermal');
  g.useTool('mech_m3', 'visual');
  g.submitHypothesis('M1', 'cooling_blocked');
  const ev = g.evaluateChoice('M1', { optionId: 'clean_cooling' });
  assert.equal(ev.valid, false, 'tozalash kuygan dvigatelni tiklamaydi');
  const best = g.bestChoice('M1');
  assert.ok(['rewind', 'replace'].includes(best.optionId));
  // yo'qotish vaqt o'tishi bilan oshadi
  const l0 = g.state.money.loss;
  g.advance(60);
  assert.ok(g.state.money.loss > l0);
});

test('qaror iqtisodga bog\'liq: zaxira va yosh o\'zgarsa eng yaxshi variant o\'zgaradi (qayta o\'rash ↔ almashtirish)', () => {
  const best = {};
  for (const spare of [true, false]) {
    const g = mk({ force: { M1: 'insulation_fail' } });
    g.task('M1').spare = spare;
    const b = g.bestChoice('M1');
    best[spare] = b.optionId;
  }
  assert.equal(best.true, 'replace');
  assert.equal(best.false, 'rewind');
});

test('kerak bo\'lmagan almashtirish ishlaydi, lekin qimmat (qisman ball); sababga qaratilmagan yechim — nol', () => {
  const g = mk({ force: { M1: 'cooling_blocked' } });
  g.task('M1').spare = true;
  const cat = g.replaceCatalog('M1');
  const row = cat.find((r) => r.P === 55 && r.cls === 'IE3');
  const ev = g.evaluateChoice('M1', { optionId: 'replace', rowId: row.id });
  assert.equal(ev.chosen.valid, true);
  assert.equal(ev.chosen.wasteful, true);
  assert.ok(ev.quality > 0 && ev.quality <= 0.3);
  const bad = g.evaluateChoice('M1', { optionId: 'adjust_machine' });
  assert.equal(bad.quality, 0);
  const wrongSpeed = cat.find((r) => r.poles === 2);
  assert.equal(g.evaluateChoice('M1', { optionId: 'replace', rowId: wrongSpeed.id }).quality, 0);
  const small = cat.find((r) => r.P < 55);
  assert.equal(g.evaluateChoice('M1', { optionId: 'replace', rowId: small.id }).quality, 0);
});

test('dvigatel holati o\'zgarsa sex yuklamasi, transformator va cosφ qayta hisoblanadi (ta\'mirdan keyin)', () => {
  const g = mk({ force: { M1: 'mech_overload', P2: 'no_compensation' } });
  const before = { mech: g.plant.ws.mech.P, K: g.plant.tm.TM1.K, cos: g.plant.total.cos };
  playTask(g, 'M1');
  assert.ok(g.plant.ws.mech.P < before.mech - 10, 'yuklama kamaytirilgach sex quvvati pasaydi');
  playTask(g, 'P2');
  assert.ok(g.plant.total.cos > before.cos + 0.03, 'kondensatordan keyin cosφ oshdi');
  assert.ok(g.plant.ws.weld.cos > 0.94);
  assert.ok(g.plant.tm.TM1.K < before.K);
});

test('favqulodda chaqiruvlar: jadvalga ko\'ra paydo bo\'ladi, javob ball beradi, muddat o\'tsa jarima', () => {
  const g = mk({ mode: 'day', difficulty: 'hard' });
  assert.equal(g.state.emergencies.length, 3);
  const em = g.state.emergencies[0];
  g.advance(em.at - g.state.t + 1);
  assert.equal(em.status, 'active');
  const ty = g.emergencyType(em);
  const best = ty.options.findIndex((o) => o.score === 1);
  const r = g.respondEmergency(em.id, best);
  assert.equal(r.score, 1);
  assert.equal(em.status, 'done');
  const em2 = g.state.emergencies[1];
  g.advance(em2.deadline - g.state.t + 5);
  assert.equal(em2.status, 'missed');
});

test('saqlash: serialize → restore bir xil holat; davom ettirish ishlaydi', () => {
  const g = mk({ mode: 'day', force: { M1: 'insulation_fail' } });
  playTask(g, 'M1');
  g.advance(17);
  const json = g.serialize();
  const g2 = Game.restore(data, JSON.parse(json));
  assert.equal(g2.serialize(), json);
  assert.equal(g2.task('M1').status, 'done');
  assert.ok(Math.abs(g2.plant.total.P - g.plant.total.P) < 1e-6);
  // davom etishda simulyatsiya izchil
  g.advance(30);
  g2.advance(30);
  assert.ok(Math.abs(g2.plant.total.P - g.plant.total.P) < 1e-6);
});

test('smena yakuni: ball 0–100, daraja, 4 toifa, xatolar ro\'yxati, yutuqlar', () => {
  const g = mk({ mode: 'day', difficulty: 'easy' });
  for (const id of g.state.order) playTask(g, id);
  const r = g.finishShift();
  assert.ok(r.total >= 90 && r.total <= 100);
  assert.equal(r.rank, 'katta');
  for (const k of ['diagnosis', 'safety', 'time', 'cost']) assert.ok(r.cats[k].pct > 90, k);
  assert.ok(r.achievements.includes('all_done') && r.achievements.includes('no_accident'));
  assert.equal(r.mistakes.length, 0);
  // tasodifiy/yomon o'yin — past ball
  const bad = mk({ mode: 'day', difficulty: 'normal' });
  bad.advance(540);
  const br = bad.finishShift();
  assert.ok(br.total < 20);
  assert.equal(br.rank, 'stajyor');
  assert.ok(br.mistakes.some((m) => m.kind === 'unfinished'));
});

test('baxtsiz hodisa smena balini keskin tushiradi', () => {
  const g = mk({ mode: 'day', difficulty: 'easy' });
  const ids = g.state.order;
  for (const id of ids.slice(1)) playTask(g, id);
  const clean = Game.restore(data, JSON.parse(g.serialize())).finishShift().total;
  const g2 = mk({ mode: 'day', difficulty: 'easy' });
  for (const id of g2.state.order.slice(1)) playTask(g2, id);
  g2.state.accidents = 2;
  const withAcc = g2.finishShift().total;
  assert.ok(clean - withAcc >= 25);
});

test('maslahat tizimi: Oson — birinchi bepul, Oddiy — ball evaziga, Qiyin — yo\'q', () => {
  const e = Game.create(data, { seed: 1, difficulty: 'easy', tutorial: false });
  const r1 = e.useHint('M1');
  assert.equal(r1.free, true);
  assert.equal(e.task('M1').hintCost, 0);
  e.useHint('M1');
  assert.ok(e.task('M1').hintCost > 0);
  const n = Game.create(data, { seed: 1, difficulty: 'normal', tutorial: false });
  n.useHint('M1');
  assert.equal(n.task('M1').hintCost, n.cfg.difficulty.normal.hintCost);
  const h = Game.create(data, { seed: 1, difficulty: 'hard', tutorial: false });
  assert.equal(h.useHint('M1').ok, false);
});

test('har bir asbob va uskuna uchun o\'qishlar hisoblanadi; barcha matn kalitlari i18n da mavjud', () => {
  const dict = data.i18n;
  const has = (k) => k.split('.').reduce((o, p) => (o == null ? undefined : o[p]), dict) !== undefined;
  const missing = new Set();
  const check = (k) => { if (!has(k)) missing.add(k); };
  for (const seed of [1, 2]) {
    const g = mk({ seed });
    for (const id of Object.keys(g.world.defs)) {
      const def = g.world.defs[id];
      for (const tool of def.tools) {
        check(`tool.${tool}.name`); check(`tool.${tool}.hint`);
        const res = measure(g.world, g.plant, id, tool, { n: 1 });
        if (!res.ok) continue;
        for (const l of res.lines || []) { if (!l.hide) check(`meas.${l.k}`); if (l.k === 'freq') check(`freq.${l.v}`); }
        for (const n of res.notes || []) check(`note.${n}`);
        for (const it of res.items || []) if (it.key) check(it.key);
      }
    }
  }
  for (const s of ['ok', 'warn', 'bad', 'down', 'off']) check(`status.${s}`);
  for (const s of ['new', 'active', 'diagnosed', 'done', 'failed']) check(`task.status.${s}`);
  for (const t of TOOLS) check(`tool.${t}.name`);
  for (const a of ['no_extra', 'safety_100', 'cheapest', 'no_hints', 'no_accident', 'fast', 'no_burn', 'first_try', 'energy_pro', 'all_done']) { check(`ach.${a}.n`); check(`ach.${a}.d`); }
  for (const r of data.config.scoring.ranks) { check(`rank.${r.id}`); check(`rank.${r.id}D`); }
  for (const p of data.energy.proposals) { check(`prop.${p.id}.name`); check(`prop.${p.id}.desc`); }
  for (const m of data.energy.e2.measures) { check(`e2m.${m.id}`); check(`e2m.${m.id}D`); }
  for (const k of ['eq.trip.relay', 'eq.trip.magnetic', 'eq.trip.earth', 'map.kind.dispatch', 'map.kind.tp', 'map.kind.ru', 'map.kind.workshop', 'setup.d.easy', 'setup.d.easyDesc', 'setup.d.normalDesc', 'setup.d.hardDesc', 'setup.m.day', 'setup.m.dayDesc', 'setup.m.practice', 'setup.m.practiceDesc', 'set.text.small', 'set.text.normal', 'set.text.large', 'sf.sev.minor', 'sf.sev.major', 'sf.sev.serious', 'sf.sev.critical', 'res.verdict.ok', 'res.verdict.warn', 'res.verdict.bad', 'em.result.good', 'em.result.part', 'em.result.bad', 'task.p.high', 'task.p.mid', 'task.p.low', 'dec.why.speed', 'dec.why.power', 'dec.why.under', 'dec.why.over', 'dec.why.burned', 'dec.why.generic']) check(k);
  for (const c of ['diagnosis', 'safety', 'time', 'cost']) check(`cat.${c}`);
  for (const f of ['normal', '1x', '2x', 'bearing', 'loose']) check(`freq.${f}`);
  for (const sec of ['goal', 'flow', 'tools', 'safety', 'decision', 'score', 'keys']) { check(`help.${sec}.t`); check(`help.${sec}.p`); }
  assert.deepEqual([...missing], []);
});

test('i18n: kodda ishlatilgan barcha statik kalitlar i18n.uz.json da bor', async () => {
  const { scan } = await import('./helpers/i18nscan.mjs');
  const miss = scan().filter((x) => !x.endsWith('.'));
  assert.deepEqual(miss, []);
});

test('arxitektura: sim/ moduli DOM ga tegmaydi; matnlar kodga qattiq yozilmagan', () => {
  for (const f of ['electrical', 'thermal', 'limits', 'economics', 'scoring', 'plant', 'measure', 'world', 'safety', 'loadprofile']) {
    const src = readFileSync(new URL(`../js/sim/${f}.js`, import.meta.url), 'utf8');
    assert.ok(!/document\.|window\.|localStorage/.test(src), `${f}.js DOM ga tegmasligi kerak`);
  }
  for (const f of ['game', 'decisions', 'report', 'data']) {
    const src = readFileSync(new URL(`../js/game/${f}.js`, import.meta.url), 'utf8');
    assert.ok(!/document\.|window\./.test(src), `${f}.js DOM ga tegmasligi kerak`);
  }
});
