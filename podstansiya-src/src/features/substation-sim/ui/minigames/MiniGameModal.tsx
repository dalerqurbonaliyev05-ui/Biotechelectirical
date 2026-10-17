"use client";

import { useEffect, useRef } from "react";
import { uz } from "../../i18n/uz";
import type { MiniGameResult } from "./common";
import { MINI_GAMES, type MiniGameKind } from "./index";

/** Mini-o'yin oynasi: o'yinni kechiktirib yuklaydi; Escape yoki ✕ — yopish, "o'tkazib yuborish" — natijani darhol olish. */
export default function MiniGameModal({
  kind,
  title,
  props,
  onDone,
  onClose,
  allowSkip = true,
}: {
  kind: MiniGameKind;
  title?: string;
  props?: Record<string, unknown>;
  onDone: (r: MiniGameResult) => void;
  onClose: () => void;
  allowSkip?: boolean;
}) {
  const Game = MINI_GAMES[kind];
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="mini-title">
      <div ref={ref} tabIndex={-1} className="card max-h-[92dvh] w-full max-w-xl overflow-y-auto p-4 outline-none sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 id="mini-title" className="h-display text-lg font-bold">
            {title ?? uz.mini.games[kind].title}
          </h2>
          <button type="button" className="text-muted hover:text-text" onClick={onClose} aria-label={uz.common.close}>
            ✕
          </button>
        </div>
        <Game {...props} onDone={onDone} />
        {allowSkip && (
          <button type="button" className="mt-4 text-xs text-muted underline hover:text-text" onClick={() => onDone({ score: null })}>
            {uz.mini.skip}
          </button>
        )}
      </div>
    </div>
  );
}
