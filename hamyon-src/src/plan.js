// Eslatmalar rejasi (sof funksiya). Capacitor'dan mustaqil — test qilish oson.
import { dailyPlan, addDays } from './calc.js';
import { som } from './format.js';

const at = (base, i, time) => {
  const [h, m] = time.split(':').map(Number);
  const d = addDays(base, i);
  d.setHours(h, m, 0, 0);
  return d;
};

export function buildNotifications(state, now = new Date()) {
  const r = state.reminders;
  const plan = dailyPlan(state, now);
  const list = [];
  const todayHasExpense = state.transactions.some(
    (t) => t.type === 'expense' && !t.fixed && t.date === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  );

  // Keyingi 7 kun uchun bir martalik eslatmalar: ilova har ochilganda/o'zgarganda qayta rejalanadi
  for (let i = 0; i < 7; i++) {
    if (r.daily.on) {
      const when = at(now, i, r.daily.time);
      if (when > now) {
        let body;
        if (i === 0) {
          body = plan.overspent
            ? "Bugungi limit oshib ketdi. Ertaga ehtiyot bo'ling!"
            : plan.dailyLimit === 0
              ? "Bugun ham har bir tejalgan so'm — jamg'arma!"
              : `Bugun ${som(plan.canSaveToday)} jamg'arishingiz mumkin!`;
        } else {
          body = `Bugungi limit ${som(plan.dailyLimit)}. Tejagan har bir so'm — jamg'arma!`;
        }
        list.push({ id: 1000 + i, title: "Jamg'arma eslatmasi", body, schedule: { at: when, allowWhileIdle: true } });
      }
    }
    if (r.noEntry.on) {
      const when = at(now, i, r.noEntry.time);
      if (when > now && !(i === 0 && todayHasExpense)) {
        list.push({
          id: 2000 + i,
          title: 'Xarajatlar',
          body: 'Bugun xarajatlaringizni kiritdingizmi?',
          schedule: { at: when, allowWhileIdle: true },
        });
      }
    }
  }

  // Takrorlanuvchi: har dushanba va har oyning 1-kuni
  if (r.weekly.on) {
    list.push({
      id: 3000,
      title: 'Haftalik tahlil',
      body: "Haftalik xarajatlaringizni ko'rib chiqing.",
      schedule: { on: { weekday: 2, hour: 10, minute: 0 }, allowWhileIdle: true },
    });
  }
  if (r.monthly.on) {
    list.push({
      id: 3001,
      title: 'Maqsadlar tekshiruvi',
      body: "Jamg'arma maqsadlaringizni ko'rib chiqing.",
      schedule: { on: { day: 1, hour: 10, minute: 0 }, allowWhileIdle: true },
    });
  }
  return list;
}
