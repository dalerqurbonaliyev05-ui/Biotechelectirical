import assert from "node:assert/strict";
import { test } from "node:test";
import { cellVoltage, electrolysis, h2Density, h2Per100km, maxPowerPoint, MIRAI_LIKE, rangeKm, roadForce, solarPower, stack, steadySpeed, tankMass } from "../lib/physics/hydrogen.ts";

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);

test("Faradey qonuni: n(H₂) = I·t / 2F", () => {
  const r = electrolysis(10, 3600, 2, 1);
  near(r.mol, 0.18655, 1e-4);
  near(r.grams, 0.3761, 1e-3);
  near(r.litres, 4.181, 1e-2);
  near(r.o2Litres * 2, r.litres, 1e-9);
  near(r.kWh, 0.02, 1e-9);
  // HHV bo'yicha FIK ≈ 1,48 / U
  near(r.eta, 1.481 / 2, 0.01);
  assert.equal(electrolysis(0, 100, 2).grams, 0);
});

test("Quyosh paneli quvvati", () => {
  near(solarPower(1000, 2, 0.2), 400);
  assert.equal(solarPower(-5, 2, 0.2), 0);
});

test("Siqilgan H₂ zichligi va balon", () => {
  near(h2Density(700, 288), 40.6, 0.3);
  near(h2Density(350, 288), 24.0, 0.3);
  near(h2Density(1, 273.15), 0.0888, 0.002);
  near(tankMass(122, 700, 288), 4.95, 0.05);
  near(rangeKm(5, 1), 500);
  assert.equal(rangeKm(5, 0), 0);
});

test("Qutblanish egri chizig'i va stek", () => {
  near(cellVoltage(0), 1.02, 1e-9);
  near(cellVoltage(0.5), 0.70, 0.01);
  assert.ok(cellVoltage(0.2) > cellVoltage(0.8));
  assert.equal(cellVoltage(2), 0);
  const s = stack(330, 200, 100); // 0,5 A/cm²
  near(s.stackV, 330 * cellVoltage(0.5), 1e-9);
  near(s.power, s.stackV * 100, 1e-9);
  near(s.h2gps, ((330 * 100) / (2 * 96485.33)) * 2.016, 1e-9);
  const mpp = maxPowerPoint(330, 200);
  assert.ok(mpp.i > 1 && mpp.i < 1.4);
  assert.ok(mpp.power >= stack(330, 200, 100).power);
});

test("Avtomobil: barqaror tezlik va sarf", () => {
  const v = steadySpeed(14_200, MIRAI_LIKE);
  near(v, 27.8, 0.3);
  near(roadForce(v, MIRAI_LIKE) * v, 14_200, 1);
  near(h2Per100km(27.78, MIRAI_LIKE), 0.95, 0.05);
  assert.equal(steadySpeed(0, MIRAI_LIKE), 0);
  assert.equal(h2Per100km(0, MIRAI_LIKE), 0);
});
