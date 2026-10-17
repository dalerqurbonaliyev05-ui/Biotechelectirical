// localStorage ustidan xavfsiz qatlam: SSR, private rejim yoki to'lgan xotira xato bermaydi.
// useRawStored() useSyncExternalStore orqali ishlaydi: serverda va gidratatsiya paytida `fallback`,
// so'ng brauzerdagi haqiqiy qiymat — shuning uchun hydration mismatch bo'lmaydi.
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
// localStorage ishlamasa ham sessiya davomida qiymat yo'qolmasin.
const memory = new Map<string, string>();

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function readRaw(key: string): string | null {
  if (!hasWindow()) return null;
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

export function writeRaw(key: string, value: string): void {
  memory.set(key, value);
  if (hasWindow()) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* xotira bloklangan yoki to'lgan — sahifa baribir ishlayveradi */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = () => cb();
  if (hasWindow()) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (hasWindow()) window.removeEventListener("storage", onStorage);
  };
}

export function useRawStored(key: string, fallback: string): string {
  return useSyncExternalStore(
    subscribe,
    () => readRaw(key) ?? fallback,
    () => fallback,
  );
}
