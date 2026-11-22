// Yangi sxemalarda tipik montaj xatolari aniqlanishi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tekshir, togriSimlar } from '../../laboratoriya/engine/checker.js';

const ol = (id) => JSON.parse(readFileSync(new URL(`../../laboratoriya/schemes/${id}.json`, import.meta.url)));
const tur = (r) => r.xatolar.map((x) => x.tur);
// Guruhdagi nuqtani olib tashlab (sim ulanmagan) yoki boshqa guruhga ko‘chirib javob yasash
function ozgartir(sxema, fn) {
  const s = JSON.parse(JSON.stringify(sxema));
  fn(s.togri_ulanishlar);
  return togriSimlar(s);
}
const guruh = (g, k) => g.find((x) => x.nuqtalar.includes(k));
const olibTashla = (g, k) => { const x = guruh(g, k); x.nuqtalar = x.nuqtalar.filter((n) => n !== k); };

test('motor-01: o‘zini ushlab turish kontakti ulanmagan → motor Start qo‘yib yuborilganda to‘xtaydi', () => {
  const s = ol('motor-01');
  const r = tekshir(s, ozgartir(s, (g) => { olibTashla(g, 'KM1.13'); olibTashla(g, 'KM1.14'); }));
  assert.ok(tur(r).includes('ssenariy'), JSON.stringify(r.xatolar));
  assert.equal(r.xatolar[0].p.el, 'M1');
});

test('motor-01: g‘altak ikki faza orasiga ulangan (400 V) → g‘altak kuyadi', () => {
  const s = ol('motor-01');
  const r = tekshir(s, ozgartir(s, (g) => { olibTashla(g, 'KM1.A2'); guruh(g, 'QF1.4').nuqtalar.push('KM1.A2'); }));
  assert.ok(tur(r).includes('kuydi'), JSON.stringify(r.xatolar));
  assert.equal(r.xatolar.find((x) => x.tur === 'kuydi').p.el, 'KM1');
});

test('motor-04: blokirovka yo‘q → ikkala kontaktor yoqilib qisqa tutashuv', () => {
  const s = ol('motor-04');
  const simlar = ozgartir(s, (g) => {
    // SB2.24 ni to‘g‘ridan KM1.A1 ga, SB3.24 ni KM2.A1 ga (NC 21–22 chetlab)
    olibTashla(g, 'KM2.21'); olibTashla(g, 'KM2.22'); guruh(g, 'SB2.24').nuqtalar.push('KM1.A1'); olibTashla(g, 'KM1.A1');
    guruh(g, 'SB2.24').nuqtalar.push('KM1.A1');
    olibTashla(g, 'KM1.21'); olibTashla(g, 'KM1.22'); olibTashla(g, 'KM2.A1'); guruh(g, 'SB3.24').nuqtalar.push('KM2.A1');
  });
  const r = tekshir(s, simlar);
  assert.ok(tur(r).includes('qisqa_tutashuv'), JSON.stringify(r.xatolar));
  assert.equal(r.xatolar[0].kalit, 'chk.qisqa_LL');
});

test('motor-04: KM2 chiqishida fazalar almashtirilmagan → orqaga yurmaydi', () => {
  const s = ol('motor-04');
  const r = tekshir(s, ozgartir(s, (g) => {
    olibTashla(g, 'KM2.T1'); olibTashla(g, 'KM2.T3');
    guruh(g, 'KM1.T1').nuqtalar.push('KM2.T1'); guruh(g, 'KM1.T3').nuqtalar.push('KM2.T3');
  }));
  assert.ok(tur(r).includes('ssenariy'));
});

test('motor-09: yulduz va uchburchak kontaktorlari bloklanmagan → qisqa tutashuv', () => {
  const s = ol('motor-09');
  const r = tekshir(s, ozgartir(s, (g) => {
    olibTashla(g, 'KM3.41'); olibTashla(g, 'KM3.42'); olibTashla(g, 'KM2.A1'); guruh(g, 'KT1.16').nuqtalar.push('KM2.A1');
    olibTashla(g, 'KM2.41'); olibTashla(g, 'KM2.42'); olibTashla(g, 'KM3.A1'); guruh(g, 'KT1.18').nuqtalar.push('KM3.A1');
    // yulduz kontaktori qo‘yib yuborilmasdan uchburchak ham yoqilsin: KT1 NC o‘rniga to‘g‘ridan
    olibTashla(g, 'KT1.16'); guruh(g, 'SB2.24').nuqtalar.push('KM2.A1'); olibTashla(g, 'KM2.A1');
    guruh(g, 'SB2.24').nuqtalar.push('KM2.A1');
  }));
  assert.ok(tur(r).includes('qisqa_tutashuv'), JSON.stringify(r.xatolar));
});

test('motor-02: PE ulanmagan → ogohlantirish', () => {
  const s = ol('motor-02');
  const r = tekshir(s, ozgartir(s, (g) => { g.splice(g.findIndex((x) => x.nuqtalar.includes('M1.PE')), 1); }));
  assert.deepEqual(tur(r), ['pe_yoq']);
});

test('yoritish-04: drossel chetlab o‘tilgan → lampa tolasi kuyadi', () => {
  const s = ol('yoritish-04');
  const r = tekshir(s, ozgartir(s, (g) => { olibTashla(g, 'LL1.1'); olibTashla(g, 'LL1.2'); guruh(g, 'SA2.L').nuqtalar.push('EL1.A1'); olibTashla(g, 'EL1.A1'); guruh(g, 'SA2.L').nuqtalar.push('EL1.A1'); }));
  assert.ok(tur(r).includes('kuydi'), JSON.stringify(r.xatolar));
});

test('uy-shiti-01: rozetka faza va nolni teskari olgan bo‘lsa ham ishlaydi, lekin kalit nolni uzsa ogohlantirish', () => {
  const s = ol('uy-shiti-01');
  const r = tekshir(s, ozgartir(s, (g) => {
    // SA1 ni nol tomonga o‘tkazamiz: QF1.4 → SA1.L, SA1.L1 → HL1.N; HL1.L → QF1.2
    olibTashla(g, 'SA1.L'); olibTashla(g, 'HL1.N'); olibTashla(g, 'SA1.L1'); olibTashla(g, 'HL1.L');
    guruh(g, 'QF1.4').nuqtalar.push('SA1.L'); g.push({ nuqtalar: ['SA1.L1', 'HL1.N'], rang: 'kok' }); guruh(g, 'QF1.2').nuqtalar.push('HL1.L');
  }));
  assert.ok(tur(r).includes('kalit_nolda'), JSON.stringify(r.xatolar));
});

test('motor-13: pult K1 va K2 almashtirilgan → yo‘nalish teskari', () => {
  const s = ol('motor-13');
  const r = tekshir(s, ozgartir(s, (g) => {
    guruh(g, 'A1.K1').nuqtalar = ['A1.K1', 'UZ1.DI2']; guruh(g, 'A1.K2').nuqtalar = ['A1.K2', 'UZ1.DI1'];
  }));
  assert.ok(tur(r).includes('ssenariy'));
});
