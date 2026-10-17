"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Icon from "./Icon";
import { uz } from "../i18n/uz";
import { MAIN_SITE_HREF } from "../lib/site";
import { useSettings } from "../store/settings";
import { useProgress } from "../store/progress";
import { useHydrated } from "../store/hydration";
import { SCENARIO_CATALOG } from "../data/scenarios/catalog";

const ITEMS = [
  { href: "/stsenariylar/", icon: "play", title: uz.menu.start, hint: uz.menu.startHint, primary: true },
  { href: "/mashqlar/", icon: "task", title: uz.menu.minigames, hint: uz.menu.minigamesHint },
  { href: "/ensiklopediya/", icon: "book", title: uz.menu.encyclopedia, hint: uz.menu.encyclopediaHint },
  { href: "/natijalar/", icon: "trophy", title: uz.menu.results, hint: uz.menu.resultsHint },
  { href: "/reyting/", icon: "trophy", title: uz.menu.leaderboard, hint: uz.menu.leaderboardHint },
  { href: "/yutuqlar/", icon: "star", title: uz.menu.achievements, hint: uz.menu.achievementsHint },
  { href: "/glossariy/", icon: "info", title: uz.menu.glossary, hint: uz.menu.glossaryHint },
  { href: "/sozlamalar/", icon: "settings", title: uz.menu.settings, hint: uz.menu.settingsHint },
];

export default function MainMenu() {
  const hydrated = useHydrated();
  const mode = useSettings((s) => s.mode);
  const animations = useSettings((s) => s.animations);
  const results = useProgress((s) => s.results);
  const playable = SCENARIO_CATALOG.filter((s) => s.playable);
  const done = playable.filter((s) => results[s.id]?.completed).length;

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-[1.1fr_1fr] md:py-14">
      <section>
        <p className="chip border-accent/50 text-accent">TDTU · Elektr ta&apos;minoti</p>
        <h1 className="h-display mt-4 text-3xl font-bold leading-tight sm:text-4xl">{uz.app.title}</h1>
        <p className="mt-3 text-lg text-accent">«{uz.app.slogan}»</p>
        <p className="mt-4 max-w-prose text-muted">{uz.app.description}</p>
        <div className="mt-6 flex flex-wrap gap-2 text-sm" aria-live="polite">
          <span className="chip">
            {uz.menu.currentMode}: <b className="text-text">{hydrated ? uz.modes[mode].name : "…"}</b>
          </span>
          <span className="chip">
            {uz.menu.progress}:{" "}
            <b className="text-text">
              {hydrated ? done : "…"}/{playable.length || SCENARIO_CATALOG.length}
            </b>{" "}
            {uz.menu.completed}
          </span>
        </div>
      </section>

      <nav aria-label={uz.app.shortTitle} className="flex flex-col gap-3">
        {ITEMS.map((it, i) => (
          <motion.div
            key={it.href}
            initial={animations ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <Link
              href={it.href}
              className={`card group flex items-center gap-4 p-4 transition hover:border-accent/70 ${
                it.primary ? "bg-gradient-to-r from-accent/25 to-ink-850/80" : ""
              }`}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent group-hover:bg-accent group-hover:text-white">
                <Icon name={it.icon} className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold">{it.title}</span>
                <span className="block text-sm text-muted">{it.hint}</span>
              </span>
            </Link>
          </motion.div>
        ))}
        <a href={MAIN_SITE_HREF} className="card group flex items-center gap-4 p-4 transition hover:border-danger/60">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger">
            <Icon name="exit" className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-base font-bold">{uz.menu.exit}</span>
            <span className="block text-sm text-muted">{uz.menu.exitHint}</span>
          </span>
        </a>
      </nav>
    </div>
  );
}
