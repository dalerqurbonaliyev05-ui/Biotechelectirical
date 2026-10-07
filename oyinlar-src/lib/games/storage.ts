// localStorage ustidan xavfsiz qatlam: SSR, private rejim yoki to'lgan xotira xato bermaydi.
// useStored() useSyncExternalStore orqali ishlaydi: serverda va gidratatsiya paytida `fallback`,
// so'ng brauzerdagi haqiqiy qiymat — shuning uchun hydration mismatch bo'lmaydi.
import { useSyncExternalStore } from "react";

const PREFIX = "milliy-oyinlar:";
const listeners = new Set<() => void>();

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function readRaw(fullKey: string): string | null {
  if (!hasWindow()) return null;
  try {
    return window.localStorage.getItem(fullKey);
  } catch {
    return null;
  }
}

export function writeRaw(fullKey: string, value: string): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(fullKey, value);
  } catch {
    /* xotira bloklangan yoki to'lgan — o'yin baribir ishlayveradi */
  }
  memory.set(fullKey, value);
  listeners.forEach((l) => l());
}

// localStorage ishlamasa ham sessiya davomida qiymatlar yo'qolmasin.
const memory = new Map<string, string>();

function getRaw(fullKey: string): string | null {
  const v = readRaw(fullKey);
  return v ?? memory.get(fullKey) ?? null;
}

export function readJSON<T>(key: string, fallback: T): T {
  const raw = getRaw(PREFIX + key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  writeRaw(PREFIX + key, JSON.stringify(value));
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = () => cb();
  if (hasWindow()) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (hasWindow()) window.removeEventListener("storage", onStorage);
  };
}

const cache = new Map<string, { raw: string | null; value: unknown }>();

function snapshot<T>(fullKey: string, fallback: T, parse: (raw: string) => T): T {
  const raw = getRaw(fullKey);
  const hit = cache.get(fullKey);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T = fallback;
  if (raw != null) {
    try {
      value = parse(raw);
    } catch {
      value = fallback;
    }
  }
  cache.set(fullKey, { raw, value });
  return value;
}

/** JSON qiymatni o'qiydi va o'zgarishlarga obuna bo'ladi. `fallback` modul darajasidagi o'zgarmas bo'lsin. */
export function useStored<T>(key: string, fallback: T): T {
  return useSyncExternalStore(
    subscribe,
    () => snapshot(PREFIX + key, fallback, (r) => JSON.parse(r) as T),
    () => fallback,
  );
}

/** Prefikssiz xom qiymat (masalan, asosiy sayt bilan umumiy til kaliti). */
export function useRawStored(fullKey: string, fallback: string): string {
  return useSyncExternalStore(
    subscribe,
    () => snapshot(fullKey, fallback, (r) => r),
    () => fallback,
  );
}

/** Faqat brauzerda `true` bo'ladi (gidratatsiyadan keyin). */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
function noopSubscribe() {
  return () => {};
}
