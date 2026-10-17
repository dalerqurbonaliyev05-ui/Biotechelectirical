"use client";

// Interaktiv bir chiziqli sxema (SVG). Rang — kuchlanish holati, shakl — apparat holati
// (to'ldirilgan/ochiq kvadrat, to'g'ri/qiyshiq pichoq), shuning uchun faqat rangga tayanilmaydi.
// Zoom/pan: g'ildirak, sichqoncha bilan sudrash, mobilda ikki barmoq; klaviatura: Tab + Enter.

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from "react";
import { SLD, type Pt } from "../data/layout";
import { TOPOLOGY } from "../data/equipment";
import { isNodeEnergized, isNodeGrounded, type NetworkState } from "../engine/network";
import type { SimState } from "../engine/types";
import { uz } from "../i18n/uz";
import { useSession } from "../store/session";
import { useSettings } from "../store/settings";
import { DEAD, EARTH, kvColor } from "./colors";
import Icon from "./Icon";
import { useDerived } from "./useDerived";

const NODE_KV = new Map(TOPOLOGY.nodes.map((n) => [n.id, n.kv]));
const SWITCH = new Map(TOPOLOGY.switches.map((s) => [s.id, s]));
const LOADS = new Map(TOPOLOGY.loads.map((l) => [l.id, l]));
const FULL = { x: -20, y: -10, w: SLD.width + 40, h: SLD.height + 20 };

function wireStyle(net: NetworkState, node: string) {
  if (isNodeGrounded(net, node) && !isNodeEnergized(net, node)) return { stroke: EARTH, dash: "7 5", width: 3 };
  if (isNodeEnergized(net, node)) return { stroke: kvColor(NODE_KV.get(node) ?? 10), dash: undefined, width: 3.2 };
  return { stroke: DEAD, dash: undefined, width: 2.4 };
}

const pts = (p: Pt[]) => p.map(([x, y]) => `${x},${y}`).join(" ");

function PosterBadges({ sim, id, x, y }: { sim: SimState; id: string; x: number; y: number }) {
  const list = sim.posters[id] ?? [];
  return (
    <>
      {list.map((p, i) => (
        <g key={p} transform={`translate(${x + i * 16},${y})`} aria-hidden="true">
          <rect x={0} y={-7} width={14} height={14} rx={3} fill={p === "workHere" ? "var(--color-ok)" : "var(--color-danger)"} stroke="#fff" strokeWidth={1} />
          <text x={7} y={4} textAnchor="middle" fontSize={10} fontWeight={800} fill="#fff">
            {p === "workHere" ? "✓" : "!"}
          </text>
        </g>
      ))}
    </>
  );
}

interface HitProps {
  id: string;
  label: string;
  selected: boolean;
  failed: boolean;
  box: { x: number; y: number; w: number; h: number };
  onPick: (id: string) => void;
  children: React.ReactNode;
}

function Hit({ id, label, selected, failed, box, onPick, children }: HitProps) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPick(id);
    }
  };
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      className="sld-hit cursor-pointer outline-none"
      onClick={() => onPick(id)}
      onKeyDown={onKey}
      data-id={id}
    >
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={6} fill="transparent" className="sld-focus" />
      {(selected || failed) && (
        <rect
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          rx={6}
          fill="none"
          stroke={failed ? "var(--color-danger)" : "var(--color-accent)"}
          strokeWidth={2}
          strokeDasharray={failed ? undefined : "4 3"}
          className={failed ? "animate-pulse" : undefined}
        />
      )}
      {children}
    </g>
  );
}

