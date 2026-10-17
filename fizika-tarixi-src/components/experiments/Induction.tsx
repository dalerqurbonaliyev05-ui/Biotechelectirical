"use client";
import { useRef, useState, type PointerEvent } from "react";
import { useT } from "@/lib/i18n";
import { clamp, DEG, label, pointerPos, useCanvasLoop, type Colors } from "./sim";
import { Panels, Readout, Slider } from "./ui";

const AMP = 0.33; // avtomatik harakat amplitudasi (kenglik ulushida)
const HIST = 180;

interface Sim {
  mx: number; // magnit markazi, kenglik ulushida
  phase: number;
  prev: number | null;
  emf: number;
  vel: number;
  hist: number[];
  dragging: boolean;
  frame: number;
}

export default function Induction() {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Sim>({ mx: 0.5 + AMP * Math.sin(0), phase: 0, prev: null, emf: 0, vel: 0, hist: [], dragging: false, frame: 0 });
  const acc = useRef(0);
  const [turns, setTurns] = useState(5);
  const [pol, setPol] = useState(1);
  const [auto, setAuto] = useState(true);
  const [emf, setEmf] = useState(0);
  const [moving, setMoving] = useState(true);

  const toggleAuto = (on: boolean) => {
    const s = sim.current;
    if (on) s.phase = Math.asin(clamp((s.mx - 0.5) / AMP, -1, 1));
    setAuto(on);
  };

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const el = e.currentTarget;
    const s = sim.current;
    const m = pointerPos(e, el);
    const r = el.getBoundingClientRect();
    const mxPx = s.mx * r.width;
    const myPx = r.height * 0.36;
    if (Math.abs(m.x - mxPx) < r.width * 0.12 && Math.abs(m.y - myPx) < r.height * 0.14) {
      s.dragging = true;
      if (auto) setAuto(false);
      el.setPointerCapture(e.pointerId);
    }
  };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const s = sim.current;
    if (!s.dragging) return;
    const r = e.currentTarget.getBoundingClientRect();
    s.mx = clamp((e.clientX - r.left) / r.width, 0.1, 0.9);
  };
  const onUp = (e: PointerEvent<HTMLCanvasElement>) => {
    sim.current.dragging = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  useCanvasLoop(canvasRef, (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, col: Colors) => {
    const s = sim.current;
    if (auto && !s.dragging) {
      s.phase += dt * 1.5;
      s.mx = 0.5 + AMP * Math.sin(s.phase);
    }
    const cx = w / 2;
    const cy = h * 0.36;
    const zeta = 0.13;
    const z = s.mx - 0.5;
    const flux = pol * Math.pow(1 + (z / zeta) * (z / zeta), -1.5);
    if (s.prev !== null && dt > 0) {
      const raw = (-turns * (flux - s.prev)) / dt;
      s.emf += (raw - s.emf) * Math.min(1, dt * 12);
    }
    s.prev = flux;
    s.frame++;
    if (s.frame % 2 === 0) {
      s.hist.push(s.emf);
      if (s.hist.length > HIST) s.hist.shift();
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);

    // Magnit
    const mw = w * 0.2;
    const mh = h * 0.09;
    const mxPx = s.mx * w;
    const left = pol > 0 ? col.red : col.blue;
    const right = pol > 0 ? col.blue : col.red;
    ctx.fillStyle = left;
    ctx.fillRect(mxPx - mw / 2, cy - mh / 2, mw / 2, mh);
    ctx.fillStyle = right;
    ctx.fillRect(mxPx, cy - mh / 2, mw / 2, mh);
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(mxPx - mw / 2, cy - mh / 2, mw, mh);
    label(ctx, pol > 0 ? "N" : "S", mxPx - mw / 4, cy, "#fff", 14, "center");
    label(ctx, pol > 0 ? "S" : "N", mxPx + mw / 4, cy, "#fff", 14, "center");

    // G'altak
    const ry = h * 0.16;
    const rx = w * 0.022;
    const gap = Math.min(8, (w * 0.1) / turns);
    ctx.strokeStyle = col.gold;
    ctx.lineWidth = 3;
    for (let i = 0; i < turns; i++) {
      const x = cx + (i - (turns - 1) / 2) * gap;
      ctx.beginPath();
      ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Galvanometr
    const dx = w * 0.86;
    const dy = h * 0.2;
    const dr = h * 0.11;
    const pivotY = dy + dr * 0.7;
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(dx, pivotY, dr * 1.35, -Math.PI / 2 - 62 * DEG, -Math.PI / 2 + 62 * DEG);
    ctx.stroke();
    for (const a of [-58, 0, 58]) {
      const an = -Math.PI / 2 + a * DEG;
      ctx.beginPath();
      ctx.moveTo(dx + Math.cos(an) * dr * 1.35, pivotY + Math.sin(an) * dr * 1.35);
      ctx.lineTo(dx + Math.cos(an) * dr * 1.2, pivotY + Math.sin(an) * dr * 1.2);
      ctx.stroke();
    }
    const needle = Math.tanh(s.emf / 6) * 58 * DEG;
    const na = -Math.PI / 2 + needle;
    ctx.strokeStyle = col.red;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(dx, pivotY);
    ctx.lineTo(dx + Math.cos(na) * dr * 1.3, pivotY + Math.sin(na) * dr * 1.3);
    ctx.stroke();
    ctx.fillStyle = col.ink;
    ctx.beginPath();
    ctx.arc(dx, pivotY, 4, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, "G", dx, pivotY + 16, col.muted, 12, "center");

    // Kuchlanish tarixi
    const gx = w * 0.06;
    const gw = w * 0.88;
    const gy = h * 0.8;
    const gh = h * 0.16;
    ctx.strokeStyle = col.line;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(gx, gy - gh, gw, gh * 2);
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    label(ctx, "ε", gx + 8, gy - gh + 12, col.muted, 12);
    if (s.hist.length > 1) {
      ctx.strokeStyle = col.green;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      s.hist.forEach((v, i) => {
        const px = gx + (i / (HIST - 1)) * gw;
        const py = gy - clamp(v / 20, -1, 1) * gh;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
    label(ctx, t("x.ind.drag"), w / 2, h - 10, col.muted, 11, "center");

    acc.current += dt;
    if (acc.current > 0.12) {
      acc.current = 0;
      setEmf(s.emf);
      setMoving(Math.abs(s.emf) > 0.15);
    }
  });

  return (
    <Panels
      canvas={
        <canvas
          ref={canvasRef}
          className="ft-canvas drag"
          role="img"
          aria-label={t("x.ind.aria")}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      }
      controls={
        <>
          <h2>{t("exp.controls")}</h2>
          <Slider label={t("x.ind.turns")} value={turns} min={1} max={10} step={1} onChange={setTurns} />
          <div className="ft-actions">
            <button
              type="button"
              className="ft-btn small"
              onClick={() => {
                sim.current.prev = null;
                setPol((p) => -p);
              }}
            >
              {t("x.ind.flip")}
            </button>
            <button type="button" className="ft-btn small primary" aria-pressed={auto} onClick={() => toggleAuto(!auto)}>
              {t("x.ind.auto")}: {auto ? t("x.ref.yes") : t("x.ref.no")}
            </button>
          </div>
          <h2>{t("exp.readouts")}</h2>
          <div className="ft-readouts" aria-live="off">
            <Readout label={t("x.ind.emf")} value={`${emf >= 0 ? "+" : ""}${emf.toFixed(1)} ${t("x.ind.units")}`} accent wide />
            <Readout label={t("x.ind.motion")} value={moving ? t("x.ind.moving") : t("x.ind.still")} wide />
          </div>
        </>
      }
    />
  );
}
