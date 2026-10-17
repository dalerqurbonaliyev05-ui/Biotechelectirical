"use client";

import { useState } from "react";
import { uz } from "../i18n/uz";
import JournalPanel from "./docs/JournalPanel";
import PermitPanel from "./docs/PermitPanel";
import ProtocolPanel from "./docs/ProtocolPanel";
import SwitchingBlank from "./docs/SwitchingBlank";
import { useDerived } from "./useDerived";

type DocTab = "permit" | "blank" | "protocol" | "journal";

/** Hujjatlar: naryad, kommutatsiya blankasi, sinov protokoli, operativ jurnal (stsenariyga keraklilari). */
export default function DocumentsPanel() {
  const { ctx } = useDerived();
  const sc = ctx?.scenario;
  const available: DocTab[] = [
    ...(sc?.permit || sc?.initial?.admitted ? (["permit"] as const) : []),
    ...(sc?.blank ? (["blank"] as const) : []),
    ...(sc?.protocol ? (["protocol"] as const) : []),
    "journal",
  ];
  const [picked, setPicked] = useState<DocTab | null>(null);
  const tab = picked && available.includes(picked) ? picked : available[0];

  return (
    <div className="flex flex-col gap-3">
      {available.length > 1 && (
        <div className="flex flex-wrap gap-1 rounded-xl bg-ink-900/70 p-1" role="tablist" aria-label={uz.game.tabs.docs}>
          {available.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`flex-1 rounded-lg px-2 py-1 text-xs font-semibold ${tab === t ? "bg-ink-700 text-text" : "text-muted hover:text-text"}`}
              onClick={() => setPicked(t)}
            >
              {uz.docs.tabs[t]}
            </button>
          ))}
        </div>
      )}
      {tab === "permit" && <PermitPanel />}
      {tab === "blank" && <SwitchingBlank />}
      {tab === "protocol" && <ProtocolPanel />}
      {tab === "journal" && <JournalPanel />}
    </div>
  );
}
