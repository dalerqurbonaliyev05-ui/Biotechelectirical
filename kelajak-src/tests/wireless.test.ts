import assert from "node:assert/strict";
import { test } from "node:test";
import { bridgeRectifier, couplingK, etaMax, mutualInductance, qualityFactor, resonantCap, resonantFreq, spiralInductance, squareFundamental, ssLink } from "../lib/physics/wireless.ts";

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);

test("f₀ va rezonans sig'imi o'zaro teskari", () => {
  const L = 24e-6;
  const C = resonantCap(L, 100e3);
  near(C, 105.5e-9, 0.1e-9);
  near(resonantFreq(L, C), 100e3, 1e-3);
  assert.equal(resonantFreq(0, C), 0);
  assert.equal(resonantCap(L, 0), 0);
});

test("M, Q va k modeli", () => {
  near(mutualInductance(0.5, 24e-6, 24e-6), 12e-6, 1e-12);
  near(qualityFactor(100e3, 24e-6, 0.1), 150.8, 0.1);
  assert.equal(qualityFactor(100e3, 24e-6, 0), 0);
  near(couplingK(0, 0.05), 0.7);
  near(couplingK(0.05, 0.05), 0.7 / 2 ** 1.5, 1e-9);
  assert.ok(couplingK(0.2, 0.05) < couplingK(0.1, 0.05));
});

test("η_max formulasi", () => {
  near(etaMax(0, 100, 100), 0);
  // x = 0,01 · 10 000 = 100 → η = 100 / (1 + √101)² ≈ 0,8195
  near(etaMax(0.1, 100, 100), 100 / (1 + Math.sqrt(101)) ** 2, 1e-12);
  assert.ok(etaMax(0.5, 200, 200) > 0.98);
});

test("Spiral g'altak induktivligi (Wheeler)", () => {
  const s = spiralInductance(10, 50, 1.5);
  assert.equal(s.ok, true);
  near(s.innerMm, 20);
  near(s.L * 1e6, 3.95, 0.05);
  assert.equal(spiralInductance(30, 50, 1.5).ok, false);
});

test("SS zanjir: rezonansda quvvat cho'qqisi va energiya saqlanishi", () => {
  const L = 24e-6;
  const C = resonantCap(L, 100e3);
  const base = { Vs: 10, L1: L, C1: C, R1: 0.2, L2: L, C2: C, R2: 0.2, RL: 5, k: 0.3 };
  const at = ssLink({ ...base, f: 100e3 });
  const off = ssLink({ ...base, f: 130e3 });
  assert.ok(at.PL > off.PL * 2);
  assert.ok(at.eta > 0.9 && at.eta < 1);
  // Yo'qotishlar: Pin = PL + I₁²R₁ + I₂²R₂
  near(at.Pin, at.PL + at.I1 ** 2 * 0.2 + at.I2 ** 2 * 0.2, 1e-6);
  const none = ssLink({ ...base, C1: 0, C2: 0, f: 100e3 });
  assert.ok(none.PL < at.PL / 10);
});

test("Inverter va to'g'rilagich", () => {
  near(squareFundamental(12), (4 * 12) / Math.PI);
  near(squareFundamental(12, 0.25), ((4 * 12) / Math.PI) * Math.sin(Math.PI / 4));
  const r = bridgeRectifier(10, 0.4, 0.5, 100e3, 10e-6);
  near(r.ripple, 0.25);
  near(r.vdc, 9.2 - 0.125);
  assert.equal(bridgeRectifier(10, 0.4, 0.5, 100e3, 0).ripple, 9.2);
});
