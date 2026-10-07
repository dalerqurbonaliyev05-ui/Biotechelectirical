"use client";
import { useEffect, useState } from "react";
import { CATALOG, formatScore, type Slug } from "@/data/catalog";
import { leaderboard, type LeaderboardEntry, type Period } from "@/lib/games/leaderboard";
import { fmtDate } from "@/lib/games/hooks";
import { subscribe } from "@/lib/games/storage";
import { usePick, useT } from "@/lib/i18n";
import s from "./Pages.module.css";

const PERIODS: Period[] = ["day", "week", "all"];

export default function LeaderboardView() {
  const t = useT();
  const pick = usePick();
  const [game, setGame] = useState<Slug>("besh-tosh");
  const [period, setPeriod] = useState<Period>("all");
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  const info = CATALOG.find((c) => c.slug === game)!;

  useEffect(() => {
    let alive = true;
    const load = () => {
      void leaderboard.top(game, period).then((r) => {
        if (alive) setRows(r);
      });
    };
    load();
    const off = subscribe(load);
    return () => {
      alive = false;
      off();
    };
  }, [game, period]);


  return (
    <div className="container">
      <header className={s.head}>
        <h1>🏆 {t("lb.title")}</h1>
        <p>{t("lb.lead")}</p>
        <p className={s.deviceNote}>📱 {t("lb.device")}</p>
      </header>

      <div className={s.filters}>
        <label className={s.select}>
          <span>{t("lb.game")}</span>
          <select value={game} onChange={(e) => setGame(e.target.value as Slug)}>
            {CATALOG.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.emoji} {pick(c.title)}
              </option>
            ))}
          </select>
        </label>
        <div className="seg" role="group" aria-label={t("lb.period")}>
          {PERIODS.map((p) => (
            <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}>
              {t(`lb.period.${p}`)}
            </button>
          ))}
        </div>
      </div>

      <div className={s.tableWrap}>
        <table className={s.table}>
          <caption className="sr-only">
            {pick(info.title)} — {t(`lb.period.${period}`)}
          </caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">{t("lb.name")}</th>
              <th scope="col">{t("lb.score")}</th>
              <th scope="col">{t("lb.date")}</th>
            </tr>
          </thead>
          <tbody>
            {rows && rows.length === 0 && (
              <tr>
                <td colSpan={4} className={s.empty}>
                  {t("lb.empty")}
                </td>
              </tr>
            )}
            {rows?.map((r, i) => (
              <tr key={r.id} className={i < 3 ? s.podium : undefined}>
                <td>{["🥇", "🥈", "🥉"][i] ?? i + 1}</td>
                <td>{r.name}</td>
                <td>
                  <b>{formatScore(r.score, info.unit, t(info.unit === "m" ? "unit.m" : "unit.points"))}</b>
                  {r.detail && <small className={s.sub}>{r.detail}</small>}
                </td>
                <td className={s.date}>{fmtDate(r.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* TODO(keyingi bosqich): Supabase ulangach "Onlayn reyting" tabi va onlayn 1v1 rejimi. */}
    </div>
  );
}