export default function SingleLineDiagram() {
  const { sim, net } = useDerived();
  const selected = useSession((s) => s.selected);
  const select = useSession((s) => s.select);
  const focusRequest = useSession((s) => s.focusRequest);
  const showLabels = useSettings((s) => s.showLabels);
  const svgRef = useRef<SVGSVGElement>(null);
  const [vb, setVb] = useState(FULL);
  const vbRef = useRef(vb);
  useEffect(() => {
    vbRef.current = vb;
  }, [vb]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; vb: typeof FULL; moved: boolean; dist?: number } | null>(null);
  const suppressClick = useRef(false);

  const clampVb = useCallback((v: typeof FULL) => {
    const w = Math.min(Math.max(v.w, 220), FULL.w * 1.4);
    const h = (w * v.h) / v.w;
    return { x: Math.min(Math.max(v.x, FULL.x - w * 0.5), FULL.x + FULL.w - w * 0.5), y: Math.min(Math.max(v.y, FULL.y - h * 0.5), FULL.y + FULL.h - h * 0.5), w, h };
  }, []);

  const toSvg = useCallback((cx: number, cy: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(cx, cy).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const zoomAt = useCallback(
    (factor: number, at?: { x: number; y: number }) => {
      setVb((v) => {
        const c = at ?? { x: v.x + v.w / 2, y: v.y + v.h / 2 };
        const nw = v.w * factor;
        const nh = v.h * factor;
        return clampVb({ x: c.x - (c.x - v.x) * factor, y: c.y - (c.y - v.y) * factor, w: nw, h: nh });
      });
    },
    [clampVb],
  );

  // Portret (mobil) ekranda boshlang'ich ko'rinish balandlik bo'yicha moslanadi — sxema mayda bo'lib qolmasin
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    if (r.width > 0 && r.height / r.width > FULL.h / FULL.w) {
      // Butun balandlik ko'rinadi, gorizontal bo'ylab sudrab ko'riladi
      const h = FULL.h;
      const w = (h * r.width) / r.height;
      setVb(clampVb({ x: SLD.width / 2 - w / 2, y: FULL.y, w, h }));
    }
  }, [clampVb]);

  // G'ildirak bilan zoom (passive: false — sahifa aylanmasligi uchun)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(Math.pow(1.0015, e.deltaY), toSvg(e.clientX, e.clientY));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt, toSvg]);

  // Rejadan o'tganda uskunaga markazlashtirish
  useEffect(() => {
    if (!focusRequest) return;
    const g = [...SLD.devices, ...SLD.earths, ...SLD.transformers, ...SLD.loads, ...SLD.instruments].find((d) => d.id === focusRequest.id);
    const b = SLD.buses.find((x) => x.node === focusRequest.id);
    const c = g ? { x: g.x, y: g.y } : b ? { x: (b.x1 + b.x2) / 2, y: b.y } : null;
    if (!c) return;
    const w = 620;
    const h = (w * FULL.h) / FULL.w;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tashqi so'rovga javoban ko'rinishni bir marta o'zgartirish
    setVb(clampVb({ x: c.x - w / 2, y: c.y - h / 2, w, h }));
  }, [focusRequest, clampVb]);

  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    suppressClick.current = false;
    if (pointers.current.size === 1) gesture.current = { x: e.clientX, y: e.clientY, vb: vbRef.current, moved: false };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vb: vbRef.current, moved: true, dist: Math.hypot(a.x - b.x, a.y - b.y) };
    }
  };

  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const svg = svgRef.current!;
    const scale = g.vb.w / svg.getBoundingClientRect().width;
    if (pointers.current.size >= 2 && g.dist) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const factor = g.dist / dist;
      const mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
      const nw = g.vb.w * factor;
      setVb(clampVb({ x: mid.x - (mid.x - g.vb.x) * factor, y: mid.y - (mid.y - g.vb.y) * factor, w: nw, h: g.vb.h * factor }));
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) > 6) {
      g.moved = true;
      suppressClick.current = true;
      svg.setPointerCapture(e.pointerId);
    }
    if (g.moved) setVb(clampVb({ ...g.vb, x: g.vb.x - dx * scale, y: g.vb.y - dy * scale }));
  };

  const onPointerUp = (e: RPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
  };

  const pick = useCallback(
    (id: string) => {
      if (suppressClick.current) return;
      select(id);
    },
    [select],
  );

  if (!sim || !net) return null;
  const failedLabel = sim.status === "failed" ? sim.failure?.params?.device : undefined;
  const stateWord = (closed: boolean) => (closed ? uz.equipment.closed : uz.equipment.open);

  return (
    <div className="relative h-full w-full select-none">
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none"
        role="group"
        aria-label={uz.game.tabs.scheme}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        fontFamily="var(--font-sans)"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#ffffff08" strokeWidth={1} />
          </pattern>
        </defs>
        <rect x={FULL.x - 2000} y={FULL.y - 2000} width={FULL.w + 4000} height={FULL.h + 4000} fill="url(#grid)" />

        {/* Simlar */}
        {SLD.wires.map((w, i) => {
          const st = wireStyle(net, w.node);
          return <polyline key={i} points={pts(w.points)} fill="none" stroke={st.stroke} strokeWidth={st.width} strokeDasharray={st.dash} strokeLinejoin="round" />;
        })}

        {/* Kirish liniyalari */}
        {SLD.lines.map((l) => {
          const st = wireStyle(net, l.node);
          return (
            <Hit key={l.node} id={l.node} label={`${l.label}: ${isNodeEnergized(net, l.node) ? uz.equipment.live : uz.equipment.dead}`} selected={selected === l.node} failed={false} box={{ x: l.x - 50, y: l.y - 22, w: 100, h: 34 }} onPick={pick}>
              <path d={`M${l.x - 7} ${l.y - 2} L${l.x} ${l.y + 8} L${l.x + 7} ${l.y - 2}`} fill="none" stroke={st.stroke} strokeWidth={2.5} />
              <text x={l.x} y={l.y - 8} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--color-text)">
                {l.label}
              </text>
            </Hit>
          );
        })}

        {/* Shinalar */}
        {SLD.buses.map((b) => {
          const st = wireStyle(net, b.node);
          return (
            <Hit key={b.node} id={b.node} label={`${b.label}: ${isNodeEnergized(net, b.node) ? uz.equipment.live : uz.equipment.dead}`} selected={selected === b.node} failed={false} box={{ x: b.x1 - 4, y: b.y - 9, w: b.x2 - b.x1 + 8, h: 18 }} onPick={pick}>
              <line x1={b.x1} y1={b.y} x2={b.x2} y2={b.y} stroke={st.stroke} strokeWidth={7} strokeLinecap="round" strokeDasharray={st.dash} />
              <text x={b.x1} y={b.y - 10} fontSize={12} fontWeight={700} fill="var(--color-muted)">
                {b.label}
              </text>
            </Hit>
          );
        })}

        {/* Transformatorlar */}
        {SLD.transformers.map((t) => {
          const def = TOPOLOGY.transformers.find((x) => x.id === t.id)!;
          const s = t.mvSide === "left" ? -1 : 1;
          const c = (node: string, kv: number) => (isNodeEnergized(net, node) ? kvColor(kv) : isNodeGrounded(net, node) ? EARTH : DEAD);
          return (
            <Hit key={t.id} id={t.id} label={`${t.id}, ${uz.equipment.kinds.transformer}, ${net.transformerEnergized[t.id] ? uz.equipment.live : uz.equipment.dead}`} selected={selected === t.id} failed={failedLabel === t.id} box={{ x: t.x - 50, y: t.y - 28, w: 100, h: 94 }} onPick={pick}>
              <circle cx={t.x} cy={t.y} r={24} fill="var(--color-ink-950)" fillOpacity={0.6} stroke={c(def.hv, 110)} strokeWidth={3} />
              <circle cx={t.x + 22 * s} cy={t.y + 38} r={24} fill="none" stroke={c(def.mv!, 35)} strokeWidth={3} />
              <circle cx={t.x - 22 * s} cy={t.y + 38} r={24} fill="none" stroke={c(def.lv, 10)} strokeWidth={3} />
              <text x={t.x - 80 * s} y={t.y - 2} textAnchor={s < 0 ? "start" : "end"} fontSize={15} fontWeight={800} fill="var(--color-text)">
                {t.id}
              </text>
              <text x={t.x - 80 * s} y={t.y + 14} textAnchor={s < 0 ? "start" : "end"} fontSize={10} fill="var(--color-muted)">
                {def.model}
              </text>
              {sim.fans[t.id] && (
                <text x={t.x - 80 * s} y={t.y + 30} textAnchor={s < 0 ? "start" : "end"} fontSize={10} fill="var(--color-accent)">
                  ✻ ventilyator
                </text>
              )}
              <PosterBadges sim={sim} id={t.id} x={t.x + 30 * -s} y={t.y - 26} />
            </Hit>
          );
        })}

        {/* O'lchov transformatorlari va OPN */}
        {SLD.instruments.map((i) => {
          const st = wireStyle(net, i.node);
          return (
            <Hit key={i.id} id={i.id} label={`${i.id}, ${uz.equipment.kinds[i.kind]}`} selected={selected === i.id} failed={false} box={{ x: i.x - 13, y: i.y - 13, w: 26, h: 26 }} onPick={pick}>
              {i.from && <polyline points={pts([i.from, [i.x, i.from[1]], [i.x, i.y]])} fill="none" stroke={st.stroke} strokeWidth={1.6} />}
              {i.kind === "VT" && (
                <>
                  <circle cx={i.x} cy={i.y - 4} r={7} fill="var(--color-ink-950)" stroke={st.stroke} strokeWidth={1.8} />
                  <circle cx={i.x} cy={i.y + 5} r={7} fill="none" stroke={st.stroke} strokeWidth={1.8} />
                </>
              )}
              {i.kind === "CT" && <circle cx={i.x} cy={i.y} r={8} fill="none" stroke={st.stroke} strokeWidth={1.8} />}
              {i.kind === "SA" && (
                <>
                  <rect x={i.x - 5} y={i.y - 8} width={10} height={16} rx={2} fill="var(--color-ink-950)" stroke={st.stroke} strokeWidth={1.6} />
                  <path d={`M${i.x} ${i.y - 5}v7m-2-2 2 2 2-2`} stroke={st.stroke} strokeWidth={1.4} fill="none" />
                  <path d={`M${i.x} ${i.y + 8}v4m-6 0h12m-9 3h6`} stroke={DEAD} strokeWidth={1.4} />
                </>
              )}
            </Hit>
          );
        })}

        {/* Iste'molchilar */}
        {SLD.loads.map((l) => {
          const def = LOADS.get(l.id)!;
          const ok = net.loadSupplied[l.id];
          return (
            <Hit key={l.id} id={l.id} label={`${def.label}, ${def.category}-toifa, ${ok ? uz.equipment.suppliedYes : uz.equipment.suppliedNo}`} selected={selected === l.id} failed={false} box={{ x: l.x - 48, y: l.y - 2, w: 96, h: 50 }} onPick={pick}>
              <rect x={l.x - 45} y={l.y} width={90} height={44} rx={8} fill={ok ? "#22c55e14" : "#f0444422"} stroke={ok ? "var(--color-ok)" : "var(--color-danger)"} strokeWidth={1.6} />
              <text x={l.x} y={l.y + 17} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--color-text)">
                {def.label.length > 16 ? `${def.label.slice(0, 15)}…` : def.label}
              </text>
              <text x={l.x} y={l.y + 33} textAnchor="middle" fontSize={10} fill={ok ? "var(--color-ok)" : "var(--color-danger)"}>
                {def.category}-toifa · {ok ? "✓" : "✗ uzilgan"}
              </text>
            </Hit>
          );
        })}
        {/* Kommutatsiya apparatlari */}
        {SLD.devices.map((d) => {
          const sw = SWITCH.get(d.id)!;
          const closed = sim.devices[d.id] === "closed";
          const live = isNodeEnergized(net, sw.a) || isNodeEnergized(net, sw.b);
          const kv = NODE_KV.get(sw.a) ?? 10;
          const color = closed && live ? kvColor(kv) : live ? kvColor(kv) : DEAD;
          const rot = d.orient === "h" ? `rotate(90 ${d.x} ${d.y})` : undefined;
          const lx = d.labelSide === "left" ? d.x - 20 : d.labelSide === "right" ? d.x + 20 : d.x;
          const ly = d.labelSide === "top" ? d.y - 20 : d.labelSide === "bottom" ? d.y + 28 : d.y + 4;
          const anchor = d.labelSide === "left" ? "end" : d.labelSide === "right" ? "start" : "middle";
          return (
            <Hit
              key={d.id}
              id={d.id}
              label={`${d.id}, ${sw.kind === "breaker" ? uz.equipment.kinds.breaker : uz.equipment.kinds.disconnector}, ${stateWord(closed)}`}
              selected={selected === d.id}
              failed={failedLabel === d.id}
              box={{ x: d.x - 17, y: d.y - 17, w: 34, h: 34 }}
              onPick={pick}
            >
              <g transform={rot}>
                {sw.kind === "breaker" ? (
                  <>
                    <rect x={d.x - 10} y={d.y - 10} width={20} height={20} rx={3} fill={closed ? color : "var(--color-ink-950)"} stroke={color} strokeWidth={2.6} />
                    {closed ? (
                      <line x1={d.x} y1={d.y - 14} x2={d.x} y2={d.y + 14} stroke={color} strokeWidth={2.6} />
                    ) : (
                      <line x1={d.x - 6} y1={d.y + 6} x2={d.x + 6} y2={d.y - 6} stroke={color} strokeWidth={2} />
                    )}
                  </>
                ) : (
                  <>
                    <line x1={d.x} y1={d.y - 14} x2={d.x} y2={d.y - 11} stroke={color} strokeWidth={2.6} />
                    <line x1={d.x - 6} y1={d.y - 11} x2={d.x + 6} y2={d.y - 11} stroke={color} strokeWidth={2.6} />
                    <line x1={d.x} y1={d.y + 14} x2={closed ? d.x : d.x + 11} y2={closed ? d.y - 11 : d.y - 6} stroke={color} strokeWidth={2.8} strokeLinecap="round" />
                    <circle cx={d.x} cy={d.y + 12} r={2.4} fill={color} />
                  </>
                )}
              </g>
              {showLabels && (
                <text x={lx} y={ly} textAnchor={anchor} fontSize={10.5} fontWeight={selected === d.id ? 800 : 600} fill={selected === d.id ? "var(--color-text)" : "var(--color-muted)"}>
                  {d.id}
                </text>
              )}
              <PosterBadges sim={sim} id={d.id} x={d.x + 12} y={d.y - 16} />
            </Hit>
          );
        })}

        {/* Yerlagichlar */}
        {SLD.earths.map((e) => {
          const closed = sim.devices[e.id] === "closed";
          const nodeSt = wireStyle(net, e.node);
          const color = closed ? EARTH : DEAD;
          return (
            <Hit key={e.id} id={e.id} label={`${e.id}, ${uz.equipment.kinds.earthSwitch}, ${stateWord(closed)}`} selected={selected === e.id} failed={failedLabel === e.id} box={{ x: e.x - 15, y: e.y - 17, w: 30, h: 44 }} onPick={pick}>
              <polyline points={pts([e.from, [e.x, e.from[1]], [e.x, e.y - 12]])} fill="none" stroke={nodeSt.stroke} strokeWidth={2} strokeDasharray={nodeSt.dash} />
              <line x1={e.x - 5} y1={e.y - 12} x2={e.x + 5} y2={e.y - 12} stroke={color} strokeWidth={2.4} />
              <line x1={e.x} y1={e.y + 12} x2={closed ? e.x : e.x + 10} y2={closed ? e.y - 12 : e.y - 6} stroke={color} strokeWidth={2.8} strokeLinecap="round" />
              <path d={`M${e.x - 8} ${e.y + 14}H${e.x + 8}M${e.x - 5} ${e.y + 18}H${e.x + 5}M${e.x - 2} ${e.y + 22}H${e.x + 2}`} stroke={color} strokeWidth={2} />
              {showLabels && (
                <text x={e.x} y={e.y + 34} textAnchor="middle" fontSize={9.5} fill="var(--color-muted)">
                  {e.id}
                </text>
              )}
            </Hit>
          );
        })}

      </svg>

      <div className="absolute right-2 top-2 flex flex-col gap-1.5">
        <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={() => zoomAt(0.8)} aria-label={uz.game.zoomIn} title={uz.game.zoomIn}>
          <Icon name="zoomIn" />
        </button>
        <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={() => zoomAt(1.25)} aria-label={uz.game.zoomOut} title={uz.game.zoomOut}>
          <Icon name="zoomOut" />
        </button>
        <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={() => setVb(FULL)} aria-label={uz.game.zoomFit} title={uz.game.zoomFit}>
          <Icon name="fit" />
        </button>
      </div>
    </div>
  );
}

