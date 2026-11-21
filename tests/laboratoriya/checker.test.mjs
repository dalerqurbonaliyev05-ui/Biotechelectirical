// Laboratoriya dvigateli sinovlari: to'g'ri yechim va turli xatolar.
// Ishga tushirish: node --test tests/laboratoriya/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tekshir, togriSimlar } from '../../laboratoriya/engine/checker.js';
import { tayyorla, boshlangichHolat, simulyatsiya } from '../../laboratoriya/engine/simulator.js';

const sxema = JSON.parse(readFileSync(new URL('../../laboratoriya/schemes/yoritish-01.json', import.meta.url)));
const turlar = (r) => r.xatolar.map((x) => x.tur).sort();
let n = 0;
const s = (a, b, rang) => ({ id: `t${++n}`, a, b, rang });

// Talaba yig'adigan to'g'ri variant (qutidagi bloklar boshqacha tartibda).
const togri = () => [
  s('VVOD.L', 'Q1.in', 'jigarrang'),
  s('Q1.out', 'X1.C1', 'jigarrang'), s('X1.C2', 'SA1.L', 'jigarrang'),
  s('SA1.L1', 'X1.A3', 'qora'), s('X1.A1', 'HL1.markaz', 'qora'),
  s('VVOD.N', 'X1.D2', 'kok'), s('X1.D3', 'HL1.rezba', 'kok'),
  s('VVOD.PE', 'X1.B1', 'sariq_yashil'), s('X1.B2', 'HL1.PE', 'sariq_yashil'),
];
const almashtir = (simlar, a, b, yangi) => simlar.map((x) => (x.a === a && x.b === b ? { ...x, ...yangi } : x));

test('to‘g‘ri javob generatori tekshiruvdan o‘tadi', () => {
  const r = tekshir(sxema, togriSimlar(sxema));
  assert.deepEqual(r.xatolar, []);
  assert.equal(r.togri, true);
});

test('qutidagi klemma tartibidan qat’i nazar to‘g‘ri yechim qabul qilinadi', () => {
  const r = tekshir(sxema, togri());
  assert.equal(r.togri, true, JSON.stringify(r.xatolar));
});

test('lampa kalit bilan yonib-o‘chadi, tok oqimi yo‘li topiladi', () => {
  const els = tayyorla(sxema);
  const h = boshlangichHolat(els);
  h.Q1.yoqilgan = true;
  assert.equal(simulyatsiya(els, togri(), h).yuklamalar.HL1.yonadi, false);
  h.SA1.yoqilgan = true;
  const sim = simulyatsiya(els, togri(), h);
  assert.equal(sim.yuklamalar.HL1.yonadi, true);
  assert.equal(sim.oqim.length, 7); // 5 ta faza simi + 2 ta nol simi
});

test('bo‘sh sxema', () => {
  assert.deepEqual(turlar(tekshir(sxema, [])), ['bosh']);
});

test('qisqa tutashuv: L va N to‘g‘ridan ulangan → avtomat o‘chadi', () => {
  const simlar = [...togri(), s('X1.C3', 'X1.D1', 'jigarrang')];
  const r = tekshir(sxema, simlar);
  assert.deepEqual(turlar(r), ['qisqa_tutashuv']);
  assert.equal(r.xatolar[0].kalit, 'chk.qisqa_LN');
  const els = tayyorla(sxema);
  const h = boshlangichHolat(els);
  h.Q1.yoqilgan = true;
  const sim = simulyatsiya(els, simlar, h);
  assert.deepEqual(sim.ochirilsin, ['Q1']);
});

test('qisqa tutashuv avtomatni chetlab o‘tsa — alohida ogohlantirish', () => {
  const r = tekshir(sxema, [s('VVOD.L', 'X1.A1', 'jigarrang'), s('VVOD.N', 'X1.A2', 'kok')]);
  assert.equal(r.xatolar[0].qoshimcha, 'chk.qisqa_chetlab');
});

