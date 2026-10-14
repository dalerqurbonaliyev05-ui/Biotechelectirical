import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { buildNotifications } from './plan.js';

const native = () => Capacitor.isNativePlatform();

export async function ensurePermission() {
  if (!native()) return false;
  try {
    let p = await LocalNotifications.checkPermissions();
    if (p.display === 'prompt' || p.display === 'prompt-with-rationale') {
      p = await LocalNotifications.requestPermissions();
    }
    return p.display === 'granted';
  } catch {
    return false;
  }
}

// Eski eslatmalarni o'chirib, hozirgi holatga qarab qaytadan rejalaydi
export async function reschedule(state, now = new Date()) {
  if (!native()) return;
  try {
    const p = await LocalNotifications.checkPermissions();
    if (p.display !== 'granted') return;
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
    const list = buildNotifications(state, now);
    if (list.length) await LocalNotifications.schedule({ notifications: list });
  } catch (e) {
    console.warn('Eslatmalarni rejalashda xato', e);
  }
}
