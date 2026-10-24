"use client";
// Simulyatorlar uchun umumiy "laboratoriya" qismlari: slayder, tugmalar guruhi, o'lchov ko'rsatkichi
// va canvas sikli (ekrandan chiqqanda to'xtaydi, prefers-reduced-motion da vaqt to'xtatiladi).
import { useEffect, useEffectEvent, useId, useRef, type ReactNode, type RefObject } from "react";
import { useReducedMotion } from "./hooks";

export const clamp = (v: number, lo: number, hi: number): number => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);

/* ---------------- Boshqaruv elementlari ---------------- */

export function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Ko'rsatiladigan qiymat (format qilingan). Berilmasa `value` o'zi. */
  display?: string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const id = useId();
  const { label, value, min, max, step = 1, unit, display, onChange, hint } = props;
  const pct = ((clamp(value, min, max) - min) / (max - min || 1)) * 100;
  return (
    <div className="lab-slider">
      <div className="lab-slider-top">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>
          {display ?? String(value).replace(".", ",")}
          {unit ? <small> {unit}</small> : null}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamp(value, min, max)}
        style={{ ["--pct" as string]: `${pct}%` }}
        aria-valuetext={`${display ?? value} ${unit ?? ""}`.trim()}
        onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
      />
      {hint ? <p className="lab-hint">{hint}</p> : null}
    </div>
  );
}

export function Segmented<T extends string | number>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const { label, value, options, onChange } = props;
  return (
    <div className="lab-seg" role="radiogroup" aria-label={label}>
      <span className="lab-seg-label">{label}</span>
      <div className="lab-seg-row">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            className={o.value === value ? "on" : undefined}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="lab-toggle">
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      <span className="lab-toggle-track" aria-hidden="true" />
      <span>{props.label}</span>
    </label>
  );
}

export function Readout(props: { label: string; value: string; unit?: string; tone?: "ok" | "warn" | "bad" | "u" | "i" | "p"; big?: boolean }) {
  return (
    <div className={`lab-readout${props.tone ? ` t-${props.tone}` : ""}${props.big ? " big" : ""}`}>
      <span>{props.label}</span>
      <strong>
        {props.value}
        {props.unit ? <small> {props.unit}</small> : null}
      </strong>
    </div>
  );
}

/** Gorizontal o'lchov shkalasi (0…max), `limit` dan oshsa qizaradi. */
export function Bar(props: { label: string; value: number; max: number; limit?: number; text: string }) {
  const { value, max, limit } = props;
  const pct = clamp((value / (max || 1)) * 100, 0, 100);
  const over = limit !== undefined && value > limit;
  return (
    <div className={`lab-bar${over ? " over" : ""}`}>
      <div className="lab-bar-top">
        <span>{props.label}</span>
        <b>{props.text}</b>
      </div>
      <div className="lab-bar-track">
        <i style={{ width: `${pct}%` }} />
        {limit !== undefined ? <em style={{ left: `${clamp((limit / (max || 1)) * 100, 0, 100)}%` }} /> : null}
      </div>
    </div>
  );
}

export function LabPanel(props: { children: ReactNode; title?: string; className?: string }) {
  return (
    <div className={`lab-panel${props.className ? ` ${props.className}` : ""}`}>
      {props.title ? <h4 className="lab-panel-title">{props.title}</h4> : null}
      {props.children}
    </div>
  );
}

/** Simulyatordagi jonli formula: o'rniga qo'yilgan qiymatlar bilan. */
export function LiveFormula(props: { children: ReactNode }) {
  return (
    <p className="lab-live" aria-live="polite">
      {props.children}
    </p>
  );
}

/* ---------------- Canvas ---------------- */

export interface Colors {
  bg: string;
  ink: string;
  muted: string;
  grid: string;
  accent: string;
  u: string;
  i: string;
  p: string;
  ok: string;
  warn: string;
  bad: string;
}

