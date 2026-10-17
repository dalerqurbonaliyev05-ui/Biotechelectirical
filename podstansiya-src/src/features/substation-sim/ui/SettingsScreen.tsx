"use client";

import { useAchievements } from "../store/achievements";
import { playSound } from "../lib/sound";
import { useState } from "react";
import ScreenHeader from "./ScreenHeader";
import { uz } from "../i18n/uz";
import { useSettings, type Difficulty, type GameMode } from "../store/settings";
import { useProgress } from "../store/progress";
import { useHydrated } from "../store/hydration";

const MODES: GameMode[] = ["training", "practice", "exam"];
const LEVELS: Difficulty[] = [1, 2, 3, 4];

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
        {value ? uz.common.on : uz.common.off}
        <input type="checkbox" role="switch" className="h-5 w-5 accent-[var(--color-accent)]" checked={value} onChange={(e) => onChange(e.target.checked)} />
      </span>
    </label>
  );
}

export default function SettingsScreen() {
  const hydrated = useHydrated();
  const s = useSettings();
  const saveProgress = useProgress((p) => p.markSaved);
  const resetProgress = useProgress((p) => p.reset);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ScreenHeader title={uz.settings.title} />
      {!hydrated ? (
        <p className="text-muted">{uz.app.loading}</p>
      ) : (
        <div className="flex flex-col gap-5">
          <section className="card p-5">
            <h2 className="mb-3 font-bold">{uz.settings.mode}</h2>
            <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={uz.settings.mode}>
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={s.mode === m}
                  onClick={() => s.setMode(m)}
                  className={`rounded-xl border p-3 text-left transition ${
                    s.mode === m ? "border-accent bg-accent/15" : "border-line hover:border-accent/60"
                  }`}
                >
                  <span className="flex items-center gap-2 font-bold">
                    {s.mode === m && <span aria-hidden="true">✓</span>}
                    {uz.modes[m].name}
                  </span>
                  <span className="mt-1 block text-xs text-muted">{uz.modes[m].desc}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-bold">{uz.settings.difficulty}</h2>
            <p className="mb-3 text-sm text-muted">{uz.settings.difficultyHint}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label={uz.settings.difficulty}>
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={s.difficulty === l}
                  onClick={() => s.setDifficulty(l)}
                  className={`rounded-xl border p-3 text-left ${s.difficulty === l ? "border-accent bg-accent/15" : "border-line hover:border-accent/60"}`}
                >
                  <span className="block text-xs text-muted">
                    {uz.common.level} {l}
                  </span>
                  <span className="block text-sm font-bold">{uz.levels[l].name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card divide-y divide-line/60 px-5 py-2">
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="font-semibold">{uz.settings.language}</span>
              <span className="text-right">
                <select className="rounded-lg border border-line bg-ink-800 px-3 py-1.5 text-sm" value="uz" disabled aria-label={uz.settings.language}>
                  <option value="uz">{uz.settings.languageUz}</option>
                </select>
                <span className="mt-1 block text-xs text-muted">{uz.settings.languageSoon}</span>
              </span>
            </div>
            <Toggle label={uz.settings.sound} hint={uz.settings.soundHint} value={s.sound} onChange={(v) => {
                s.setSound(v);
                if (v) playSound("ok");
              }} />
            <Toggle label={uz.settings.animations} hint={uz.settings.animationsHint} value={s.animations} onChange={s.setAnimations} />
            <Toggle label={uz.settings.hints} hint="" value={s.showLabels} onChange={s.setShowLabels} />
          </section>

          <section className="card p-5">
            <h2 className="font-bold">{uz.settings.storage}</h2>
            <p className="mb-4 text-sm text-muted">{uz.settings.storageHint}</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  saveProgress();
                  setMsg(uz.common.saved);
                }}
              >
                {uz.settings.saveNow}
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  if (window.confirm(uz.settings.resetConfirm)) {
                    resetProgress();
                    useAchievements.getState().reset();
                    setMsg(uz.settings.resetDone);
                  }
                }}
              >
                {uz.settings.resetProgress}
              </button>
            </div>
            <p className="mt-3 min-h-5 text-sm text-ok" role="status">
              {msg}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
