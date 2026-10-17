// Simulyatsiya modullari testlari: tok formulasi, issiqlik modeli, transformator, iqtisod, xavfsizlik, ball.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTestData } from './helpers/load.mjs';
import * as El from '../js/sim/electrical.js';
import * as Th from '../js/sim/thermal.js';
import * as Lim from '../js/sim/limits.js';
import * as Eco from '../js/sim/economics.js';
import * as Sc from '../js/sim/scoring.js';
import { tryStep } from '../js/sim/safety.js';
import { createWorld, getNp, nomCurrentOf } from '../js/sim/world.js';
import { computePlant, settleTemps, stepWorld } from '../js/sim/plant.js';
import { baseProfile, evaluatePortfolio, outageCheck, minimalOutagePlan } from '../js/sim/loadprofile.js';

const data = await loadTestData();
const cfg = data.config;
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b} ± ${tol}`);

test('nominal tok formulasi: 55 kW, 380 V, cosφ 0,89, η 0,92 → ≈ 102 A', () => {
  const I = El.nominalCurrent(55, 380, 0.89, 0.92);
  near(I, 102, 0.5);
});

test('qisman yuklamali dvigatel: L=1 da tok aniq nominalga teng, L=1,25 da ≈ +25 %', () => {
  const np = { P: 55, cosphi: 0.89, eta: 0.92 };
  const In = El.nominalCurrent(55, 380, 0.89, 0.92);
  const pq1 = El.motorPQ(np, 1, cfg.motor);
  near(El.currentFromS(pq1.S, 380) / In, 1, 0.001);
  const pq125 = El.motorPQ(np, 1.25, cfg.motor);
  near(El.currentFromS(pq125.S, 380) / In, 1.25, 0.04);
  // past yuklamada cosφ pasayadi
  const pq3 = El.motorPQ(np, 0.3, cfg.motor);
  assert.ok(pq3.P / pq3.S < pq1.P / pq1.S - 0.1);
});

test('kondensator quvvati va cosφ: Qc = P(tgφ1 − tgφ2)', () => {
  const Qc = El.capacitorQc(180, 0.62, 0.97);
  near(Qc, 180 * (El.tanOf(0.62) - El.tanOf(0.97)), 1e-9);
  const P = 180, Q = P * El.tanOf(0.62);
  near(El.cosAfterCompensation(P, Q, Qc), 0.97, 0.001);
});

test('nosimmetriklik, kabelda kuchlanish pasayishi, kabel tokka chidamliligi', () => {
  near(El.unbalancePct([210, 120, 95]), 48.2, 0.1); // misol: A=210, B=120, C=95 A → o'rtacha 141,7 A
  assert.equal(El.unbalancePct([100, 100, 100]), 0);
  const d1 = El.cableDropPct(200, 70, 50, 0.85, 380, cfg.plant);
  const d2 = El.cableDropPct(200, 70, 100, 0.85, 380, cfg.plant);
  assert.ok(d2 > d1 * 1.8 && d2 < d1 * 2.2);
  assert.ok(El.cableAmpacity(120) > El.cableAmpacity(50));
});

test('issiqlik modeli: sovitish yomonlashsa harorat oshadi, vaqt bo\'yicha eksponensial yaqinlashadi', () => {
  const base = { Irat: 0.85, I: 87, cooling: 1, vib: 1 };
  const t1 = Th.motorSteadyTemps(base, cfg.plant, cfg.thermal);
  const t2 = Th.motorSteadyTemps({ ...base, cooling: 0.42 }, cfg.plant, cfg.thermal);
  assert.ok(t1.case < 70, 'sog\'lom dvigatel < 70 °C');
  assert.ok(t2.case > 90, 'sovitish tiqilganda > 90 °C');
  const t3 = Th.motorSteadyTemps({ ...base, Irat: 1.25 }, cfg.plant, cfg.thermal);
  assert.ok(t3.case > 70 && t3.case < 90, 'ortiqcha yuklama: 70–90 °C');
  const T = Th.stepTemp(25, 100, cfg.thermal.tauMin, cfg.thermal.tauMin);
  near(T, 25 + 75 * (1 - Math.exp(-1)), 1e-9);
  assert.ok(Th.hazardRate(100, 0.001, cfg.hazard) > Th.hazardRate(60, 0.001, cfg.hazard));
});

test('chegaralar bo\'yicha sinflash (soddalashtirilgan o\'quv chegaralari)', () => {
  const L = cfg.limits;
  assert.equal(Lim.classifyVoltage(4, L), 'good');
  assert.equal(Lim.classifyVoltage(-8, L), 'warn');
  assert.equal(Lim.classifyVoltage(12, L), 'bad');
  assert.equal(Lim.classifyCaseTemp(69, L), 'good');
  assert.equal(Lim.classifyCaseTemp(80, L), 'warn');
  assert.equal(Lim.classifyCaseTemp(95, L), 'bad');
  assert.equal(Lim.classifyVibration(2.8, L), 'good');
  assert.equal(Lim.classifyVibration(5, L), 'warn');
  assert.equal(Lim.classifyVibration(7.2, L), 'bad');
  assert.equal(Lim.classifyInsulation(2, L), 'good');
  assert.equal(Lim.classifyInsulation(0.7, L), 'warn');
  assert.equal(Lim.classifyInsulation(0.2, L), 'bad');
  assert.equal(Lim.classifyUnbalance(10, L), 'good');
  assert.equal(Lim.classifyUnbalance(11, L), 'bad');
  assert.equal(Lim.classifyTrK(0.7, L), 'good');
  assert.equal(Lim.classifyTrK(0.9, L), 'warn');
  assert.equal(Lim.classifyTrK(1.1, L), 'bad');
});

test('boshlang\'ich zavod yuklamasi jadvaldagiga mos (120/180/75/45 kW) va transformatorlar me\'yorda', () => {
  const w = createWorld(data, 1);
  const p = settleTemps(w);
  near(p.ws.mech.P, 120, 6);
  near(p.ws.weld.P, 180, 6);
  near(p.ws.pump.P, 75, 4);
  near(p.ws.vent.P, 45, 3);
  assert.ok(p.tm.TM1.K <= 1.0 && p.tm.TM2.K <= 0.8);
  for (const ws of Object.values(p.ws)) assert.ok(ws.unbal < cfg.limits.unbalanceOkPct, 'boshlang\'ich fazalar simmetrik');
  // sog'lom dvigatellar korpusi 70 °C dan past
  for (const id of Object.keys(w.defs)) if (w.defs[id].type === 'motor') assert.ok(w.dyn.st[id].T.case < 70, id);
});

test('uskuna holati o\'zgarsa, sex yuklamasi, transformator K va cosφ qayta hisoblanadi', () => {
  const w = createWorld(data, 1);
  const p0 = settleTemps(w);
  // 3-dvigatelni ortiqcha yuklash
  w.dyn.st.mech_m3.load = 1.25;
  const p1 = computePlant(w);
  assert.ok(p1.ws.mech.P > p0.ws.mech.P + 10);
  assert.ok(p1.tm.TM1.K > p0.tm.TM1.K);
  assert.ok(p1.eq.mech_m3.Irat > 1.2);
  // kondensator regulyatori o'chirilsa cosφ pasayadi, TM-1 K oshadi
  w.dyn.st.weld_bank.controller = 'off';
  const p2 = computePlant(w);
  assert.ok(p2.ws.weld.cos < 0.7 && p2.ws.weld.cos > 0.55);
  assert.ok(p2.tm.TM1.K > p1.tm.TM1.K);
  assert.ok(p2.total.penaltyFactor > p0.total.penaltyFactor);
  // dvigatel o'chirilsa yuklama kamayadi
  w.dyn.st.mech_m3.on = false;
  const p3 = computePlant(w);
  assert.ok(p3.ws.mech.P < p1.ws.mech.P - 30);
});

test('kuchlanish: shina kuchlanishi K ga bog\'liq; sex liniyasi kabelida pasayadi', () => {
  const w = createWorld(data, 1);
  const p0 = computePlant(w);
  w.dyn.st.mech_sch.np = { cable: { section: 50, length: 160 } };
  const p1 = computePlant(w);
  assert.ok(p1.ws.mech.Usch < p0.ws.mech.Usch - 10, 'ingichka uzun kabelda kuchlanish pasayadi');
  assert.equal(Math.round(p1.ws.mech.Ubus), Math.round(p0.ws.mech.Ubus));
});

test('vaqt o\'tishi: sovitish tiqilgan dvigatel qiziydi, so\'ng kuyadi (shikast to\'planadi)', () => {
  const w = createWorld(data, 1);
  settleTemps(w);
  const st = w.dyn.st.mech_m3;
  st.cooling = 0.42;
  st.hazardPerMin = 0.0015;
  let burned = false, minutes = 0;
  while (!burned && minutes < 1200) {
    const r = stepWorld(w, 5, 1);
    minutes += 5;
    burned = r.events.some((e) => e.type === 'burn');
  }
  assert.ok(burned, 'oxir-oqibat kuyadi');
  assert.ok(st.T.case > 85);
  assert.ok(minutes > 60 && minutes < 600, `kuyish vaqti mantiqiy: ${minutes}`);
});

test('iqtisod: yillik tejash va o\'zini qoplash formulalari', () => {
  // P=55 kW, η 0,92 → 0,946, L=1, 4000 soat, 1000 so'm/kWh
  const s = Eco.annualSaving(55, 0.92, 0.946, 4000, cfg, 1);
  near(s, 55 * (1 / 0.92 - 1 / 0.946) * 4000 * 1000, 1);
  near(Eco.paybackYears(44.9e6, 16.6e6, s), (44.9e6 - 16.6e6) / s, 1e-9);
  assert.equal(Eco.paybackYears(10, 20, 100), 0);
  assert.equal(Eco.paybackYears(100, 10, 0), Infinity);
  assert.ok(Eco.etaEffective({ eta: 0.92, rewinds: 2 }, cfg) < 0.92);
});

test('iqtisod: xarajat rejimida eng arzon yaroqli variant 100 %, yaroqsizi 0 %', () => {
  const items = [
    { id: 'a', valid: true, capex: 1e6, downtimeLoss: 1e6, energyYear: 100e6 },
    { id: 'b', valid: true, capex: 40e6, downtimeLoss: 1e6, energyYear: 95e6 },
    { id: 'c', valid: false, capex: 0, downtimeLoss: 0, energyYear: 100e6 }
  ];
  const r = Eco.evaluateCostOptions(items, cfg);
  assert.equal(r.find((x) => x.id === 'a').quality, 1);
  assert.equal(r.find((x) => x.id === 'c').quality, 0);
  const b = r.find((x) => x.id === 'b');
  assert.ok(b.quality >= cfg.economy.qualityFloor && b.quality < 1);
  // Energiya farqi hisobga olinadi: 5 yilda 25 mln tejash capex farqidan kam
  assert.ok(r.find((x) => x.id === 'a').tco < b.tco);
});

test('iqtisod: foyda rejimi — foyda yo\'q bo\'lsa «hech narsa qilmaslik» eng yaxshi', () => {
  const items = [
    { id: 'noop', valid: true, isNoop: true, capex: 0, downtimeLoss: 0, annualSaving: 0 },
    { id: 'vfd', valid: true, capex: 38e6, downtimeLoss: 0, annualSaving: 5e6 }
  ];
  const r = Eco.evaluateBenefitOptions(items, cfg);
  assert.equal(r.find((x) => x.id === 'noop').quality, 1);
  assert.equal(r.find((x) => x.id === 'vfd').quality, 0);
  const items2 = [{ id: 'noop', valid: true, isNoop: true, capex: 0, downtimeLoss: 0, annualSaving: 0 }, { id: 'vfd', valid: true, capex: 38e6, downtimeLoss: 0, annualSaving: 100e6 }];
  const r2 = Eco.evaluateBenefitOptions(items2, cfg);
  assert.equal(r2.find((x) => x.id === 'vfd').quality, 1);
  assert.equal(r2.find((x) => x.id === 'noop').quality, 0);
});

test('iqtisod: nasos VFD tejashi sarf pasayganda katta, ventilyator VFD to\'liq sarfda foyda bermaydi; taymer bo\'sh soatlarni tejaydi', () => {
  const np = { P: 30, eta: 0.92 };
  assert.ok(Eco.pumpVfdSavingKw(np, 0.6, cfg) > 10);
  assert.ok(Eco.pumpVfdSavingKw(np, 1.0, cfg) < 0.5);
  const fan = { P: 18.5, eta: 0.91 };
  const full = { kind: 'fan', segments: [{ h: 6500, q: 1 }] };
  assert.equal(Eco.processAnnualSaving('vfd', fan, 0.85, full, cfg), 0);
  const night = { kind: 'fan', segments: [{ h: 3000, q: 1 }, { h: 3500, q: 0 }] };
  const timer = Eco.processAnnualSaving('timer', fan, 0.85, night, cfg);
  const vfd = Eco.processAnnualSaving('vfd', fan, 0.85, night, cfg);
  assert.ok(timer > 0 && vfd > 0 && timer >= vfd * 0.9);
  // dvigatel katalogi: noto'g'ri tezlik va kichik quvvat yaroqsiz
  const np55 = { P: 55, poles: 4 };
  const cat = Eco.replacementCatalog(np55, cfg, true);
  assert.ok(cat.some((r) => r.inStock));
  for (const r of cat) {
    const ok = Eco.checkReplacement(r, np55, 44).ok;
    if (r.poles !== 4 || r.P < 55) assert.equal(ok, false);
    else assert.equal(ok, true);
  }
});

test('xavfsizlik ketma-ketligi: tartib buzilishi va kritik holatlar', () => {
  const S = data.safety;
  assert.equal(tryStep(S, [], 'permit').ok, true);
  // PPE'siz o'chirish — kritik
  const r1 = tryStep(S, ['permit'], 'disconnect');
  assert.equal(r1.ok, false);
  assert.equal(r1.severity, 'critical');
  // tekshirmay yerga ulash — katta jarima (kritik emas)
  const done = ['permit', 'ppe', 'disconnect', 'lock'];
  const r2 = tryStep(S, done, 'ground');
  assert.equal(r2.ok, false);
  assert.notEqual(r2.severity, 'critical');
  assert.match(r2.why, /tekshir/i);
  // kuchlanishni tekshirmay ishga ruxsat — kritik
  const r3 = tryStep(S, [...done, 'ground', 'fence'], 'work');
  assert.equal(r3.severity, 'critical');
  // to'g'ri tartib
  let d = [];
  for (const s of ['permit', 'ppe', 'disconnect', 'lock', 'verify', 'ground', 'fence', 'work']) {
    assert.equal(tryStep(S, d, s).ok, true, s);
    d = [...d, s];
  }
  assert.equal(tryStep(S, d, 'work').already, true);
});

test('ball tizimi: og\'irliklar yig\'indisi 100, vaqt, daraja, prioritet', () => {
  const W = cfg.scoring.weights;
  assert.equal(W.diagnosis + W.safety + W.time + W.cost, 100);
  const diag = Sc.diagnosisScore({ wrong: 0, solved: true, decisiveTotal: 2, decisiveHit: 2, extras: 0 }, cfg);
  near(diag.value, 35, 1e-9);
  const diag2 = Sc.diagnosisScore({ wrong: 2, solved: true, decisiveTotal: 2, decisiveHit: 1, extras: 3 }, cfg);
  assert.ok(diag2.value < diag.value - 10);
  assert.equal(Sc.diagnosisScore({ wrong: 3, solved: false, decisiveTotal: 2, decisiveHit: 2, extras: 0 }, cfg).hyp, 0);
  near(Sc.safetyScore([{ points: 8 }, { points: 4 }], cfg).value, 18, 1e-9);
  assert.equal(Sc.timeScore(50, 60, cfg).value, W.time);
  assert.equal(Sc.timeScore(120, 60, cfg).value, 0);
  assert.ok(Sc.timeScore(90, 60, cfg).value > 0);
  const full = Sc.combine({ diagnosis: { value: 35 }, safety: { value: 30 }, time: { value: 15 }, cost: { value: 20 } }, true, cfg);
  assert.equal(full, 100);
  // xavfsizlik qo'llanilmasa — og'irlik taqsimlanadi
  const noSafety = Sc.combine({ diagnosis: { value: 35 }, safety: { value: 0 }, time: { value: 15 }, cost: { value: 20 } }, false, cfg);
  assert.equal(noSafety, 100);
  assert.equal(Sc.rankOf(40, cfg), 'stajyor');
  assert.equal(Sc.rankOf(60, cfg), 'elektrik');
  assert.equal(Sc.rankOf(75, cfg), 'muhandis');
  assert.equal(Sc.rankOf(90, cfg), 'katta');
  assert.equal(Sc.priorityAgreement(['a', 'b', 'c'], (x) => ({ a: 9, b: 4, c: 1 }[x])), 1);
  assert.equal(Sc.priorityAgreement(['c', 'b', 'a'], (x) => ({ a: 9, b: 4, c: 1 }[x])), 0);
});

test('energiya: sutkalik profil, jarima, takliflar va transformator ta\'miri', () => {
  const w = createWorld(data, 1);
  const p = settleTemps(w);
  const base = baseProfile(w, p, data.energy, 'weld_peak');
  assert.equal(base.total.length, 24);
  assert.ok(base.peakHours.length >= 2 && base.peakHours.every((h) => h >= 6 && h <= 17));
  const cap = evaluatePortfolio(w, p, data.energy, 'weld_peak', ['cap_bank']);
  assert.ok(cap.cos >= 0.969 && cap.annualSaving > 0 && cap.capex > 0);
  const vfd = evaluatePortfolio(w, p, data.energy, 'weld_peak', ['vfd']);
  assert.ok(vfd.annualNet > 0 && vfd.peakKw <= base.Pmax);
  const shift = evaluatePortfolio(w, p, data.energy, 'weld_peak', ['shift_load']);
  assert.ok(shift.peakKw < base.Pmax);
  const none = evaluatePortfolio(w, p, data.energy, 'weld_peak', []);
  assert.equal(none.capex, 0);
  near(none.annualSaving, 0, 1e-3);
  // E2: tungi oyna — yengil, kunduzgi — ortiqcha; kerak bo'lsa choralar K ni tushiradi
  const night = outageCheck(w, p, data.energy, 'night', []);
  const day = outageCheck(w, p, data.energy, 'day', []);
  assert.ok(night.K < 0.5 && day.K > 0.95);
  const plan = minimalOutagePlan(w, p, data.energy, 'day');
  assert.ok(plan && plan.K <= cfg.limits.trPlanK && plan.ids.length > 0);
  assert.equal(minimalOutagePlan(w, p, data.energy, 'night').ids.length, 0);
});

test('shildik ma\'lumotlari to\'liq: har bir dvigatelda P, U, I_nom, cosφ, η, tezlik, klass, harorat, yosh, o\'ralish, himoya, kabel', () => {
  const w = createWorld(data, 1);
  for (const id of Object.keys(w.defs)) {
    const d = w.defs[id];
    if (d.type !== 'motor') continue;
    const np = getNp(d, w.dyn.st[id]);
    for (const k of ['P', 'U', 'cosphi', 'eta', 'rpm', 'insClass', 'maxCaseC', 'age', 'rewinds']) assert.notEqual(np[k], undefined, `${id}.${k}`);
    assert.ok(np.protection.breakerIn && np.protection.relayA, id);
    assert.ok(np.cable.section, id);
    assert.ok(nomCurrentOf(d, w.dyn.st[id]) > 5, id);
  }
});
