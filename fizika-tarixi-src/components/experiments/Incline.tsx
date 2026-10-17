"use client";
import { useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { clamp, DEG, label, useCanvasLoop, type Colors } from "./sim";
import { Panels, Readout, Seg, Slider } from "./ui";

const G = 9.81;
const LEN = 12; // qiya tekislik uzunligi, m
const HOLD = 1.2; // pastga yetgach kutish, s

type Mode = "roll" | "slide";

export default function Incline() {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clock = useRef(0);
  const shown = useRef(0);
  const [angle, setAngle] = useState(15);
  const [mode, setMode] = useState<Mode>("roll");
  const [speed, setSpeed] = useState(1);
  const [time, setTime] = useState(0);

  const k = mode === "roll" ? 5 / 7 : 1;
  const a = k * G * Math.sin(angle * DEG);
  const tau = Math.sqrt(LEN / (8 * a));
  const total = 4 * tau;
  const tc = Math.min(time, total);
  const dist = 0.5 * a * tc * tc;
  const vel = a * tc;

  const restart = () => {
    clock.current = 0;
    setTime(0);
  };

  useCanvasLoop(canvasRef, (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, col: Colors) => {
    const th = angle * DEG;
    const acc = k * G * Math.sin(th);
    const tauNow = Math.sqrt(LEN / (8 * acc));
    const T = 4 * tauNow;
    clock.current += dt * speed;
    if (clock.current > T + HOLD) clock.current = 0;
    const tt = Math.min(clock.current, T);
    const p = clamp((0.5 * acc * tt * tt) / LEN, 0, 1);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);

    // Tekislik geometriyasi
    const xB = w * 0.93;
    const yB = h * 0.9;
    const Ls = Math.min((w * 0.84) / Math.cos(th), (h * 0.72) / Math.sin(th));
    const dx = Math.cos(th);
    const dy = Math.sin(th);
    const xT = xB - Ls * dx;
    const yT = yB - Ls * dy;
    const pt = (q: number) => ({ x: xT + q * Ls * dx, y: yT + q * Ls * dy });

    // Ponasi
    ctx.fillStyle = col.line;
    ctx.beginPath();
    ctx.moveTo(xT, yT);
    ctx.lineTo(xB, yB);
    ctx.lineTo(xT, yB);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Belgilar: s_k = L·k²/16
    const nx = dy;
    const ny = -dx;
    for (let i = 1; i <= 4; i++) {
      const q = (i * i) / 16;
      const m = pt(q);
      ctx.strokeStyle = col.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x + nx * 46, m.y + ny * 46);
      ctx.stroke();
      label(ctx, `${i}τ`, m.x + nx * 60, m.y + ny * 60, col.muted, 12, "center");
    }

    // Shar
    const r = Math.max(10, Math.min(16, w * 0.026));
    const c = pt(p);
    const bx = c.x + nx * r;
    const by = c.y + ny * r;
    const rot = (p * Ls) / r;
    ctx.save();
    ctx.translate(bx, by);
    if (mode === "roll") ctx.rotate(rot);
    ctx.fillStyle = col.red;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 0.8, 0);
    ctx.stroke();
    ctx.restore();

    // Burchak yoyi
    const ar = Math.min(56, Ls * 0.18);
    ctx.strokeStyle = col.blue;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(xB, yB, ar, Math.PI, Math.PI + th);
    ctx.stroke();
    label(ctx, `${angle}°`, xB - ar - 22, yB - 12, col.blue, 13, "center");

    if (Math.abs(clock.current - shown.current) > 0.1) {
      shown.current = clock.current;
      setTime(clock.current);
    }
  });

  return (
    <Panels
      canvas={<canvas ref={canvasRef} className="ft-canvas" role="img" aria-label={t("x.inc.aria")} />}
      controls={
        <>
          <h2>{t("exp.controls")}</h2>
          <Slider
            label={t("x.inc.angle")}
            value={angle}
            min={5}
            max={60}
            step={1}
            format={(v) => `${v}°`}
            onChange={(v) => {
              setAngle(v);
              restart();
            }}
          />
          <Seg
            label={t("x.inc.mode")}
            value={mode}
            options={[
              { value: "roll", label: t("x.inc.roll") },
              { value: "slide", label: t("x.inc.slide") },
            ]}
            onChange={(v) => {
              setMode(v);
              restart();
            }}
          />
          <Slider label={t("x.inc.speed")} value={speed} min={0.25} max={2} step={0.25} format={(v) => `×${v}`} onChange={setSpeed} />
          <div className="ft-actions">
            <button type="button" className="ft-btn small primary" onClick={restart}>
              {t("common.reset")}
            </button>
          </div>
          <h2>{t("exp.readouts")}</h2>
          <div className="ft-readouts" aria-live="off">
            <Readout label={t("x.inc.accel")} value={`${a.toFixed(2)} ${t("u.ms2")}`} />
            <Readout label={t("x.inc.tau")} value={`${tau.toFixed(2)} ${t("u.s")}`} />
            <Readout label={t("x.inc.time")} value={`${tc.toFixed(1)} ${t("u.s")}`} />
            <Readout label={t("x.inc.dist")} value={`${dist.toFixed(2)} ${t("u.m")}`} />
            <Readout label={t("x.inc.vel")} value={`${vel.toFixed(2)} ${t("u.ms")}`} />
            <Readout label={t("x.inc.ratio")} value="1 : 4 : 9 : 16" accent />
          </div>
        </>
      }
    />
  );
}
