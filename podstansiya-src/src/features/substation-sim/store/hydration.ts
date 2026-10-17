"use client";

import { useSyncExternalStore } from "react";
import { useProgress } from "./progress";
import { useSettings } from "./settings";

let hydrated = false;
let started = false;
const listeners = new Set<() => void>();

// localStorage dan holatni bir marta tiklaydi (birinchi render server HTML bilan bir xil bo'lishi uchun).
function startHydration(): void {
  if (started) return;
  started = true;
  void Promise.all([useSettings.persist.rehydrate(), useProgress.persist.rehydrate()]).then(() => {
    hydrated = true;
    listeners.forEach((l) => l());
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  startHydration();
  return () => listeners.delete(listener);
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false,
  );
}
