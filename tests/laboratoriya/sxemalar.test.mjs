// Barcha sxemalar: to‘g‘ri javob (togri_ulanishlar) barcha ssenariy va qoidalardan o‘tishi,
// klemma nomlari to‘g‘ri bo‘lishi va klemmaga ruxsatdan ortiq sim ulanmasligi kerak.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tekshir, togriSimlar, ssenariyIshla } from '../../laboratoriya/engine/checker.js';
import { tayyorla, klemmaTop } from '../../laboratoriya/engine/simulator.js';

const yol = (f) => new URL(`../../laboratoriya/schemes/${f}`, import.meta.url);
const { sxemalar } = JSON.parse(readFileSync(yol('royxat.json')));

for (const id of sxemalar) {
  const sxema = JSON.parse(readFileSync(yol(`${id}.json`)));
  test(`${id}: tuzilma va klemmalar`, () => {
    assert.equal(sxema.id, id);
    const els = tayyorla(sxema);
    for (const g of sxema.togri_ulanishlar) for (const k of g.nuqtalar) assert.ok(klemmaTop(els, k), `${id}: noma’lum klemma ${k}`);
    const simlar = togriSimlar(sxema);
    const soni = new Map();
    for (const s of simlar) for (const k of [s.a, s.b]) soni.set(k, (soni.get(k) || 0) + 1);
    for (const [k, n] of soni) {
      const r = klemmaTop(els, k);
      assert.ok(n <= (r.k.maks || 2), `${id}: ${k} klemmasiga ${n} ta sim (ruxsat ${r.k.maks || 2})`);
    }
    for (const t of ['uz', 'ru', 'en']) {
      assert.ok(sxema.nomi[t] && sxema.topshiriq[t] && sxema.qisqacha[t], `${id}: ${t} matn yo‘q`);
      assert.ok(sxema.maslahatlar[t]?.length, `${id}: ${t} maslahat yo‘q`);
    }
  });
  test(`${id}: to‘g‘ri javob tekshiruvdan o‘tadi`, () => {
    const r = tekshir(sxema, togriSimlar(sxema));
    assert.deepEqual(r.xatolar, [], JSON.stringify(r.xatolar));
    assert.equal(r.togri, true);
  });
  if (sxema.ssenariylar) {
    test(`${id}: sim ulanmagan sxema ssenariylardan o‘tmaydi`, () => {
      const els = tayyorla(sxema);
      const ok = sxema.ssenariylar.every((ss) => ssenariyIshla(els, [], ss).ok);
      assert.equal(ok, false);
    });
  }
}
