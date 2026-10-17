// Signal paneli (annunsiator): faol signallar ro'yxati.
import type { SimState } from "./types";

export function raiseAlarm(s: SimState, code: string, params?: Record<string, string>): void {
  const cur = s.alarms.find((a) => a.code === code && a.active);
  if (cur) {
    cur.params = params ?? cur.params;
    return;
  }
  s.alarms.push({ id: `${code}-${s.alarms.length + 1}`, code, t: s.time, active: true, params });
}

export function clearAlarm(s: SimState, code: string): void {
  for (const a of s.alarms) if (a.code === code) a.active = false;
}

export function hasActiveAlarm(s: SimState, code: string): boolean {
  return s.alarms.some((a) => a.code === code && a.active);
}
