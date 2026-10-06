"use client";
import { useEffect, useEffectEvent, useSyncExternalStore } from "react";

function subscribeVisibility(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}

/** Sahifa ko'rinib turibdimi (boshqa tabga o'tilsa — false). */
export function usePageVisible(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState !== "hidden",
    () => true,
  );
}

/**
 * requestAnimationFrame sikli. `running` false bo'lsa yoki komponent o'chsa sikl to'xtaydi
 * (memory leak yo'q). dt — soniyalarda, sakrashlarning oldini olish uchun 0.05 bilan cheklangan.
 */
export function useRafLoop(step: (dt: number, now: number) => void, running: boolean): void {
  const onFrame = useEffectEvent(step);
  useEffect(() => {
    if (!running) return;
    let id = 0;
    let prev = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - prev) / 1000));
      prev = now;
      onFrame(dt, now);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [running]);
}

/** Klaviatura: berilgan tugmalar bosilganda (input ichida emas) chaqiradi. */
export function useKeys(keys: string[], handler: (e: KeyboardEvent) => void, enabled = true): void {
  const onKey = useEffectEvent(handler);
  const sig = keys.join("|");
  useEffect(() => {
    if (!enabled) return;
    const list = sig.split("|");
    const fn = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (!list.includes(e.code) && !list.includes(e.key)) return;
      if (e.repeat && e.code === "Space") {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      onKey(e);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [sig, enabled]);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Qisqa sana: 06.10 14:05 (tildan mustaqil, Intl'ning "M10" kabi formatlaridan qochish uchun). */
export function fmtDate(ms: number, withTime = true): string {
  const d = new Date(ms);
  const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  return withTime ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}
