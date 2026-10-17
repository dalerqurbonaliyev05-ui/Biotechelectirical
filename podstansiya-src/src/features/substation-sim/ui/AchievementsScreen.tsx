"use client";

import { ACHIEVEMENTS } from "../data/achievements";
import { uz } from "../i18n/uz";
import { useAchievements } from "../store/achievements";
import { useHydrated } from "../store/hydration";
import ScreenHeader from "./ScreenHeader";
import { fmt } from "./text";

export default function AchievementsScreen() {
  const hydrated = useHydrated();
  const unlocked = useAchievements((s) => s.unlocked);
  const count = hydrated ? ACHIEVEMENTS.filter((a) => unlocked[a.id]).length : 0;
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <ScreenHeader title={uz.ach.title} subtitle={fmt(uz.ach.progress, { n: String(count), total: String(ACHIEVEMENTS.length) })} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const at = hydrated ? unlocked[a.id] : undefined;
          return (
            <li key={a.id} className={`card flex items-start gap-3 p-4 ${at ? "border-warn/60" : "opacity-70"}`}>
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl ${at ? "bg-warn/15" : "bg-ink-900 grayscale"}`} aria-hidden="true">
                {at ? a.icon : "🔒"}
              </span>
              <span className="min-w-0">
                <span className="block font-bold">{a.title}</span>
                <span className="block text-sm text-muted">{a.desc}</span>
                <span className={`mt-1 block text-xs ${at ? "text-warn" : "text-muted"}`}>
                  {at ? `${uz.ach.unlockedAt}: ${new Date(at).toLocaleDateString("uz-UZ")}` : uz.ach.locked}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
