"use client";
import Link from "next/link";
import { BY_SLUG, CATALOG, EXTRA_GAMES, MAIN_GAMES, formatScore, type CatalogItem } from "@/data/catalog";
import { ACHIEVEMENTS } from "@/lib/games/achievements";
import { useStats, useUnlocked } from "@/lib/games/progress";
import { usePick, useT } from "@/lib/i18n";
import s from "./HomeView.module.css";

function GameCard({ g, big }: { g: CatalogItem; big?: boolean }) {
  const t = useT();
  const pick = usePick();
  const stats = useStats();
  const best = stats.best[g.slug];
  return (
    <Link
      href={`/${g.slug}/`}
      className={`${s.card} ${big ? s.big : ""}`}
      style={{ "--accent": g.color } as React.CSSProperties}
    >
      <span className={s.cardEmoji} aria-hidden="true">
        {g.emoji}
      </span>
      <span className={s.cardBody}>
        <strong>{pick(g.title)}</strong>
        <span>{pick(g.tagline)}</span>
      </span>
      <span className={s.cardFoot}>
        <span className={s.best}>
          {best !== undefined ? `🏆 ${formatScore(best, g.unit, t(g.unit === "m" ? "unit.m" : "unit.points"))}` : t("home.new")}
        </span>
        <span className={s.go}>{t("home.play")} →</span>
      </span>
    </Link>
  );
}

export default function HomeView() {
  const t = useT();
  const pick = usePick();
  const stats = useStats();
  const unlocked = useUnlocked();
  const last = stats.last ? BY_SLUG[stats.last.slug] : undefined;
  const tried = CATALOG.filter((c) => (stats.plays[c.slug] ?? 0) > 0).length;
  const openCount = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;

  return (
    <>
      <section className={s.hero}>
        <div className={s.heroPattern} aria-hidden="true" />
        <div className={`container ${s.heroInner}`}>
          <p className={s.kicker}>
            <span aria-hidden="true">◆</span> {t("home.kicker")}
          </p>
          <h1 className={s.title}>{t("home.title")}</h1>
          <p className={s.lead}>{t("home.lead")}</p>
          <div className="row">
            <a href="#oyinlar" className="btn btn-gold">
              {t("home.cta")}
            </a>
            <Link href="/yutuqlar/" className="btn btn-ghost">
              🏅 {t("nav.achievements")}
            </Link>
          </div>
        </div>
      </section>

      <div className="container">
        {last && (
          <Link
            href={`/${last.slug}/`}
            className={s.continue}
            style={{ "--accent": last.color } as React.CSSProperties}
          >
            <span className={s.cardEmoji} aria-hidden="true">
              {last.emoji}
            </span>
            <span>
              <small>{t("home.continue")}</small>
              <strong>{pick(last.title)}</strong>
            </span>
            <span className={s.go}>▶</span>
          </Link>
        )}

        <h2 id="oyinlar" className={s.h2}>
          {t("home.games")}
        </h2>
        <div className={s.grid}>
          {MAIN_GAMES.map((g) => (
            <GameCard key={g.slug} g={g} big />
          ))}
        </div>

        <h2 className={s.h2}>{t("home.extras")}</h2>
        <div className={s.grid}>
          {EXTRA_GAMES.map((g) => (
            <GameCard key={g.slug} g={g} />
          ))}
        </div>

        <h2 className={s.h2}>{t("home.stats")}</h2>
        <div className={s.stats}>
          <div className={s.stat}>
            <strong>{stats.total}</strong>
            <span>{t("stats.played")}</span>
          </div>
          <div className={s.stat}>
            <strong>
              {tried}/{CATALOG.length}
            </strong>
            <span>{t("stats.tried")}</span>
          </div>
          <Link href="/yutuqlar/" className={s.stat}>
            <strong>
              {openCount}/{ACHIEVEMENTS.length}
            </strong>
            <span>{t("stats.achievements")} →</span>
          </Link>
          <Link href="/reyting/" className={s.stat}>
            <strong>🏆</strong>
            <span>{t("home.allLeaderboard")} →</span>
          </Link>
        </div>
        <p className={s.note}>🔒 {t("home.privacy")}</p>
      </div>
    </>
  );
}
