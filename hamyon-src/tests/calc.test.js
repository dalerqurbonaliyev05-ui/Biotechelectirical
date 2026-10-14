import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyPlan, breakdown, periodRange, goalInfo, balanceOf, monthTotals } from '../src/calc.js';
import { initialState } from '../src/store.js';
import { reducer } from '../src/reducer.js';
import { guessCategory } from '../src/categories.js';
import { buildNotifications } from '../src/plan.js';
import { fmt } from '../src/format.js';

const NOW = new Date(2026, 9, 15, 10, 0); // 15-oktyabr 2026 (oyda 17 kun qoladi)

function base() {
  let s = initialState();
  s = reducer(s, { type: 'onboard', profile: { name: 'Daler', startBalance: 3100000, savePct: 20 } });
  return s;
}

test('fmt probel bilan ajratadi', () => {
  assert.equal(fmt(1500000).replace(/ /g, ' '), '1 500 000');
  assert.equal(fmt(-45000).replace(/ /g, ' '), '-45 000');
});

test('kunlik limit: qolgan kunlarga bo\'linadi, 20% zaxira', () => {
  const p = dailyPlan(base(), NOW);
  // 3 100 000 × 0.8 = 2 480 000 ; / 17 = 145 882 -> 145 000
  assert.equal(p.reserve, 620000);
  assert.equal(p.daysLeft, 17);
  assert.equal(p.dailyLimit, 145000);
  assert.equal(p.remainingToday, 145000);
});

test('xarajat kun davomida limitni o\'zgartirmaydi, qolgan kamayadi', () => {
  let s = base();
  s = reducer(s, { type: 'addTx', tx: { type: 'expense', amount: 45000, cat: 'oziq', note: '', date: '2026-10-15' } });
  const p = dailyPlan(s, NOW);
  assert.equal(balanceOf(s), 3055000);
  assert.equal(p.dailyLimit, 145000);
  assert.equal(p.remainingToday, 100000);
  assert.equal(p.canSaveToday, 100000);
});

test('limitdan ko\'p sarflansa overspent', () => {
  let s = base();
  s = reducer(s, { type: 'addTx', tx: { type: 'expense', amount: 200000, cat: 'oziq', note: '', date: '2026-10-15' } });
  const p = dailyPlan(s, NOW);
  assert.equal(p.overspent, true);
  assert.equal(p.canSaveToday, 0);
});

test('majburiy to\'lov va maqsad mablag\'i hisobga olinadi', () => {
  let s = base();
  s = reducer(s, { type: 'addGoal', goal: { name: 'Noutbuk', icon: '💻', target: 2000000, deadline: '2026-11-30' } });
  s = reducer(s, { type: 'goalMove', id: s.goals[0].id, delta: 600000 });
  s = reducer(s, { type: 'addFixed', fixed: { name: 'Ijara', amount: 500000, day: 20, cat: 'uyjoy' } });
  const p = dailyPlan(s, NOW);
  // erkin 2 500 000 − 500 000 = 2 000 000 ; zaxira 400 000 ; sarflanadi 1 600 000 ; /17 = 94 117 -> 94 000
  assert.equal(p.free, 2500000);
  assert.equal(p.fixedTotal, 500000);
  assert.equal(p.dailyLimit, 94000);
});

test('majburiy to\'lovni to\'lash limitni o\'zgartirmaydi', () => {
  let s = base();
  s = reducer(s, { type: 'addFixed', fixed: { name: 'Ijara', amount: 500000, day: 20, cat: 'uyjoy' } });
  const before = dailyPlan(s, NOW);
  s = reducer(s, { type: 'payFixed', id: s.fixed[0].id, now: NOW, date: '2026-10-15' });
  const after = dailyPlan(s, NOW);
  assert.equal(after.dailyLimit, before.dailyLimit);
  assert.equal(after.remainingToday, before.remainingToday);
  assert.equal(after.fixedTotal, 0);
});

test('mablag\' yetmasa short=true va limit 0', () => {
  let s = base();
  s = reducer(s, { type: 'addFixed', fixed: { name: 'Kredit', amount: 5000000, day: 25, cat: 'uyjoy' } });
  const p = dailyPlan(s, NOW);
  assert.equal(p.short, true);
  assert.equal(p.dailyLimit, 0);
});

test('breakdown foizlari aynan 100% bo\'ladi', () => {
  const tx = [
    { type: 'expense', cat: 'oziq', amount: 344000, date: '2026-10-05' },
    { type: 'expense', cat: 'transport', amount: 206000, date: '2026-10-06' },
    { type: 'expense', cat: 'internet', amount: 138000, date: '2026-10-07' },
    { type: 'expense', cat: 'kiyim', amount: 310000, date: '2026-10-08' },
    { type: 'expense', cat: 'uyjoy', amount: 172000, date: '2026-10-09' },
    { type: 'expense', cat: 'boshqa', amount: 1, date: '2026-10-09' },
    { type: 'income', cat: 'in_maosh', amount: 9000000, date: '2026-10-01' },
  ];
  const b = breakdown(tx, '2026-10-01', '2026-10-31');
  assert.equal(b.items.reduce((a, i) => a + i.pct, 0), 100);
  assert.equal(b.items[0].cat, 'oziq'); // eng katta xarajat birinchi
});

test('periodRange: hafta dushanbadan yakshanbagacha', () => {
  const r = periodRange('week', NOW); // payshanba
  assert.equal(r.from, '2026-10-12');
  assert.equal(r.to, '2026-10-18');
  assert.equal(periodRange('month', NOW).to, '2026-10-31');
});

test('oylik jami', () => {
  const s = base();
  const t = [
    { type: 'income', amount: 100, date: '2026-10-01' },
    { type: 'expense', amount: 40, date: '2026-10-03' },
    { type: 'expense', amount: 99, date: '2026-09-30' },
  ];
  assert.deepEqual(monthTotals(t, NOW), { income: 100, expense: 40 });
  assert.ok(s);
});

test('maqsad: kuniga qancha jamg\'arish kerak', () => {
  const g = { target: 3000000, saved: 1800000, deadline: '2026-10-30' };
  const i = goalInfo(g, NOW);
  assert.equal(i.pct, 60);
  assert.equal(i.remaining, 1200000);
  assert.equal(i.daysLeft, 15);
  assert.equal(i.perDay, 80000);
});

test('izohdan kategoriya taxmini', () => {
  assert.equal(guessCategory('Non, sabzavot, sut'), 'oziq');
  assert.equal(guessCategory('taksi'), 'transport');
  assert.equal(guessCategory('Internet to\'lovi'), 'internet');
  assert.equal(guessCategory('dorixona dori'), 'tibbiyot');
  assert.equal(guessCategory('xyz'), null);
});

test('eslatmalar: bugun vaqt o\'tgan bo\'lsa o\'tkazib yuboriladi, 7 kunga rejalanadi', () => {
  const s = base();
  const late = new Date(2026, 9, 15, 20, 0); // 19:00 o'tib ketgan
  const list = buildNotifications(s, late);
  const daily = list.filter((n) => n.id >= 1000 && n.id < 1100);
  assert.equal(daily.length, 6);
  assert.ok(list.some((n) => n.id === 3000) && list.some((n) => n.id === 3001));
  const early = buildNotifications(s, NOW);
  assert.ok(early.find((n) => n.id === 1000).body.includes('jamg\'arishingiz mumkin'));
});
