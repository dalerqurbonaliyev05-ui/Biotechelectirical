"use client";
// 4-qadam: yoqilg'i elementi steki — qutblanish va quvvat egri chiziqlari, maksimal quvvat nuqtasi.
import { useMemo, useState } from "react";
import { Canvas, type DrawFn, label, LabPanel, LiveFormula, Readout, Slider } from "@/components/template/lab";
import { fmt } from "@/lib/fmt";
import { CELL, cellVoltage, maxPowerPoint, stack } from "@/lib/physics/hydrogen";

/* ---------------- Animatsiya ---------------- */

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Yoqilg‘i elementlari ketma-ket terilib stek hosil qiladi">
      {Array.from({ length: 12 }, (_, k) => (
        <g key={k} className="am-pop" style={{ animationDelay: `${k * 0.12}s` }}>
          <rect x={120 + k * 26} y="80" width="10" height="140" rx="2" className="hv-plate" />
          <rect x={131 + k * 26} y="88" width="12" height="124" rx="2" className="hv-mea" />
        </g>
      ))}
      <rect x="100" y="66" width="16" height="168" rx="4" className="am-chip" />
      <rect x="436" y="66" width="16" height="168" rx="4" className="am-chip" />
      <text x="108" y="56" textAnchor="middle" className="am-t">−</text>
      <text x="466" y="62" textAnchor="middle" className="am-t">+</text>
      <path className="am-wire thin am-draw" style={{ animationDelay: "1.6s" }} d="M108 234 V270 H560 V150 M444 66 V40 H560 V110" />
      <rect x="530" y="110" width="60" height="40" rx="8" className="am-cpu" />
      <text x="560" y="135" textAnchor="middle" className="am-t w sm">yuklama</text>
      <g className="am-fade" style={{ animationDelay: "1.8s" }}>
        <text x="280" y="250" textAnchor="middle" className="am-t sm">N × 0,7 V</text>
        <text x="280" y="30" textAnchor="middle" className="am-t acc">U_stek = N · U_element</text>
      </g>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

export function Sim() {
  const [n, setN] = useState(330);
  const [area, setArea] = useState(250);
  const [curr, setCurr] = useState(125);
  const iMax = CELL.iL * 0.98 * area;
  const cur = Math.min(curr, iMax);
  const s = stack(n, area, cur);
  const mpp = useMemo(() => maxPowerPoint(n, area), [n, area]);
  const pMax = mpp.power;

  const draw: DrawFn = (ctx, w, h, _dt, t, col) => {
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    const left = 36;
    const right = w - 40;
    const top = 14;
    const bottom = h - 24;
    const xOf = (i: number) => left + (i / CELL.iL) * (right - left);
    const yU = (u: number) => bottom - (u / 1.1) * (bottom - top);
    const yP = (p: number) => bottom - (p / (pMax * 1.1 || 1)) * (bottom - top);
    ctx.strokeStyle = col.grid;
    ctx.beginPath();
    for (const u of [0, 0.25, 0.5, 0.75, 1]) {
      ctx.moveTo(left, yU(u));
      ctx.lineTo(right, yU(u));
      label(ctx, fmt(u, 2), 2, yU(u), col.muted, 10);
    }
    for (const i of [0, 0.4, 0.8, 1.2]) label(ctx, fmt(i, 1), xOf(i), h - 9, col.muted, 10, "center");
    ctx.stroke();
    label(ctx, "A/cm²", right, h - 9, col.muted, 10, "right");
    // Egri chiziqlar
    const N = 200;
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = col.u;
    ctx.beginPath();
    for (let k = 0; k <= N; k++) {
      const i = (k / N) * CELL.iL * 0.995;
      const y = yU(cellVoltage(i));
      if (k === 0) ctx.moveTo(xOf(i), y);
      else ctx.lineTo(xOf(i), y);
    }
    ctx.stroke();
    ctx.strokeStyle = col.p;
    ctx.beginPath();
    for (let k = 0; k <= N; k++) {
      const i = (k / N) * CELL.iL * 0.995;
      const y = yP(stack(n, area, i * area).power);
      if (k === 0) ctx.moveTo(xOf(i), y);
      else ctx.lineTo(xOf(i), y);
    }
    ctx.stroke();
    // MPP va ish nuqtasi
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = col.p;
    ctx.beginPath();
    ctx.moveTo(xOf(mpp.i), top);
    ctx.lineTo(xOf(mpp.i), bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, `P_max = ${fmt(pMax / 1000, 1)} kW`, Math.min(xOf(mpp.i) + 4, right - 110), top + 8, col.p, 11);
    const pulse = 5 + 2 * Math.sin(t * 5);
    ctx.fillStyle = col.u;
    ctx.beginPath();
    ctx.arc(xOf(s.i), yU(s.cellV), pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col.p;
    ctx.beginPath();
    ctx.arc(xOf(s.i), yP(s.power), pulse, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, "U_element, V", left + 4, top + 26, col.u, 11);
    label(ctx, "P_stek", left + 4, top + 42, col.p, 11);
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="Stek">
          <Slider label="Elementlar soni N" value={n} min={10} max={400} step={5} onChange={setN} />
          <Slider label="Faol yuza A" value={area} min={50} max={400} step={10} unit="cm²" onChange={setArea} />
          <Slider label="Yuklama toki I" value={Math.min(curr, iMax)} min={0} max={Math.round(iMax)} step={1} unit="A" onChange={setCurr} />
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label="Qutblanish va quvvat egri chiziqlari" ratio={16 / 9} />
          <div className="lab-readouts">
            <Readout label="Tok zichligi i" value={fmt(s.i, 2)} unit="A/cm²" />
            <Readout label="U_element" value={fmt(s.cellV, 3)} unit="V" tone="u" />
            <Readout label="U_stek" value={fmt(s.stackV, 0)} unit="V" />
            <Readout label="P (elektr)" value={fmt(s.power / 1000, 1)} unit="kW" tone="p" big />
            <Readout label="Issiqlik" value={fmt(s.heat / 1000, 1)} unit="kW" tone={s.heat > s.power ? "bad" : "warn"} />
            <Readout label="FIK (LHV)" value={fmt(s.eta * 100, 0)} unit="%" tone={s.eta > 0.55 ? "ok" : s.eta > 0.45 ? "warn" : "bad"} big />
            <Readout label="H₂ sarfi" value={fmt(s.h2gps * 3.6, 2)} unit="kg/soat" tone="i" />
          </div>
          <LiveFormula>
            U_stek = {n} · {fmt(s.cellV, 3)} V = {fmt(s.stackV, 0)} V; P = {fmt(s.stackV, 0)} V · {fmt(cur, 0)} A = <b>{fmt(s.power / 1000, 1)} kW</b>
          </LiveFormula>
          {s.i > mpp.i ? <p className="lab-alert t-bad">Maksimal quvvat nuqtasidan o‘tib ketdingiz: tok oshsa ham quvvat kamayadi, issiqlik esa ortadi.</p> : null}
        </div>
      </div>
    </div>
  );
}
