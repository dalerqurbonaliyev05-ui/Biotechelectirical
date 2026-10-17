"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { uz } from "../i18n/uz";

/** Umumiy modal oyna: ochilganda fokus, Escape yoki ✕ bilan yopiladi. */
export default function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  // Faqat ochilganda fokus va Escape (har renderda fokus olinmasin)
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div ref={ref} tabIndex={-1} className={`card max-h-[92dvh] w-full overflow-y-auto p-4 outline-none sm:p-5 ${wide ? "max-w-3xl" : "max-w-xl"}`}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 id="modal-title" className="h-display text-lg font-bold">
            {title}
          </h2>
          <button type="button" className="text-muted hover:text-text" onClick={onClose} aria-label={uz.common.close}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