export function Legend() {
  const item = (el: React.ReactNode, text: string) => (
    <span className="flex items-center gap-1.5">
      <svg viewBox="0 0 24 12" className="h-3 w-6" aria-hidden="true">
        {el}
      </svg>
      {text}
    </span>
  );
  return (
    <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted md:flex" aria-label={uz.game.legend}>
      {item(<line x1="0" y1="6" x2="24" y2="6" stroke="var(--color-v110)" strokeWidth="3" />, "110 kV")}
      {item(<line x1="0" y1="6" x2="24" y2="6" stroke="var(--color-v35)" strokeWidth="3" />, "35 kV")}
      {item(<line x1="0" y1="6" x2="24" y2="6" stroke="var(--color-v10)" strokeWidth="3" />, "10 kV")}
      {item(<line x1="0" y1="6" x2="24" y2="6" stroke={DEAD} strokeWidth="3" />, uz.game.legendDead)}
      {item(<line x1="0" y1="6" x2="24" y2="6" stroke={EARTH} strokeWidth="3" strokeDasharray="5 3" />, uz.game.legendEarth)}
      {item(<rect x="7" y="1" width="10" height="10" rx="2" fill="var(--color-muted)" />, uz.game.legendClosed)}
      {item(<rect x="7" y="1" width="10" height="10" rx="2" fill="none" stroke="var(--color-muted)" strokeWidth="2" />, uz.game.legendOpen)}
      {item(<rect x="7" y="1" width="10" height="10" rx="2" fill="var(--color-danger)" />, uz.game.legendPoster)}
    </div>
  );
}
