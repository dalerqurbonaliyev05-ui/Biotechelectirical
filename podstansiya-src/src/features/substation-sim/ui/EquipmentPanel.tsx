"use client";

import { useState } from "react";
import { TOPOLOGY } from "../data/equipment";
import { GLOSSARY, glossaryKeyFor } from "../data/glossary";
import { getModel } from "../data/transformers";
import { MODE_RULES } from "../data/rules";
import { deviceCarriesCurrent, evaluateSwitch } from "../engine/interlocks";
import { isNodeEnergized, isNodeGrounded } from "../engine/network";
import { loadFactorOf, nodeVoltageKv, transformerLvKv } from "../engine/simulator";
import { thermalStatus } from "../engine/thermal";
import type { PosterKind, SwitchPos } from "../engine/types";
import { uz } from "../i18n/uz";
import { useSession } from "../store/session";
import { codeText } from "./text";
import { useDerived } from "./useDerived";

const E = uz.equipment;

function Row({ k, v, tone }: { k: string; v: React.ReactNode; tone?: "ok" | "bad" | "warn" }) {
  const c = tone === "ok" ? "text-ok" : tone === "bad" ? "text-danger" : tone === "warn" ? "text-warn" : "text-text";
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/40 py-1.5 text-sm last:border-0">
      <span className="text-muted">{k}</span>
      <span className={`text-right font-semibold ${c}`}>{v}</span>
    </div>
  );
}

function kindOf(id: string): { kind: string; kv?: number } | null {
  const sw = TOPOLOGY.switches.find((s) => s.id === id);
  if (sw) return { kind: sw.kind };
  if (TOPOLOGY.earthSwitches.some((e) => e.id === id)) return { kind: "earthSwitch" };
  if (TOPOLOGY.transformers.some((t) => t.id === id)) return { kind: "transformer" };
  if (TOPOLOGY.loads.some((l) => l.id === id)) return { kind: "load" };
  const ins = TOPOLOGY.instruments.find((i) => i.id === id);
  if (ins) return { kind: ins.kind };
  const node = TOPOLOGY.nodes.find((n) => n.id === id);
  if (node) return { kind: node.kind, kv: node.kv };
  return null;
}

