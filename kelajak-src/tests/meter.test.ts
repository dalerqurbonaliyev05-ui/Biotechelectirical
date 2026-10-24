// `npm test` (node --test). Node 22 TypeScript turlarini o'zi olib tashlaydi, shuning uchun build kerak emas.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adcCode,
  adcLsb,
  aliasFrequency,
  burdenVoltage,
  ctSecondary,
  dividerOut,
  energyKWh,
  isNightHour,
  loadProfile,
  powerFromSamples,
  quantize,
  sineSamples,
  sqnrDb,
  tariffCost,
} from "../lib/physics/meter.ts";
import { formatBytes, fsplAt1m, linkMarginDb, pathLossDb, qualityFromMargin, storageBytesPerYear } from "../lib/physics/comm.ts";

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);

test("CT: 100:5 va 2000:1 nisbatlari", () => {
  near(ctSecondary(100, 100, 5), 5);
  near(ctSecondary(40, 100, 5), 2);
  near(ctSecondary(30, 2000, 1), 0.015);
  assert.equal(ctSecondary(10, 0, 5), 0);
  near(burdenVoltage(0.015, 33), 0.495);
});

test("Kuchlanish bo'lgich", () => {
  near(dividerOut(230, 990_000, 10_000), 2.3);
  assert.equal(dividerOut(230, 0, 0), 0);
  assert.equal(dividerOut(230, -1, 5), 0);
});

test("ADC: LSB, kod, kvantlash, SQNR", () => {
  near(adcLsb(3.3, 12), 3.3 / 4096);
  assert.equal(adcCode(5, 3.3, 10), 1023); // chegaradan chiqdi — kesiladi
  assert.equal(adcCode(-1, 3.3, 10), 0);
  const v = 1.2345;
  assert.ok(Math.abs(quantize(v, 3.3, 12) - v) <= adcLsb(3.3, 12) / 2 + 1e-12);
  near(sqnrDb(12), 74, 0.01);
  assert.equal(adcLsb(3.3, 0), 0);
});

test("Aliasing", () => {
  assert.equal(aliasFrequency(50, 1000), 50);
  assert.equal(aliasFrequency(50, 60), 10);
  assert.equal(aliasFrequency(50, 50), 0);
  assert.equal(aliasFrequency(50, 0), 0);
});

test("P, Q, S, cosφ: aktiv, induktiv, sig'imli", () => {
  const r = sineSamples(230, 10, 0, 400);
  const pr = powerFromSamples(r.u, r.i);
  near(pr.urms, 230, 1e-6);
  near(pr.irms, 10, 1e-6);
  near(pr.p, 2300, 1e-6);
  near(pr.q, 0, 1e-3);
  near(pr.pf, 1, 1e-9);

  const lw = sineSamples(230, 10, 60, 400);
  const l = powerFromSamples(lw.u, lw.i, 1);
  near(l.pf, 0.5, 1e-9);
  near(l.p, 1150, 1e-6);
  near(l.s, 2300, 1e-6);
  near(l.q, 2300 * Math.sin(Math.PI / 3), 1e-6);

  const c = sineSamples(230, 10, -30, 400);
  const cr = powerFromSamples(c.u, c.i, -1);
  near(cr.pf, Math.cos(Math.PI / 6), 1e-9);
  assert.ok(cr.q < 0);

  const empty = powerFromSamples([], []);
  assert.equal(empty.pf, 0);
});

test("3-garmonika Irms ni o'zgartirmaydi, lekin cosφ ni kamaytiradi", () => {
  const h = sineSamples(230, 10, 0, 600, 0.5);
  const pr = powerFromSamples(h.u, h.i);
  near(pr.irms, 10, 1e-6);
  assert.ok(pr.pf < 0.95);
});

test("Energiya va tarif", () => {
  near(energyKWh(1000, 3600), 1);
  assert.equal(isNightHour(23, 23, 7), true);
  assert.equal(isNightHour(6, 23, 7), true);
  assert.equal(isNightHour(7, 23, 7), false);
  assert.equal(isNightHour(12, 0, 0), false);
  const hourly = new Array(24).fill(1);
  const one = tariffCost(hourly, 1000, 500, false);
  near(one.cost, 24_000);
  const two = tariffCost(hourly, 1000, 500, true, 23, 7);
  near(two.nightKWh, 8);
  near(two.cost, 16 * 1000 + 8 * 500);
});

test("Yuklama profili", () => {
  const prof = loadProfile([{ id: "a", name: "choynak", power: 2000, count: 1, hours: 0.5, start: 7, duty: 1 }]);
  near(prof[7], 1000);
  near(prof.reduce((s, v) => s + v, 0), 1000);
  const wrap = loadProfile([{ id: "b", name: "x", power: 100, count: 2, hours: 3, start: 23, duty: 0.5 }]);
  near(wrap[23], 100);
  near(wrap[0], 100);
  near(wrap[1], 100);
});

test("Radio modeli va ma'lumotlar hajmi", () => {
  near(fsplAt1m(2400), 40.05, 0.01);
  near(pathLossDb(10, 2400, 2), 60.05, 0.01);
  near(linkMarginDb(20, -80, 60), 40);
  assert.equal(qualityFromMargin(25), "alo");
  assert.equal(qualityFromMargin(-1), "yoq");
  near(storageBytesPerYear(1, 1, 1), 31_536_000);
  assert.equal(storageBytesPerYear(0, 1, 1), 0);
  assert.equal(formatBytes(1536), "1,5 KB");
});
