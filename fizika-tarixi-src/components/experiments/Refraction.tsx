"use client";
import { useRef, useState, type PointerEvent } from "react";
import { useT, type Key } from "@/lib/i18n";
import { clamp, DEG, label, pointerPos, useCanvasLoop, type Colors } from "./sim";
import { Panels, Readout, Seg, Slider } from "./ui";

const MEDIA: { id: string; n: number; key: Key }[] = [
  { id: "air", n: 1.0, key: "x.ref.m.air" },
  { id: "water", n: 1.33, key: "x.ref.m.water" },
  { id: "glass", n: 1.5, key: "x.ref.m.glass" },
  { id: "diamond", n: 2.42, key: "x.ref.m.diamond" },
];

const medium = (id: string) => MEDIA.find((m) => m.id === id) ?? MEDIA[0];

export default function Refraction() {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const [angle, setAngle] = useState(40);
  const [topId, setTopId] = useState("air");
  const [botId, setBotId] = useState("water");

  const n1 = medium(topId).n;
  const n2 = medium(botId).n;
  const s2 = (n1 * Math.sin(angle * DEG)) / n2;
  const tir = s2 > 1;
  const theta2 = tir ? null : Math.asin(s2) / DEG;
  const crit = n1 > n2 ? Math.asin(n2 / n1) / DEG : null;

  const setFromPointer = (e: PointerEvent<HTMLCanvasElement>) => {
    const el = e.currentTarget;
    const m = pointerPos(e, el);
    const dx = el.clientWidth / 2 - m.x;
    const dy = el.clientHeight / 2 - m.y;
    setAngle(Math.round(clamp(Math.atan2(dx, dy) / DEG, 0, 89)));
  };
  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const el = e.currentTarget;
    const m = pointerPos(e, el);
    if (m.y > el.clientHeight / 2) return;
    dragging.current = true;
    el.setPointerCapture(e.pointerId);
    setFromPointer(e);
  };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (dragging.current) setFromPointer(e);
  };
  const onUp = (e: PointerEvent<HTMLCanvasElement>) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  useCanvasLoop(canvasRef, (ctx: CanvasRenderingContext2D, w: number, h: number, _dt: number, col: Colors) => {
    const cx = w / 2;
    const cy = h / 2;
    const L = Math.min(h * 0.42, w * 0.42);
    const th1 = angle * DEG;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);

    // Muhitlar: sindirish ko'rsatkichi kattaroq bo'lsa to'qroq
    const tint = (n: number) => 0.1 + 0.4 * ((n - 1) / 1.42);
    ctx.fillStyle = col.water;
    ctx.globalAlpha = tint(n1);
    ctx.fillRect(0, 0, w, cy);
    ctx.globalAlpha = tint(n2);
    ctx.fillRect(0, cy, w, h - cy);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    // Normal
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = col.muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - L * 1.12);
    ctx.lineTo(cx, cy + L * 1.12);
    ctx.stroke();
    ctx.setLineDash([]);

    label(ctx, `${t(medium(topId).key)} · n = ${n1.toFixed(2)}`, 14, 20, col.ink, 13);
    label(ctx, `${t(medium(botId).key)} · n = ${n2.toFixed(2)}`, 14, h - 20, col.ink, 13);

    const ray = (x2: number, y2: number, color: string, width: number, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    };

    // Tushayotgan nur
    const sx = cx - L * Math.sin(th1);
    const sy = cy - L * Math.cos(th1);
    ray(sx, sy, col.red, 3.5);

    // Qaytgan nur (to'liq ichki qaytishda yorqin, aks holda xira)
    ray(cx + L * Math.sin(th1), cy - L * Math.cos(th1), col.blue, tir ? 3.5 : 2, tir ? 1 : 0.28);

    // Singan nur
    if (!tir) {
      const th2 = Math.asin(s2);
      ray(cx + L * Math.sin(th2), cy + L * Math.cos(th2), col.green, 3.5);
      ctx.strokeStyle = col.green;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 46, Math.PI / 2 - th2, Math.PI / 2);
      ctx.stroke();
      label(ctx, `${(th2 / DEG).toFixed(1)}°`, cx + 64, cy + 54, col.green, 13, "center");
    }

    // Burchak yoyi
    ctx.strokeStyle = col.red;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 52, -Math.PI / 2 - th1, -Math.PI / 2);
    ctx.stroke();
    label(ctx, `${angle}°`, cx - 66, cy - 62, col.red, 13, "center");

    // Tutqich
    ctx.fillStyle = col.red;
    ctx.beginPath();
    ctx.arc(sx, sy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    if (tir) label(ctx, t("x.ref.tir"), cx, cy + 34, col.blue, 14, "center");
    label(ctx, t("x.ref.drag"), w - 14, 20, col.muted, 12, "right");
  });

  const mediaOptions = MEDIA.map((m) => ({ value: m.id, label: t(m.key) }));

  return (
    <Panels
      canvas={
        <canvas
          ref={canvasRef}
          className="ft-canvas drag"
          role="img"
          aria-label={t("x.ref.aria")}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      }
      controls={
        <>
          <h2>{t("exp.controls")}</h2>
          <Slider label={t("x.ref.angle")} value={angle} min={0} max={89} step={1} format={(v) => `${v}°`} onChange={setAngle} />
          <Seg label={t("x.ref.top")} value={topId} options={mediaOptions} onChange={setTopId} />
          <Seg label={t("x.ref.bottom")} value={botId} options={mediaOptions} onChange={setBotId} />
          <h2>{t("exp.readouts")}</h2>
          <div className="ft-readouts" aria-live="off">
            <Readout label={t("x.ref.inc")} value={`${angle}°`} />
            <Readout label={t("x.ref.refr")} value={theta2 === null ? "—" : `${theta2.toFixed(1)}°`} accent />
            <Readout label={t("x.ref.crit")} value={crit === null ? "—" : `${crit.toFixed(1)}°`} />
            <Readout label={t("x.ref.tir")} value={tir ? t("x.ref.yes") : t("x.ref.no")} />
          </div>
        </>
      }
    />
  );
}
