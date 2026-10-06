"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { BY_SLUG, formatScore, type Slug } from "@/data/catalog";
import type { GameContent, Section } from "@/data/content/types";
import { sfx } from "@/lib/games/audio";
import { usePageVisible } from "@/lib/games/hooks";
import { leaderboard } from "@/lib/games/leaderboard";
import { getPlayerName, NAME_KEY, reportResult, touchGame, useStats, type GameResult } from "@/lib/games/progress";
import { writeJSON } from "@/lib/games/storage";
import { usePick, useT } from "@/lib/i18n";
import SoundToggle from "@/components/site/SoundToggle";
import s from "./GameShell.module.css";

interface FinishArgs extends GameResult {
  /** Natija oynasidagi sarlavha (masalan, "1-o'yinchi g'alaba qozondi!") */
  headline?: string;
}

interface GameApi {
  slug: Slug;
  /** O'ynash tabi ochiq va sahifa ko'rinib turibdi */
  active: boolean;
  finish: (r: FinishArgs) => void;
  restart: () => void;
}

const GameCtx = createContext<GameApi | null>(null);

export function useGame(): GameApi {
  const v = useContext(GameCtx);
  if (!v) throw new Error("useGame() GameShell ichida ishlatilishi kerak");
  return v;
}

type Tab = "play" | "rules" | "history";
const TABS: Tab[] = ["play", "rules", "history"];

interface ResultState extends FinishArgs {
  isBest: boolean;
  entryId: string | null;
}

function Sections({ list }: { list: Section[] }) {
  return (
    <div className="prose">
      {list.map((sec, i) => (
        <section key={i}>
          {sec.h && <h3>{sec.h}</h3>}
          {sec.p?.map((p, j) => <p key={j}>{p}</p>)}
          {sec.ul && (
            <ul>
              {sec.ul.map((li, j) => (
                <li key={j}>{li}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

export default function GameShell({
  slug,
  content,
  children,
}: {
  slug: Slug;
  content: GameContent;
  children: React.ReactNode;
}) {
  const t = useT();
  const pick = usePick();
  const info = BY_SLUG[slug];
  const stats = useStats();
  const visible = usePageVisible();
  const [tab, setTab] = useState<Tab>("play");
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<ResultState | null>(null);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  useEffect(() => touchGame(slug), [slug]);

  const restart = useCallback(() => {
    setResult(null);
    setRound((r) => r + 1);
  }, []);

  const finish = useCallback(
    (r: FinishArgs) => {
      void reportResult(slug, r).then((info) => {
        setName(getPlayerName());
        setSaved(false);
        setResult({ ...r, isBest: info.isBest, entryId: info.entry?.id ?? null });
      });
    },
    [slug],
  );

  useEffect(() => {
    if (result) nameRef.current?.focus();
  }, [result]);

  const api = useMemo<GameApi>(
    () => ({ slug, active: tab === "play" && visible && !result, finish, restart }),
    [slug, tab, visible, result, finish, restart],
  );

  const unitLabel = t(info.unit === "m" ? "unit.m" : "unit.points");
  const best = stats.best[slug];

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = (i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    setTab(TABS[n]);
    tabRefs.current[n]?.focus();
  };

  const saveName = async () => {
    const clean = name.trim().slice(0, 24);
    writeJSON(NAME_KEY, clean);
    if (result?.entryId) await leaderboard.rename(result.entryId, clean);
    setSaved(true);
    sfx.click();
  };

  return (
    <GameCtx.Provider value={api}>
      <div className={s.head} style={{ "--accent": info.color } as React.CSSProperties}>
        <div className="container">
          <Link href="/" className={s.back}>
            ← {t("shell.back")}
          </Link>
          <div className={s.titleRow}>
            <span className={s.emoji} aria-hidden="true">
              {info.emoji}
            </span>
            <div className={s.titleText}>
              <h1>{pick(info.title)}</h1>
              <p>{pick(info.tagline)}</p>
            </div>
          </div>
          <div className={s.toolbar}>
            <span className="chip">
              🏆 {t("shell.best")}: <b>{best !== undefined ? formatScore(best, info.unit, unitLabel) : "—"}</b>
            </span>
            <div className="row">
              <button type="button" className="btn btn-ghost btn-sm" onClick={restart}>
                ↻ {t("shell.restart")}
              </button>
              <SoundToggle className={`btn btn-ghost btn-sm ${s.soundBtn}`} />
            </div>
          </div>
          <div role="tablist" aria-label={pick(info.title)} className={s.tabs}>
            {TABS.map((id, i) => (
              <button
                key={id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                type="button"
                id={`${uid}-tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`${uid}-panel-${id}`}
                tabIndex={tab === id ? 0 : -1}
                className={s.tab}
                onClick={() => setTab(id)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                {t(`tab.${id}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container">
        <div
          role="tabpanel"
          id={`${uid}-panel-play`}
          aria-labelledby={`${uid}-tab-play`}
          hidden={tab !== "play"}
          className={s.panel}
        >
          <div key={round}>{children}</div>
        </div>
        <div
          role="tabpanel"
          id={`${uid}-panel-rules`}
          aria-labelledby={`${uid}-tab-rules`}
          hidden={tab !== "rules"}
          className={`${s.panel} ${s.text} panel`}
        >
          <Sections list={pick(content.rules)} />
        </div>
        <div
          role="tabpanel"
          id={`${uid}-panel-history`}
          aria-labelledby={`${uid}-tab-history`}
          hidden={tab !== "history"}
          className={`${s.panel} ${s.text} panel`}
        >
          <Sections list={pick(content.history)} />
          <h3 className={s.factsTitle}>✨ {t("shell.facts")}</h3>
          <ul className={s.facts}>
            {pick(content.facts).map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      </div>

      {result && (
        <div className={s.backdrop} onClick={(e) => e.target === e.currentTarget && setResult(null)}>
          <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby={`${uid}-res`}>
            <div className="ikat-band" aria-hidden="true" />
            <div className={s.modalBody}>
              <h2 id={`${uid}-res`}>{result.headline ?? t("res.title")}</h2>
              {!result.noLeaderboard && (
                <p className={s.bigScore}>{formatScore(result.score, info.unit, unitLabel)}</p>
              )}
              {result.detail && <p className={s.detail}>{result.detail}</p>}
              {result.isBest && <p className={s.newBest}>🎉 {t("res.newBest")}</p>}
              {result.entryId && (
                <form
                  className={s.nameForm}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveName();
                  }}
                >
                  <label htmlFor={`${uid}-name`}>{t("res.name")}</label>
                  <div className="row">
                    <input
                      ref={nameRef}
                      id={`${uid}-name`}
                      value={name}
                      maxLength={24}
                      placeholder={t("res.namePh")}
                      autoComplete="nickname"
                      onChange={(e) => {
                        setName(e.target.value);
                        setSaved(false);
                      }}
                    />
                    <button type="submit" className="btn btn-gold btn-sm">
                      {saved ? `✓ ${t("res.saved")}` : t("res.save")}
                    </button>
                  </div>
                  <small>{t("res.local")}</small>
                </form>
              )}
              <div className="row center">
                <button type="button" className="btn btn-primary" onClick={restart}>
                  ↻ {t("res.again")}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setResult(null)}>
                  {t("res.close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </GameCtx.Provider>
  );
}
