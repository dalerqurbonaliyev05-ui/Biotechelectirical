import { initialState } from './store.js';
import { monthKey } from './calc.js';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function reducer(s, a) {
  switch (a.type) {
    case 'onboard':
      return { ...s, profile: { ...s.profile, ...a.profile, onboarded: true } };
    case 'profile':
      return { ...s, profile: { ...s.profile, ...a.patch } };

    case 'addTx':
      return {
        ...s,
        transactions: [...s.transactions, { id: uid(), ...a.tx }],
        lastCat: a.tx.type === 'expense' ? a.tx.cat : s.lastCat,
      };
    case 'delTx':
      return { ...s, transactions: s.transactions.filter((t) => t.id !== a.id) };

    case 'addGoal':
      return { ...s, goals: [...s.goals, { id: uid(), saved: 0, ...a.goal }] };
    case 'goalMove':
      return {
        ...s,
        goals: s.goals.map((g) =>
          g.id === a.id ? { ...g, saved: Math.max(0, Math.min(g.target, g.saved + a.delta)) } : g,
        ),
      };
    case 'delGoal':
      return { ...s, goals: s.goals.filter((g) => g.id !== a.id) };

    case 'addFixed':
      return { ...s, fixed: [...s.fixed, { id: uid(), paidMonth: null, ...a.fixed }] };
    case 'delFixed':
      return { ...s, fixed: s.fixed.filter((f) => f.id !== a.id) };
    case 'payFixed': {
      const f = s.fixed.find((x) => x.id === a.id);
      if (!f) return s;
      return {
        ...s,
        fixed: s.fixed.map((x) => (x.id === a.id ? { ...x, paidMonth: monthKey(a.now) } : x)),
        transactions: [
          ...s.transactions,
          { id: uid(), type: 'expense', amount: f.amount, cat: f.cat || 'uyjoy', note: f.name, date: a.date, fixed: true },
        ],
      };
    }

    case 'reminder':
      return { ...s, reminders: { ...s.reminders, [a.key]: { ...s.reminders[a.key], ...a.patch } } };

    case 'reset':
      return initialState();
    default:
      return s;
  }
}
