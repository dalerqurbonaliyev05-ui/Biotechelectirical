"use client";

// Natija ekranida: shu urinishning reytingdagi o'rni; ism kiritilmagan bo'lsa — ism so'raladi.

import Link from "next/link";
import { useEffect, useState } from "react";
import { leaderboard } from "../lib/leaderboard";
import { uz } from "../i18n/uz";
import { useSession } from "../store/session";
import { useSettings } from "../store/settings";
import { fmt } from "./text";

const L = uz.lb;

export default function LeaderboardPlace() {
  const entry = useSession((s) => s.lbEntry);
  const playerName = useSettings((s) => s.playerName);
  const setPlayerName = useSettings((s) => s.setPlayerName);
  const [rank, setRank] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!entry) return;
    let alive = true;
    void leaderboard.top(entry.scenarioId, "all", "all", 1000).then((list) => {
      const i = list.findIndex((x) => x.name === entry.name);
      if (alive) setRank(i >= 0 ? i + 1 : null);
    });
    return () => {
      alive = false;
    };
  }, [entry, nonce]);

  if (!entry) return null;
  return (
    <div className="mt-4 rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm">
      <p className="flex flex-wrap items-center justify-between gap-2">
        <span>🏆 {rank ? fmt(L.yourPlace, { rank: String(rank), scenario: entry.scenarioId }) : "…"}</span>
        <Link href="/reyting/" className="text-accent underline">
          {L.open}
        </Link>
      </p>
      {!playerName.trim() && (
        <form
          className="mt-2 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            setPlayerName(name);
            void leaderboard.rename(entry.id, name).then(() => {
              useSession.setState({ lbEntry: { ...entry, name: name.trim() } });
              setNonce((n) => n + 1);
            });
          }}
        >
          <label className="text-muted" htmlFor="lb-name">
            {L.nameQ}
          </label>
          <input id="lb-name" className="w-44 rounded-lg border border-line bg-ink-900 px-2 py-1" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
          <button type="submit" className="btn-ghost px-3 py-1">
            {L.nameSave}
          </button>
        </form>
      )}
    </div>
  );
}