export function readColors(el: Element): Colors {
  const cs = getComputedStyle(el);
  const g = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    bg: g("--lab-bg", "#14102e"),
    ink: g("--lab-ink", "#f3f0ff"),
    muted: g("--lab-muted", "#a59fcb"),
    grid: g("--lab-grid", "rgba(255,255,255,.08)"),
    accent: g("--accent", "#9bc53d"),
    u: g("--c-u", "#ffb020"),
    i: g("--c-i", "#22c7ff"),
    p: g("--c-p", "#ff5c8a"),
    ok: g("--c-ok", "#2fd6a3"),
    warn: g("--c-warn", "#ffb020"),
    bad: g("--c-bad", "#ff5c6c"),
  };
}

/** dt — soniya (reduced motion bo'lsa 0), t — umumiy vaqt (soniya). */
export type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, t: number, col: Colors) => void;

/**
 * requestAnimationFrame sikli: o'lcham va devicePixelRatio'ni kuzatadi, ekrandan chiqqanda to'xtaydi
 * (IntersectionObserver), tozalashda barcha kuzatuvchilar va rAF bekor qilinadi.
 */
export function useCanvasLoop(canvasRef: RefObject<HTMLCanvasElement | null>, draw: DrawFn): void {
  const onFrame = useEffectEvent(draw);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 1;
    let h = 1;
    let raf = 0;
    let visible = false;
    let prev = 0;
    let t = 0;
    let col = readColors(canvas);

    const sync = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      col = readColors(canvas);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(canvas);

    const loop = (now: number) => {
      const real = prev ? Math.min(0.05, Math.max(0, (now - prev) / 1000)) : 0;
      prev = now;
      const dt = reducedRef.current ? 0 : real;
      t += dt;
      onFrame(ctx, w, h, dt, t, col);
      raf = visible ? requestAnimationFrame(loop) : 0;
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf) {
        prev = 0;
        raf = requestAnimationFrame(loop);
      }
    });
    io.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      visible = false;
      io.disconnect();
      ro.disconnect();
    };
  }, [canvasRef]);
}

export function Canvas(props: { draw: DrawFn; label: string; ratio?: number; className?: string; onPointer?: (x: number, y: number, w: number, h: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useCanvasLoop(ref, props.draw);
  const onPointer = props.onPointer;
  return (
    <canvas
      ref={ref}
      className={`lab-canvas${props.className ? ` ${props.className}` : ""}`}
      style={{ aspectRatio: String(props.ratio ?? 16 / 9) }}
      role="img"
      aria-label={props.label}
      onPointerDown={
        onPointer
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.setPointerCapture(e.pointerId);
              onPointer(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
            }
          : undefined
      }
      onPointerMove={
        onPointer
          ? (e) => {
              if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
              const r = e.currentTarget.getBoundingClientRect();
              onPointer(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
            }
          : undefined
      }
    />
  );
}

/** Fon va katakli to'r chizadi. */
export function grid(ctx: CanvasRenderingContext2D, w: number, h: number, col: Colors, step = 32): void {
  ctx.fillStyle = col.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = col.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = step; x < w; x += step) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, h);
  }
  for (let y = step; y < h; y += step) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(w, Math.round(y) + 0.5);
  }
  ctx.stroke();
}

/** Funksiya grafigi: x ∈ [0,1] → y ∈ [-1,1] (markaz `cy`, amplituda `amp` px). */
export function plot(ctx: CanvasRenderingContext2D, x0: number, w: number, cy: number, amp: number, f: (x: number) => number, color: string, width = 2.5, steps = 240): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let k = 0; k <= steps; k++) {
    const x = k / steps;
    const y = cy - f(x) * amp;
    if (k === 0) ctx.moveTo(x0 + x * w, y);
    else ctx.lineTo(x0 + x * w, y);
  }
  ctx.stroke();
}

export function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size = 12, align: CanvasTextAlign = "left"): void {
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}
