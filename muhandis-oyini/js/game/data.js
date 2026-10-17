// Ma'lumot fayllarini yuklash. Brauzerda fetch, Node'da fs orqali (readJson o'zgartiriladi).
import { makeT } from '../util.js';

export const DATA_FILES = {
  config: 'config.json',
  equipment: 'equipment.json',
  faults: 'faults.json',
  tasks: 'tasks.json',
  energy: 'energy.json',
  safety: 'safety.json',
  i18n: 'i18n.uz.json'
};

/** readJson(fileName) → Promise<object> */
export async function loadData(readJson) {
  const entries = await Promise.all(Object.entries(DATA_FILES).map(async ([k, f]) => [k, await readJson(f)]));
  const data = Object.fromEntries(entries);
  data.t = makeT(data.i18n);
  validateData(data);
  return data;
}

/** Ma'lumotlar yaxlitligini tekshirish (yangi topshiriq qo'shganda xatoni erta topish uchun) */
export function validateData(data) {
  const errors = [];
  const eqIds = new Set(data.equipment.equipment.map((e) => e.id));
  for (const task of data.tasks.tasks) {
    const sym = data.faults.symptoms[task.symptom];
    if (!sym) errors.push(`topshiriq ${task.id}: alomat topilmadi (${task.symptom})`);
    if (task.equipment && !eqIds.has(task.equipment)) errors.push(`topshiriq ${task.id}: uskuna topilmadi (${task.equipment})`);
    for (const a of sym?.options || []) if (!data.faults.actions[a]) errors.push(`${task.symptom}: harakat topilmadi (${a})`);
    for (const c of sym?.causes || []) {
      for (const a of [...(c.fixedBy || []), ...(c.alsoWorks || [])]) if (!data.faults.actions[a]) errors.push(`${task.symptom}/${c.id}: harakat topilmadi (${a})`);
    }
  }
  if (errors.length) throw new Error('Ma\'lumotlar xatosi:\n' + errors.join('\n'));
}