export default function EquipmentPanel() {
  const { ctx, sim, net } = useDerived();
  const selected = useSession((s) => s.selected);
  const dispatch = useSession((s) => s.dispatch);
  const [showGloss, setShowGloss] = useState(false);
  if (!ctx || !sim || !net) return null;
  if (!selected) return <p className="text-sm text-muted">{E.selectHint}</p>;
  const k = kindOf(selected);
  if (!k) return <p className="text-sm text-muted">{E.selectHint}</p>;

  const running = sim.status === "running";
  const preview = MODE_RULES[ctx.mode].hints === "full";
  const gloss = GLOSSARY[glossaryKeyFor(k.kind === "VT" || k.kind === "CT" || k.kind === "SA" ? k.kind : k.kind)];

  const switchButton = (id: string, to: SwitchPos, label: string) => {
    const r = preview ? evaluateSwitch(ctx.topology, sim, id, to, { orderRequired: ctx.scenario.orderRequired }) : null;
    const warn = r && (r.severity === "violation" || r.severity === "critical") ? codeText(r.code, r.params) : null;
    return (
      <div key={`${id}-${to}`} className="flex flex-col gap-1">
        <button type="button" className={warn ? "btn-ghost border-warn/60" : "btn-primary"} disabled={!running} onClick={() => dispatch({ type: "switch", deviceId: id, to })}>
          {label}
        </button>
        {warn && (
          <p className="text-xs text-warn" role="note">
            ⚠ {E.preview}: {warn.title}
          </p>
        )}
      </div>
    );
  };

  const posterButton = (targetId: string, poster: PosterKind) => {
    const on = (sim.posters[targetId] ?? []).includes(poster);
    return (
      <button key={poster} type="button" className="btn-ghost" disabled={!running} onClick={() => dispatch({ type: "poster", targetId, poster, on: !on })}>
        {on ? E.posterOff : E.posterOn} {uz.posters[poster]}
      </button>
    );
  };

  const postersRow = (id: string) => {
    const list = sim.posters[id] ?? [];
    return <Row k={E.posters} v={list.length ? list.map((p) => uz.posters[p]).join(", ") : E.noPosters} tone={list.length ? "warn" : undefined} />;
  };

  let body: React.ReactNode = null;
  let title = selected;

  if (k.kind === "breaker" || k.kind === "disconnector") {
    const sw = TOPOLOGY.switches.find((s) => s.id === selected)!;
    const closed = sim.devices[selected] === "closed";
    const live = isNodeEnergized(net, sw.a) || isNodeEnergized(net, sw.b);
    const kv = TOPOLOGY.nodes.find((n) => n.id === sw.a)?.kv ?? 0;
    const current = deviceCarriesCurrent(ctx.topology, sim, selected);
    body = (
      <>
        <Row k={E.state} v={closed ? E.closed : E.open} tone={closed ? "ok" : undefined} />
        <Row k={E.voltage} v={live ? `${kv} kV — ${E.live}` : E.dead} tone={live ? "warn" : undefined} />
        <Row k={E.current} v={current ? E.currentYes : E.currentNo} tone={current ? "warn" : undefined} />
        {k.kind === "breaker" && sim.positionChecked[selected] && <Row k={E.positionChecked} v="✓" tone="ok" />}
        {postersRow(selected)}
        <div className="mt-3 flex flex-col gap-2">
          {k.kind === "breaker"
            ? switchButton(selected, closed ? "open" : "closed", closed ? E.breakerOpen : E.breakerClose)
            : switchButton(selected, closed ? "open" : "closed", closed ? E.discOpen : E.discClose)}
          {k.kind === "breaker" && (
            <button type="button" className="btn-ghost" disabled={!running} onClick={() => dispatch({ type: "checkPosition", deviceId: selected })}>
              {E.checkPosition}
            </button>
          )}
          {posterButton(selected, "doNotSwitch")}
        </div>
      </>
    );
  } else if (k.kind === "earthSwitch") {
    const es = TOPOLOGY.earthSwitches.find((e) => e.id === selected)!;
    const closed = sim.devices[selected] === "closed";
    const live = isNodeEnergized(net, es.node);
    body = (
      <>
        <Row k={E.state} v={closed ? `${E.closed} (${E.earthed})` : E.open} tone={closed ? "ok" : undefined} />
        <Row k={E.voltage} v={live ? E.live : E.dead} tone={live ? "bad" : undefined} />
        {sim.verifiedDead[es.node] !== undefined && <Row k={E.verifyDead} v="✓" tone="ok" />}
        <div className="mt-3 flex flex-col gap-2">
          {!closed && (
            <button type="button" className="btn-ghost" disabled={!running} onClick={() => dispatch({ type: "verifyDead", nodeId: es.node })}>
              {E.verifyDead}
            </button>
          )}
          {switchButton(selected, closed ? "open" : "closed", closed ? E.earthOpen : E.earthClose)}
        </div>
      </>
    );
  } else if (k.kind === "transformer") {
    const t = TOPOLOGY.transformers.find((x) => x.id === selected)!;
    const m = getModel(t.model);
    const kf = loadFactorOf(ctx, sim, net, t.id);
    const energized = net.transformerEnergized[t.id];
    const oil = sim.oilTemp[t.id];
    const ts = thermalStatus(oil, m.cooling.value);
    const busy = sim.time < (sim.rpnBusyUntil[t.id] ?? 0);
    const u10 = transformerLvKv(ctx, sim, net, t.id);
    title = `${t.id} — ${m.markCyr}`;
    body = (
      <>
        <Row k={E.state} v={energized ? E.live : E.dead} tone={energized ? "warn" : undefined} />
        <Row k={E.rated} v={`${m.ratedMva.value} MVA · ${m.hvKv.value}/${m.mvKv?.value}/${m.lvKv.value} kV`} />
        <Row k={E.load} v={`${Math.round(kf * 100)}%`} tone={kf > 1 ? "bad" : kf > 0.9 ? "warn" : undefined} />
        <Row k={E.oil} v={`${oil.toFixed(1)} °C`} tone={ts === "overLimit" ? "bad" : ts === "alarm" ? "warn" : undefined} />
        <Row k={E.fans} v={sim.fans[t.id] ? uz.common.on : uz.common.off} />
        <Row k={E.tap} v={`${sim.taps[t.id] > 0 ? "+" : ""}${sim.taps[t.id]} / ±${m.rpn.value.steps} (${m.rpn.value.stepPct}%)`} />
        <Row k={E.lvVoltage} v={energized ? `${u10.toFixed(2)} kV` : "—"} />
        {postersRow(t.id)}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn-primary" disabled={!running || busy || !energized} onClick={() => dispatch({ type: "tap", transformerId: t.id, dir: 1 })}>
            {E.rpnUp}
          </button>
          <button type="button" className="btn-ghost" disabled={!running || busy || !energized} onClick={() => dispatch({ type: "tap", transformerId: t.id, dir: -1 })}>
            {E.rpnDown}
          </button>
        </div>
        {busy && (
          <p className="mt-1 animate-pulse text-xs text-accent" role="status">
            {E.rpnBusy}
          </p>
        )}
        <div className="mt-2 flex flex-col gap-2">
          <button type="button" className="btn-ghost" disabled={!running} onClick={() => dispatch({ type: "fans", transformerId: t.id, on: !sim.fans[t.id] })}>
            {sim.fans[t.id] ? E.fansOff : E.fansOn}
          </button>
          {posterButton(t.id, "workHere")}
        </div>
      </>
    );
  } else if (k.kind === "load") {
    const l = TOPOLOGY.loads.find((x) => x.id === selected)!;
    const ok = net.loadSupplied[l.id];
    title = l.label;
    body = (
      <>
        <Row k={E.category} v={`${l.category}-toifa`} tone={l.category === 1 ? "warn" : undefined} />
        <Row k={E.power} v={`${(l.mw * sim.loadFactor).toFixed(1)} MVt`} />
        <Row k={E.supplied} v={ok ? E.suppliedYes : E.suppliedNo} tone={ok ? "ok" : "bad"} />
      </>
    );
  } else if (k.kind === "CT" || k.kind === "VT" || k.kind === "SA") {
    const ins = TOPOLOGY.instruments.find((i) => i.id === selected)!;
    body = <Row k={E.voltage} v={isNodeEnergized(net, ins.node) ? E.live : E.dead} />;
  } else {
    const node = TOPOLOGY.nodes.find((n) => n.id === selected)!;
    const live = isNodeEnergized(net, node.id);
    title = node.label ?? node.id;
    body = (
      <>
        <Row k={E.voltage} v={live ? `${nodeVoltageKv(ctx, sim, net, node.id).toFixed(node.kv >= 110 ? 1 : 2)} kV` : E.dead} tone={live ? "warn" : undefined} />
        {isNodeGrounded(net, node.id) && <Row k={E.state} v={E.earthed} tone="ok" />}
        <div className="mt-3">
          <button type="button" className="btn-ghost w-full" disabled={!running} onClick={() => dispatch({ type: "verifyDead", nodeId: node.id })}>
            {E.verifyDead}
          </button>
        </div>
      </>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">{E.kinds[k.kind] ?? k.kind}</p>
      <h3 className="h-display mb-2 text-lg font-bold">{title}</h3>
      {body}
      {gloss && (
        <div className="mt-4 rounded-xl border border-line/60 bg-ink-900/60 p-3 text-sm">
          <button type="button" className="flex w-full items-center justify-between font-semibold" aria-expanded={showGloss} onClick={() => setShowGloss((v) => !v)}>
            {E.whatIs} <span aria-hidden="true">{showGloss ? "−" : "+"}</span>
          </button>
          <p className="mt-1 text-muted">{gloss.short}</p>
          {showGloss && <p className="mt-2 text-muted">{gloss.text}</p>}
        </div>
      )}
    </div>
  );
}
