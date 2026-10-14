// Barcha hisob-kitoblar shu yerda (sof funksiyalar, test qilish oson).
// Pul butun son (so'm) sifatida saqlanadi.
import { MONTHS, MONTHS_CAP } from './format.js';

export const pad = (n) => String(n).padStart(2, '0');
export const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const parseKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

const sum = (arr) => arr.reduce((a, x) => a + x.amount, 0);

export function balanceOf(state) {
  let b = state.profile.startBalance || 0;
  for (const t of state.transactions) b += t.type === 'income' ? t.amount : -t.amount;
  return b;
}

export const goalsSaved = (goals) => goals.reduce((a, g) => a + g.saved, 0);

export const fixedUnpaid = (state, now = new Date()) =>
  state.fixed.filter((f) => f.paidMonth !== monthKey(now));

/**
 * Kunlik reja.
 *   erkin      = jami mablag' − maqsadlarga ajratilgan
 *   qolgan     = erkin − hali to'lanmagan majburiy to'lovlar
 *   zaxira     = qolgan × (jamg'arma ulushi %)   ← "saqlab qo'yiladi"
 *   sarflanadi = qolgan − zaxira
 *   kunlik limit = sarflanadi ÷ oyning qolgan kunlari (bugun ham kiradi)
 * Bugungi (majburiy bo'lmagan) xarajat balansdan ayirilgan bo'ladi, shuning uchun
 * kun boshidagi holatni qaytarib hisoblaymiz — limit kun davomida o'zgarmaydi.
 */
export function dailyPlan(state, now = new Date()) {
  const today = dkey(now);
  const spentToday = sum(
    state.transactions.filter((t) => t.type === 'expense' && !t.fixed && t.date === today),
  );
  const incomeToday = sum(state.transactions.filter((t) => t.type === 'income' && t.date === today));
  const balance = balanceOf(state);
  const saved = goalsSaved(state.goals);
  const unpaid = fixedUnpaid(state, now);
  const fixedTotal = sum(unpaid);

  const base = balance + spentToday; // kun boshidagi mablag' (bugungi daromad ichida)
  const free = base - saved;
  const afterFixed = free - fixedTotal;
  const pct = Math.min(100, Math.max(0, state.profile.savePct || 0));
  const reserve = afterFixed > 0 ? Math.round((afterFixed * pct) / 100) : 0;
  const spendable = Math.max(0, afterFixed - reserve);

  const daysLeft = daysInMonth(now.getFullYear(), now.getMonth()) - now.getDate() + 1;
  const raw = spendable / daysLeft;
  const dailyLimit = raw >= 1000 ? Math.floor(raw / 1000) * 1000 : Math.floor(raw);
  const remainingToday = dailyLimit - spentToday;

  return {
    balance,
    goalsSaved: saved,
    free,
    fixedTotal,
    reserve,
    spendable,
    daysLeft,
    dailyLimit,
    spentToday,
    incomeToday,
    remainingToday,
    canSaveToday: Math.max(0, remainingToday),
    overspent: remainingToday < 0,
    short: afterFixed < 0, // mablag' majburiy to'lovlarga ham yetmaydi
  };
}

export function monthTotals(transactions, now = new Date()) {
  const mk = monthKey(now);
  const inMonth = transactions.filter((t) => t.date.startsWith(mk));
  return {
    income: sum(inMonth.filter((t) => t.type === 'income')),
    expense: sum(inMonth.filter((t) => t.type === 'expense')),
  };
}

// ---------- Statistika ----------

export function periodRange(mode, anchor) {
  if (mode === 'day') {
    const k = dkey(anchor);
    return { from: k, to: k, label: `${anchor.getDate()}-${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}` };
  }
  if (mode === 'week') {
    const monday = addDays(anchor, -((anchor.getDay() + 6) % 7));
    const sunday = addDays(monday, 6);
    return {
      from: dkey(monday),
      to: dkey(sunday),
      label: `${monday.getDate()} ${MONTHS[monday.getMonth()]} – ${sunday.getDate()} ${MONTHS[sunday.getMonth()]}`,
    };
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: dkey(first), to: dkey(last), label: `${MONTHS_CAP[anchor.getMonth()]} ${anchor.getFullYear()}` };
}

export function shiftAnchor(mode, anchor, dir) {
  if (mode === 'day') return addDays(anchor, dir);
  if (mode === 'week') return addDays(anchor, 7 * dir);
  return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
}

// Foizlar yig'indisi doim aynan 100% bo'lishi uchun "eng katta qoldiq" usuli
export function breakdown(transactions, from, to) {
  const map = {};
  for (const t of transactions) {
    if (t.type === 'expense' && t.date >= from && t.date <= to) map[t.cat] = (map[t.cat] || 0) + t.amount;
  }
  const items = Object.entries(map)
    .map(([cat, amount]) => ({ cat, amount }))
    .sort((a, b) => b.amount - a.amount);
  const total = items.reduce((a, i) => a + i.amount, 0);
  if (!total) return { total: 0, items: [] };

  const exact = items.map((i) => (i.amount / total) * 100);
  const floors = exact.map(Math.floor);
  let rest = 100 - floors.reduce((a, b) => a + b, 0);
  exact
    .map((v, idx) => ({ idx, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ idx }) => {
      if (rest > 0) {
        floors[idx] += 1;
        rest -= 1;
      }
    });
  return { total, items: items.map((i, idx) => ({ ...i, pct: floors[idx] })) };
}

export function dailySeries(transactions, from, to) {
  const out = [];
  for (let d = parseKey(from); dkey(d) <= to; d = addDays(d, 1)) {
    const k = dkey(d);
    const day = transactions.filter((t) => t.date === k);
    out.push({
      date: k,
      day: d.getDate(),
      income: sum(day.filter((t) => t.type === 'income')),
      expense: sum(day.filter((t) => t.type === 'expense')),
    });
  }
  return out;
}

// ---------- Maqsadlar ----------

export function goalInfo(goal, now = new Date()) {
  const remaining = Math.max(0, goal.target - goal.saved);
  const pct = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;
  let perDay = null;
  let daysLeft = null;
  if (goal.deadline) {
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    daysLeft = Math.round((parseKey(goal.deadline) - startToday) / 86400000);
    perDay = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining;
  }
  return { remaining, pct, perDay, daysLeft, done: remaining === 0 };
}
