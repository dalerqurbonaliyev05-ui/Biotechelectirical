"use client";

import { useState } from "react";
import { GLOSSARY } from "../data/glossary";
import { uz } from "../i18n/uz";
import ScreenHeader from "./ScreenHeader";

export default function GlossaryScreen() {
  const [q, setQ] = useState("");
  const all = Object.entries(GLOSSARY)
    .filter(([key]) => key !== "point")
    // Brauzer va build (Node) ICU tartibi farq qilmasligi uchun oddiy taqqoslash (aks holda gidratatsiya xatosi)
    .sort(([, a], [, b]) => (a.term.toLowerCase() < b.term.toLowerCase() ? -1 : 1));
  const needle = q.trim().toLowerCase();
  const list = needle ? all.filter(([, e]) => `${e.term} ${e.short} ${e.text}`.toLowerCase().includes(needle)) : all;
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <ScreenHeader title={uz.gloss.title} subtitle={uz.gloss.subtitle} />
      <label className="block text-sm text-muted">
        {uz.gloss.search}
        <input type="search" className="mt-1 w-full rounded-lg border border-line bg-ink-900 px-3 py-2 text-text" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <p className="mt-2 text-xs text-muted" aria-live="polite">
        {list.length} / {all.length}
      </p>
      <dl className="mt-3 flex flex-col gap-3">
        {list.map(([key, e]) => (
          <div key={key} id={key} className="card scroll-mt-20 p-4">
            <dt className="font-bold text-accent">{e.term}</dt>
            <dd className="mt-1 font-semibold">{e.short}</dd>
            <dd className="mt-2 text-sm leading-relaxed text-muted">{e.text}</dd>
          </div>
        ))}
        {list.length === 0 && <p className="text-muted">{uz.gloss.none}</p>}
      </dl>
    </div>
  );
}
