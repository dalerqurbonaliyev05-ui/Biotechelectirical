"use client";
import { useEffect, useState } from "react";
import type { Achievement } from "@/lib/games/achievements";
import { sfx } from "@/lib/games/audio";
import { onUnlock } from "@/lib/games/progress";
import { usePick, useT } from "@/lib/i18n";
import s from "./Toaster.module.css";

interface Toast {
  key: number;
  a: Achievement;
}

let seq = 0;

export default function Toaster() {
  const t = useT();
  const pick = usePick();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(
    () =>
      onUnlock((a) => {
        const key = ++seq;
        setToasts((list) => [...list, { key, a }]);
        sfx.unlock();
        window.setTimeout(() => setToasts((list) => list.filter((x) => x.key !== key)), 4200);
      }),
    [],
  );

  return (
    <div className={s.wrap} role="status" aria-live="polite">
      {toasts.map(({ key, a }) => (
        <div key={key} className={s.toast}>
          <span className={s.badge} aria-hidden="true">
            {a.emoji}
          </span>
          <div>
            <small>{t("ach.unlocked")}</small>
            <strong>{pick(a.title)}</strong>
            <span>{pick(a.desc)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
