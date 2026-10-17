"use client";
import { useRef, useState, type PointerEvent } from "react";
import { useT, type Key } from "@/lib/i18n";
import { clamp, DEG, label, pointerPos, useCanvasLoop, type Colors } from "./sim";
import { Panels, Readout, Seg, Slider } from "./ui";

const PLANETS: { id: string; g: number; key: Key }[] = [
  { id: "earth", g: 9.81, key: "x.pen.p.earth" },
  { id: "moon", g: 1.62, key: "x.pen.p.moon" },
  { id: "mars", g: 3.71, key: "x.pen.p.mars" },
  { id: "jupiter", g: 24.79, key: "x.pen.p.jupiter" },
];

interface Sim {
  th: number;
  om: number;
  t: number;
  lastUp: number | null; // oxirgi "yuqoriga nol kesish" vaqti
  period: number | null;
  dragging: boolean;
}

export default function Pendulum() {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Sim>({ th: 30 * DEG, om: 0, t: 0, lastUp: null, period: null, dragging: false });
  const geo = useRef({ px: 0, py: 0, len: 1, r: 14 });
  const acc = useRef(0);
  const [length, setLength] = useState(1);
  const [planetId, setPlanetId] = useState("earth");
  const [amp, setAmp] = useState(30);
  const [period, setPeriod] = useState<number | null>(null);

  const g = (PLANETS.find((p) => p.id === planetId) ?? PLANETS[0]).g;
  const t0 = 2 * Math.PI * Math.sqrt(length / g);
  const diff = period === null ? null : ((period - t0) / t0) * 100;

  const release = (deg: number) => {
    const s = sim.current;
    s.th = deg * DEG;
    s.om = 0;
    s.t = 0;
    s.lastUp = null;
    s.period = null;
    setPeriod(null);
  };

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const el = e.currentTarget;
    const m = pointerPos(e, el);
    const gm = geo.current;
    const s = sim.current;
    const bx = gm.px + Math.sin(s.th) * gm.len;
    const by = gm.py + Math.cos(s.th) * gm.len;
    if (Math.hypot(m.x - bx, m.y - by) < gm.r * 2.2) {
      s.dragging = true;
      s.om = 0;
      el.setPointerCapture(e.pointerId);
    }
  };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const s = sim.current;
    if (!s.dragging) return;
    const m = pointerPos(e, e.currentTarget);
    const gm = geo.current;
    s.th = clamp(Math.atan2(m.x - gm.px, m.y - gm.py), -85 * DEG, 85 * DEG);
    s.om = 0;
  };
  const onUp = (e: PointerEvent<HTMLCanvasElement>) => {
    const s = sim.current;
    if (!s.dragging) return;
    s.dragging = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const deg = Math.round(Math.abs(s.th) / DEG);
    s.t = 0;
    s.lastUp = null;
    s.period = null;
    setPeriod(null);
    setAmp(clamp(deg, 5, 80));
  };

  useCanvasLoop(canvasRef, (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, col: Colors) => {
    const s = sim.current;
    const px = w / 2;
    const py = h * 0.08;
    const len = Math.min(h * 0.82, w * 0.46) * (0.35 + 0.65 * ((length - 0.2) / 2.8));
    const r = Math.max(11, Math.min(20, w * 0.03));
    geo.current = { px, py, len, r };

    // RK4: θ'' = −(g/L) sin θ
    if (!s.dragging) {
      const n = 10;
      const hs = dt / n;
      const k = g / length;
      for (let i = 0; i < n; i++) {
        const f = (th: number) => -k * Math.sin(th);
        const k1t = s.om;
        const k1o = f(s.th);
        const k2t = s.om + 0.5 * hs * k1o;
        const k2o = f(s.th + 0.5 * hs * k1t);
        const k3t = s.om + 0.5 * hs * k2o;
        const k3o = f(s.th + 0.5 * hs * k2t);
        const k4t = s.om + hs * k3o;
        const k4o = f(s.th + hs * k3t);
        const prev = s.th;
        s.th += (hs / 6) * (k1t + 2 * k2t + 2 * k3t + k4t);
        s.om += (hs / 6) * (k1o + 2 * k2o + 2 * k3o + k4o);
        s.t += hs;
        if (prev < 0 && s.th >= 0) {
          // chiziqli interpolyatsiya bilan aniq kesish vaqti
          const tc = s.t - hs * (s.th / (s.th - prev));
          if (s.lastUp !== null) s.period = tc - s.lastUp;
          s.lastUp = tc;
        }
      }
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);

    // Tayanch
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(px - 46, py - 4);
    ctx.lineTo(px + 46, py - 4);
    ctx.stroke();

    // Vertikal yordamchi chiziq va amplituda yoyi
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = col.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py + len + r * 1.6);
    ctx.stroke();
    ctx.setLineDash([]);

    const bx = px + Math.sin(s.th) * len;
    const by = py + Math.cos(s.th) * len;
    ctx.strokeStyle = col.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(bx, by);
    ctx.stroke();

    // Yuk
    ctx.fillStyle = col.gold;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    label(ctx, `${(s.th / DEG).toFixed(0)}°`, px, py + 42, col.blue, 13, "center");
    label(ctx, t("x.pen.drag"), w / 2, h - 14, col.muted, 12, "center");

    acc.current += dt;
    if (acc.current > 0.12) {
      acc.current = 0;
      setPeriod(s.period);
    }
  });

  return (
    <Panels
      canvas={
        <canvas
          ref={canvasRef}
          className="ft-canvas drag"
          role="img"
          aria-label={t("x.pen.aria")}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      }
      controls={
        <>
          <h2>{t("exp.controls")}</h2>
          <Slider
            label={t("x.pen.length")}
            value={length}
            min={0.2}
            max={3}
            step={0.1}
            format={(v) => `${v.toFixed(1)} ${t("u.m")}`}
            onChange={(v) => {
              setLength(v);
              release(amp);
            }}
          />
          <Seg
            label={t("x.pen.planet")}
            value={planetId}
            options={PLANETS.map((p) => ({ value: p.id, label: t(p.key) }))}
            onChange={(v) => {
              setPlanetId(v);
              release(amp);
            }}
          />
          <Slider
            label={t("x.pen.angle")}
            value={amp}
            min={5}
            max={80}
            step={1}
            format={(v) => `${v}°`}
            onChange={(v) => {
              setAmp(v);
              release(v);
            }}
          />
          <h2>{t("exp.readouts")}</h2>
          <div className="ft-readouts" aria-live="off">
            <Readout label="g" value={`${g.toFixed(2)} ${t("u.ms2")}`} />
            <Readout label={t("x.pen.t0")} value={`${t0.toFixed(3)} ${t("u.s")}`} />
            <Readout label={t("x.pen.period")} value={period === null ? t("x.pen.measuring") : `${period.toFixed(3)} ${t("u.s")}`} accent />
            <Readout label={t("x.pen.diff")} value={diff === null ? "—" : `${diff >= 0 ? "+" : ""}${diff.toFixed(2)} %`} />
          </div>
        </>
      }
    />
  );
}