test('ochiq zanjir: kalitdan lampagacha sim yo‘q — uzilish joyi ko‘rsatiladi', () => {
  const simlar = togri().filter((x) => !(x.a === 'X1.A1'));
  const r = tekshir(sxema, simlar);
  assert.ok(turlar(r).includes('ochiq_zanjir'));
  const x = r.xatolar.find((e) => e.tur === 'ochiq_zanjir');
  assert.equal(x.joy.kalit, 'chk.ochiq_faza');
  assert.deepEqual([x.joy.p.a.k, x.joy.p.b.k], ['SA1.L1', 'HL1.markaz']);
});

test('ochiq zanjir: nol ulanmagan', () => {
  const r = tekshir(sxema, togri().filter((x) => x.a !== 'X1.D3'));
  const x = r.xatolar.find((e) => e.tur === 'ochiq_zanjir');
  assert.equal(x.joy.kalit, 'chk.ochiq_nol');
});

test('kalit nol simini uzyapti → sariq ogohlantirish', () => {
  const simlar = [
    s('VVOD.L', 'Q1.in', 'jigarrang'),
    s('Q1.out', 'X1.A1', 'jigarrang'), s('X1.A2', 'HL1.markaz', 'jigarrang'),
    s('VVOD.N', 'X1.B1', 'kok'), s('X1.B2', 'SA1.L', 'kok'),
    s('SA1.L1', 'X1.C1', 'kok'), s('X1.C2', 'HL1.rezba', 'kok'),
    s('VVOD.PE', 'X1.D1', 'sariq_yashil'), s('X1.D2', 'HL1.PE', 'sariq_yashil'),
  ];
  const r = tekshir(sxema, simlar);
  assert.equal(r.togri, false);
  assert.deepEqual(turlar(r), ['kalit_nolda']);
  assert.equal(r.xatolar[0].daraja, 'ogoh');
});

test('faza patron rezbasiga ulangan → ogohlantirish', () => {
  let simlar = almashtir(togri(), 'X1.A1', 'HL1.markaz', { b: 'HL1.rezba' });
  simlar = almashtir(simlar, 'X1.D3', 'HL1.rezba', { b: 'HL1.markaz' });
  const r = tekshir(sxema, simlar);
  assert.deepEqual(turlar(r), ['faza_rezbada']);
});

test('PE ulanmagan → ogohlantirish', () => {
  const r = tekshir(sxema, togri().filter((x) => x.b !== 'HL1.PE'));
  assert.deepEqual(turlar(r), ['pe_yoq']);
});

test('sim rangi noto‘g‘ri → ogohlantirish va aynan o‘sha simlar belgilanadi', () => {
  const simlar = almashtir(togri(), 'VVOD.N', 'X1.D2', { rang: 'jigarrang' });
  const r = tekshir(sxema, simlar);
  assert.deepEqual(turlar(r), ['sim_rangi']);
  assert.equal(r.xatolar[0].simlar.length, 1);
});

test('qutini chetlab o‘tgan ulanish → ogohlantirish', () => {
  const simlar = togri().filter((x) => !['X1.C1', 'X1.C2'].includes(x.b) && !['X1.C1', 'X1.C2'].includes(x.a));
  simlar.push(s('Q1.out', 'SA1.L', 'jigarrang'));
  const r = tekshir(sxema, simlar);
  assert.deepEqual(turlar(r), ['quti_chetlab']);
});

test('avtomat chetlab o‘tilgan (faza to‘g‘ridan qutiga) → ogohlantirish', () => {
  const simlar = togri().filter((x) => x.a !== 'VVOD.L' && x.a !== 'Q1.out');
  simlar.push(s('VVOD.L', 'X1.C1', 'jigarrang'));
  const r = tekshir(sxema, simlar);
  assert.ok(turlar(r).includes('avtomat_chetlab'), JSON.stringify(turlar(r)));
});

test('kalit chetlab o‘tilgan: lampa doim yonadi', () => {
  const simlar = [...togri(), s('X1.C3', 'X1.A2', 'jigarrang')];
  const r = tekshir(sxema, simlar);
  assert.ok(turlar(r).includes('boshqarilmaydi'));
});

test('N va PE birlashtirilgan', () => {
  const simlar = [...togri(), s('X1.D1', 'X1.B3', 'kok')];
  const r = tekshir(sxema, simlar);
  assert.ok(turlar(r).includes('n_pe'), JSON.stringify(turlar(r)));
});
