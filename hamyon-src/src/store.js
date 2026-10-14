// Ma'lumot telefonning o'zida (localStorage) saqlanadi — internet va server kerak emas.
const KEY = 'hamyon.v1';

export const initialState = () => ({
  profile: { onboarded: false, name: '', startBalance: 0, savePct: 20 },
  transactions: [], // { id, type: 'income'|'expense', amount, cat, note, date: 'YYYY-MM-DD', fixed? }
  goals: [], // { id, name, icon, target, saved, deadline }
  fixed: [], // { id, name, amount, day, cat, paidMonth }
  reminders: {
    daily: { on: true, time: '19:00' },
    noEntry: { on: true, time: '21:00' },
    weekly: { on: true },
    monthly: { on: true },
  },
  lastCat: 'oziq',
});

export function load() {
  const init = initialState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return init;
    const s = JSON.parse(raw);
    return {
      ...init,
      ...s,
      profile: { ...init.profile, ...s.profile },
      reminders: {
        daily: { ...init.reminders.daily, ...s.reminders?.daily },
        noEntry: { ...init.reminders.noEntry, ...s.reminders?.noEntry },
        weekly: { ...init.reminders.weekly, ...s.reminders?.weekly },
        monthly: { ...init.reminders.monthly, ...s.reminders?.monthly },
      },
    };
  } catch {
    return init;
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* xotira to'lgan bo'lsa — ilova ishlashda davom etadi */
  }
}
