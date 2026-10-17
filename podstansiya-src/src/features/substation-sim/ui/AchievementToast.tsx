"use client";

// Yangi yutuq bildirishnomasi (butun ilova bo'ylab, yuqori o'ng burchakda).

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect } from "react";
import { ACHIEVEMENTS } from "../data/achievements";
import { uz } from "../i18n/uz";
import { playSound } from "../lib/sound";
import { useAchievements } from "../store/achievements";

export default function AchievementToast() {
  const fresh = useAchievements((s) => s.fresh);
  const dismiss = useAchievements((s) => s.dismissFresh);
  useEffect(() => {
    if (!fresh.length) return;
    playSound("unlock");
    const t = window.setTimeout(dismiss, 6000);
    return () => window.clearTimeout(t);
  }, [fresh, dismiss]);
  const items = fresh.map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter((a) => !!a);

  return (
    <div className="pointer-events-none fixed right-3 top-16 z-[60] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {items.map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="pointer-events-auto card flex items-center gap-3 border-warn/60 bg-ink-850 p-3 shadow-xl"
            role="status"
          >
            <span className="text-3xl" aria-hidden="true">
              {a.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-warn">{uz.ach.unlocked}</span>
              <span className="block font-bold">{a.title}</span>
              <Link href="/yutuqlar/" className="text-xs text-accent underline" onClick={dismiss}>
                {uz.ach.viewAll}
              </Link>
            </span>
            <button type="button" className="self-start text-muted hover:text-text" onClick={dismiss} aria-label={uz.common.close}>
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
