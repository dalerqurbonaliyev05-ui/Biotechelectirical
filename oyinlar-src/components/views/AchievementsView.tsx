"use client";
import Link from "next/link";
import { useState } from "react";
import { CATALOG, formatScore } from "@/data/catalog";
import { ACHIEVEMENTS } from "@/lib/games/achievements";
import { fmtDate } from "@/lib/games/hooks";
import { resetAll, useStats, useUnlocked } from "@/lib/games/progress";
import { useIsClient } from "@/lib/games/storage";
import { usePick, useT } from "@/lib/i18n";
import s from "./Pages.module.css";

export default function AchievementsView() {
  const t = useT();
  const pick = usePick();
  const stats = useStats();
  const unlocked = useUnlocked();
  const client = useIsClient();
  const [confirm, setConfirm] = useState(false);
  const open = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;
  const pct = Math.round((open / ACHIEVEMENTS.length) * 100);

  return (
    <div className="container">
      <header className={s.head}>
        <h1>🏅 {t("ach.title")}</h1>
        <p>{t("ach.lead")}</p>
        <div className={s.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <p className={s.progressText}>{t("ach.progress", { n: open, m: ACHIEVEMENTS.length })}</p>
      </header>

      <ul className={s.badges}>
        {ACHIEVEMENTS.map((a) => {
          const at = unlocked[a.id];
          return (
            <li key={a.id} className={`${s.badge} ${at ? s.on : s.off}`}>
              <span className={s.medal} aria-hidden="true">
                {at ? a.emoji : "🔒"}
              </span>
              <div>
                <strong>{pick(a.title)}</strong>
                <span>{pick(a.desc)}</span>
                <small>{at && client ? `✓ ${fmtDate(at, false)}` : t("ach.locked")}</small>
              </div>
            </li>
          );
        })}
      </ul>

      <h2 className={s.h2}>{t("ach.stats")}</h2>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">{t("lb.game")}</th>
              <th scope="col">{t("ach.plays")}</th>
              <th scope="col">{t("ach.best")}</th>
            </tr>
          </thead>
          <tbody>
            {CATALOG.map((c) => (
              <tr key={c.slug}>
                <td>
                  <Link href={`/${c.slug}/`}>
                    {c.emoji} {pick(c.title)}
                  </Link>
                </td>
                <td>{stats.plays[c.slug] ?? 0}</td>
                <td>
                  {stats.best[c.slug] !== undefined
                    ? formatScore(stats.best[c.slug]!, c.unit, t(c.unit === "m" ? "unit.m" : "unit.points"))
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={s.danger}>
        {!confirm ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(true)}>
            🗑 {t("ach.reset")}
          </button>
        ) : (
          <div className="row">
            <span>{t("ach.resetConfirm")}</span>
            <button
              type="button"
              className="btn btn-red btn-sm"
              onClick={() => {
                void resetAll();
                setConfirm(false);
              }}
            >
              {t("ach.resetYes")}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>
              {t("res.close")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
