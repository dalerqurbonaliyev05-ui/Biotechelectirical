"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MODE_RULES } from "../data/rules";
import { formatClock } from "../engine/journal";
import { computeScore } from "../engine/scoring";
import { uz } from "../i18n/uz";
import { useHydrated } from "../store/hydration";
import { useSession } from "../store/session";
import { useSettings } from "../store/settings";
import BriefingModal from "./BriefingModal";
import DispatcherPhone, { usePendingCalls } from "./DispatcherPhone";
import DocumentsPanel from "./DocumentsPanel";
import PrintArea from "./docs/PrintArea";
import EquipmentPanel from "./EquipmentPanel";
import FeedbackStack from "./FeedbackStack";
import { formatDuration } from "./format";
import Icon from "./Icon";
import PlanView from "./PlanView";
import ResultScreen from "./ResultScreen";
import SingleLineDiagram, { Legend } from "./SingleLineDiagram";
import TaskCard from "./TaskCard";
import { useDerived } from "./useDerived";

type SideTab = "task" | "equipment" | "phone" | "docs";
const G = uz.game;

export default function GameScreen({ scenarioId }: { scenarioId: string }) {
  const hydrated = useHydrated();
  const mode = useSettings((s) => s.mode);
  const start = useSession((s) => s.start);
  const dispatch = useSession((s) => s.dispatch);
  const selected = useSession((s) => s.selected);
  const focus = useSession((s) => s.focus);
  const briefingOpen = useSession((s) => s.briefingOpen);
  const startedAt = useSession((s) => s.startedAt);
  const { ctx, sim } = useDerived();
  const [view, setView] = useState<"scheme" | "plan">("scheme");
  const [tab, setTab] = useState<SideTab>("phone");
  const [now, setNow] = useState(0);
  const pending = usePendingCalls();
  const openEquipment = useCallback(() => setTab("equipment"), []);

  // Stsenariyni ishga tushirish (sozlamalar tiklangandan keyin — rejim kerak)
  useEffect(() => {
    if (hydrated) start(scenarioId, mode);
  }, [hydrated, scenarioId, mode, start]);

  const running = sim?.status === "running" && !briefingOpen;

  // Real vaqt: har soniyada simulyatsiya soati va harorat modeli oldinga
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") dispatch({ type: "tick", dtSec: 1 });
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(t);
  }, [running, dispatch]);

  // Uskuna tanlanganda — uskuna paneli; ekskursiyada tanlash = ko'rib chiqish
  useEffect(() => {
    if (!selected || !ctx || !sim || sim.status !== "running") return;
    if (ctx.scenario.kind === "tour" && !sim.inspected.includes(selected)) dispatch({ type: "inspect", targetId: selected });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat tanlov o'zgarganda
  }, [selected]);

  if (!hydrated || !ctx || !sim || ctx.scenario.id !== scenarioId) {
    return <p className="p-8 text-center text-muted">{G.loading}</p>;
  }

  if (sim.status !== "running") return <ResultScreen />;

  const rules = MODE_RULES[ctx.mode];
  const elapsed = briefingOpen || !now ? 0 : Math.max(0, Math.round((now - startedAt) / 1000));
  const tabs: Array<{ id: SideTab; label: string; icon: string; badge?: number }> = [
    { id: "phone", label: G.tabs.phone, icon: "phone", badge: pending },
    { id: "task", label: G.tabs.task, icon: "task" },
    { id: "equipment", label: G.tabs.equipment, icon: "bolt" },
    { id: "docs", label: G.tabs.docs, icon: "doc" },
  ];
  const activeTab: SideTab = tab;

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-3.5rem-2.75rem)]">
      <BriefingModal />
      <PrintArea />
      {/* Yuqori panel */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line/60 px-3 py-2 text-sm">
        <Link href="/stsenariylar/" className="btn-ghost px-2.5 py-1.5" aria-label={G.exit}>
          <Icon name="back" className="h-4 w-4" />
        </Link>
        <span className="order-first w-full truncate font-bold sm:order-none sm:w-auto sm:min-w-0 sm:flex-1">
          <span className="font-mono text-accent">{ctx.scenario.id}</span> {ctx.scenario.title}
        </span>
        <span className="chip" title={G.clock}>
          🕐 <b className="font-mono text-text">{formatClock(sim.time)}</b>
        </span>
        <span className="chip">{uz.weather[ctx.scenario.situation.weather]}, {ctx.scenario.situation.ambientC} °C</span>
        <span className="chip" title={G.elapsed}>
          ⏱ <span className="font-mono">{formatDuration(elapsed)}</span>
        </span>
        <span className="chip border-accent/50 text-accent">{uz.modes[ctx.mode].name}</span>
        {rules.hints !== "none" && (
          <span className="chip" title={G.scoreLive}>
            ★ <b className="font-mono text-text">{computeScore(sim.penalties)}</b>
          </span>
        )}
        <button
          type="button"
          className="btn-ghost px-3 py-1.5"
          onClick={() => {
            if (window.confirm(G.finishConfirm)) dispatch({ type: "finish" });
          }}
        >
          {G.finish}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Sxema / reja */}
        <section className="relative m-2 flex h-[62dvh] min-h-[340px] flex-col overflow-hidden rounded-2xl border border-line/60 bg-ink-950/60 lg:h-auto">
          <div className="flex flex-wrap items-center gap-1 border-b border-line/50 p-1.5">
            <div className="flex gap-1" role="tablist" aria-label={G.tabs.scheme}>
            {(["scheme", "plan"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${view === v ? "bg-accent text-white" : "text-muted hover:text-text"}`}
                onClick={() => setView(v)}
              >
                <Icon name={v === "scheme" ? "bolt" : "map"} className="mr-1 inline h-4 w-4" />
                {v === "scheme" ? G.tabs.scheme : G.tabs.plan}
              </button>
            ))}
            </div>
            {view === "scheme" && (
              <div className="ml-auto pr-1">
                <Legend />
              </div>
            )}
          </div>
          <div className="relative min-h-0 flex-1">
            {view === "scheme" ? (
              <SingleLineDiagram />
            ) : (
              <PlanView
                onGo={(id) => {
                  focus(id);
                  setView("scheme");
                  setTab("equipment");
                }}
              />
            )}
            <FeedbackStack variant="overlay" />
          </div>
        </section>

        {/* Yon panel */}
        <aside className="m-2 flex min-h-0 flex-col rounded-2xl border border-line/60 bg-ink-850/80">
          <div className="grid grid-cols-4 gap-1 border-b border-line/50 p-1.5" role="tablist" aria-label="Panel">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                className={`relative flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-semibold sm:text-xs ${
                  activeTab === t.id ? "bg-accent text-white" : "text-muted hover:text-text"
                }`}
                onClick={() => setTab(t.id)}
              >
                <Icon name={t.icon} className="h-4 w-4" />
                {t.label}
                {!!t.badge && (
                  <span className="absolute right-1 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] text-white" aria-label={G.newMessage}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="mb-3 empty:hidden">
              <FeedbackStack variant="inline" />
            </div>
            {activeTab === "task" && <TaskCard />}
            {activeTab === "equipment" && <EquipmentPanel />}
            {activeTab === "phone" && <DispatcherPhone />}
            {activeTab === "docs" && <DocumentsPanel />}
          </div>
        </aside>
      </div>
      <SelectWatcher onSelect={openEquipment} />
    </div>
  );
}

/** Uskuna tanlanganda yon panelni "Uskuna" ga o'tkazadi (tanlov hodisasiga obuna). */
function SelectWatcher({ onSelect }: { onSelect: () => void }) {
  useEffect(() => useSession.subscribe((s, prev) => {
    if (s.selected && s.selected !== prev.selected) onSelect();
  }), [onSelect]);
  return null;
}
