"use client";
import { useEffect, useEffectEvent, type RefObject } from "react";

/** Kanvas ranglari — CSS o'zgaruvchilaridan o'qiladi (yorug'/qorong'i rejim avtomatik). */
export interface Colors {
  bg: string;
  ink: string;
  muted: string;
  line: string;
  gold: string;
  water: string;
  blue: string;
  red: string;
  green: string;
}

export function readColors(): Colors {
  const cs = getComputedStyle(document.documentElement);
  const g = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    bg: g("--sim-bg", "#fbf6ea"),
    ink: g("--sim-ink", "#14213b"),
    muted: g("--sim-muted", "#5a6275"),
    line: g("--sim-line", "#e0d3b5"),
    gold: g("--gold", "#c99a45"),
    water: g("--sim-water", "#8fb8e8"),
    blue: g("--sim-blue", "#3f6fd6"),
    red: g("--sim-red", "#c8323c"),
    green: g("--sim-green", "#2e9d5b"),
  };
}

export type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, col: Colors) => void;

/**
 * Kanvas uchun requestAnimationFrame sikli: o'lchamni (CSS px) va devicePixelRatio'ni kuzatadi,
 * rang sxemasi o'zgarsa ranglarni yangilaydi. `draw` har kadrda eng so'nggi props/state bilan chaqiriladi
 * (useEffectEvent), shuning uchun slayder qiymatlarini to'g'ridan-to'g'ri o'qish mumkin.
 */
export function useCanvasLoop(canvasRef: RefObject<HTMLCanvasElement | null>, draw: DrawFn): void {
  const onFrame = useEffectEvent(draw);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 1;
    let h = 1;
    let raf = 0;
    let prev = performance.now();
    let col = readColors();

    const sync = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(canvas);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      col = readColors();
    };
    mq.addEventListener("change", onScheme);

    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - prev) / 1000));
      prev = now;
      onFrame(ctx, w, h, dt, col);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mq.removeEventListener("change", onScheme);
    };
  }, [canvasRef]);
}

/** Pointer hodisasining kanvas ichidagi koordinatasi (CSS px). */
export function pointerPos(e: { clientX: number; clientY: number }, el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const DEG = Math.PI / 180;

/** Chiziq + uchida strelka. */
export function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width = 3): void {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const head = Math.max(8, width * 3.2);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - Math.cos(ang) * head * 0.6, y2 - Math.sin(ang) * head * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(ang - 0.45) * head, y2 - Math.sin(ang - 0.45) * head);
  ctx.lineTo(x2 - Math.cos(ang + 0.45) * head, y2 - Math.sin(ang + 0.45) * head);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Yumaloq burchakli to'rtburchak yo'li (ctx.roundRect'siz — eski brauzerlar uchun). */
export function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size = 13, align: CanvasTextAlign = "left"): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px Inter, system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}
