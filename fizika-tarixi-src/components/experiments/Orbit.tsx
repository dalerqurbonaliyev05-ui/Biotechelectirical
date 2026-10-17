"use client";
import { useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { arrow, label, useCanvasLoop, type Colors } from "./sim";
import { Panels, Readout, Slider } from "./ui";

const TIME_SCALE = 1.2;
const EPS2 = 0.02 * 0.02;
const MAX_TRAIL = 900;
const HOLD = 0.9;

interface Sim {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
  hold: number;
  frame: number;
}

const fresh = (k: number): Sim => ({ x: 1, y: 0, vx: 0, vy: k, trail: [{ x: 1, y: 0 }], hold: 0, frame: 0 });

export default function Orbit() {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Sim>(fresh(1.1));
  const acc = useRef(0);
  const [k, setK] = useState(1.1);
  const [r, setR] = useState(1);

  const ecc = Math.abs(k * k - 1);
  const kind = Math.abs(k - 1) < 0.005 ? "circle" : k >= Math.SQRT2 ? "escape" : "ellipse";
  const kindLabel = kind === "circle" ? t("x.orb.circle") : kind === "escape" ? t("x.orb.escape") : t("x.orb.ellipse");

  const launch = (speed: number) => {
    sim.current = fresh(speed);
    setR(1);
  };

  useCanvasLoop(canvasRef, (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, col: Colors) => {
    const s = sim.current;
    const scale = 0.26 * Math.min(w, h);
    const cx = w / 2;
    const cy = h / 2;
    const sx = (x: number) => cx + x * scale;
    const sy = (y: number) => cy - y * scale;

    // Velocity Verlet, orbita yaqinida kichikroq qadam
    if (s.hold > 0) {
      s.hold -= dt;
      if (s.hold <= 0) {
        sim.current = fresh(k);
        return;
      }
    } else {
      let rem = dt * TIME_SCALE;
      let guard = 0;
      while (rem > 1e-9 && guard++ < 400) {
        const rr = Math.hypot(s.x, s.y);
        const step = Math.min(rem, Math.max(0.0004, Math.min(0.004, 0.02 * rr * rr)));
        const d1 = Math.pow(s.x * s.x + s.y * s.y + EPS2, 1.5);
        const ax = -s.x / d1;
        const ay = -s.y / d1;
        s.x += s.vx * step + 0.5 * ax * step * step;
        s.y += s.vy * step + 0.5 * ay * step * step;
        const d2 = Math.pow(s.x * s.x + s.y * s.y + EPS2, 1.5);
        s.vx += 0.5 * (ax - s.x / d2) * step;
        s.vy += 0.5 * (ay - s.y / d2) * step;
        rem -= step;
      }
      s.frame++;
      if (s.frame % 2 === 0) {
        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > MAX_TRAIL) s.trail.shift();
      }
      const px = sx(s.x);
      const py = sy(s.y);
      if (px < -30 || px > w + 30 || py < -30 || py > h + 30) s.hold = HOLD;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);

    // Etalon aylana orbita (r = 1)
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = col.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, t("x.orb.circleRef"), cx, cy + scale + 14, col.muted, 11, "center");

    // Iz
    const tr = s.trail;
    if (tr.length > 1) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      for (let i = 1; i < tr.length; i++) {
        ctx.strokeStyle = col.blue;
        ctx.globalAlpha = (i / tr.length) * 0.85;
        ctx.beginPath();
        ctx.moveTo(sx(tr[i - 1].x), sy(tr[i - 1].y));
        ctx.lineTo(sx(tr[i].x), sy(tr[i].y));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Quyosh
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
    glow.addColorStop(0, col.gold);
    glow.addColorStop(1, "rgba(201,154,69,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col.gold;
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, t("x.orb.sun"), cx, cy + 26, col.muted, 11, "center");

    // Sayyora + tezlik strelkasi
    const px = sx(s.x);
    const py = sy(s.y);
    const sp = Math.hypot(s.vx, s.vy);
    if (s.hold <= 0 && sp > 0) {
      const len = Math.min(70, 26 * sp);
      arrow(ctx, px, py, px + (s.vx / sp) * len, py - (s.vy / sp) * len, col.green, 2.5);
    }
    ctx.fillStyle = col.blue;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 2;
    ctx.stroke();

    acc.current += dt;
    if (acc.current > 0.12) {
      acc.current = 0;
      setR(Math.hypot(s.x, s.y));
    }
  });

  return (
    <Panels
      canvas={<canvas ref={canvasRef} className="ft-canvas" role="img" aria-label={t("x.orb.aria")} />}
      controls={
        <>
          <h2>{t("exp.controls")}</h2>
          <Slider
            label={t("x.orb.speed")}
            value={k}
            min={0.5}
            max={1.6}
            step={0.01}
            format={(v) => `×${v.toFixed(2)}`}
            onChange={(v) => {
              setK(v);
              launch(v);
            }}
          />
          <div className="ft-actions">
            <button type="button" className="ft-btn small primary" onClick={() => launch(k)}>
              {t("x.orb.launch")}
            </button>
          </div>
          <h2>{t("exp.readouts")}</h2>
          <div className="ft-readouts" aria-live="off">
            <Readout label={t("x.orb.type")} value={kindLabel} accent wide />
            <Readout label={t("x.orb.ecc")} value={ecc.toFixed(2)} />
            <Readout label={t("x.orb.dist")} value={`${r.toFixed(2)} r₀`} />
          </div>
        </>
      }
    />
  );
}
