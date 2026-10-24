"use client";
// 1-qadam: Faradey induksiyasi — Tx maydoni, Rx ni surib masofa va EYuK o'zgarishini kuzatish.
import { useState } from "react";
import { Bar, Canvas, type DrawFn, label, LabPanel, LiveFormula, Readout, Slider } from "@/components/template/lab";
import { fmt, fmtSi } from "@/lib/fmt";
import { couplingK, mutualInductance } from "@/lib/physics/wireless";

/* ---------------- Animatsiya ---------------- */

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Tx g‘altak maydoni Rx g‘altakni kesib o‘tadi">
      {/* Maydon chiziqlari */}
      {[40, 62, 84, 106].map((r, k) => (
        <ellipse key={r} cx="200" cy="150" rx={r * 1.6} ry={r * 1.2} className="ws-line" style={{ animationDelay: `${k * 0.25}s` }} />
      ))}
      {/* Tx g'altak (yon ko'rinish) */}
      <g className="am-pop">
        <rect x="186" y="90" width="28" height="120" rx="6" className="ws-core" />
        {[0, 1, 2, 3, 4, 5, 6].map((k) => (
          <ellipse key={k} cx="200" cy={98 + k * 17} rx="22" ry="6" className="ws-turn" />
        ))}
        <text x="200" y="240" textAnchor="middle" className="am-t">Tx</text>
        <text x="200" y="262" textAnchor="middle" className="am-t mut sm">I₁ ~ (AC)</text>
      </g>
      {/* Rx g'altak */}
      <g className="am-pop" style={{ animationDelay: ".6s" }}>
        {[0, 1, 2, 3, 4].map((k) => (
          <ellipse key={k} cx="430" cy={116 + k * 17} rx="20" ry="6" className="ws-turn rx" />
        ))}
        <text x="430" y="240" textAnchor="middle" className="am-t">Rx</text>
        <path className="am-wire thin" d="M450 116 H540 V120 M450 184 H540 V180" />
        <circle cx="540" cy="150" r="22" className="ws-bulb" />
        <circle cx="540" cy="150" r="34" className="ws-glow" />
        <text x="540" y="200" textAnchor="middle" className="am-t sm">e = −N·dΦ/dt</text>
      </g>
      <path className="am-wire thin dash am-draw" style={{ animationDelay: "1s" }} d="M230 280 H400" />
      <text x="315" y="296" textAnchor="middle" className="am-t mut xs">havo oralig‘i d</text>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

const L1 = 24e-6;
const L2 = 24e-6;
const R_COIL = 0.025; // m, g'altak radiusi

export function Sim() {
  const [dMm, setDmm] = useState(10);
  const [fk, setFk] = useState(140);
  const [i1, setI1] = useState(1);
  const d = dMm / 1000;
  const k = couplingK(d, R_COIL);
  const M = mutualInductance(k, L1, L2);
  const w = 2 * Math.PI * fk * 1000;
  const u2 = w * M * i1; // rms
  const bright = Math.min(1, u2 / 12);

  const draw: DrawFn = (ctx, W, H, _dt, t, col) => {
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, W, H);
    const cy = H / 2;
    const tx = W * 0.18;
    const scale = (W * 0.7) / 120; // px/mm: 0…120 mm
    const rx = tx + Math.max(18, dMm * scale + 18);
    const phase = Math.sin(t * 2 * Math.PI * 0.8); // maydon "nafas oladi" (sekinlashtirilgan)
    // Maydon chiziqlari: Tx atrofida yopiq halqalar
    for (let n = 1; n <= 7; n++) {
      const a = n * W * 0.075;
      const b = H * (0.1 + n * 0.055);
      const reach = tx + a;
      const through = reach > rx; // halqa Rx dan o'tadimi
      ctx.strokeStyle = through ? col.accent : col.muted;
      ctx.globalAlpha = (0.25 + 0.6 * Math.abs(phase)) * (1 - n * 0.08);
      ctx.lineWidth = through ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.ellipse(tx, cy, a, b, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Tx g'altak
    ctx.fillStyle = col.u;
    for (let k2 = -3; k2 <= 3; k2++) {
      ctx.beginPath();
      ctx.ellipse(tx, cy + k2 * 12, 16, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    label(ctx, "Tx", tx, cy + 60, col.ink, 12, "center");
    // Rx g'altak
    ctx.fillStyle = col.i;
    for (let k2 = -2; k2 <= 2; k2++) {
      ctx.beginPath();
      ctx.ellipse(rx, cy + k2 * 12, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    label(ctx, "Rx ⇆", rx, cy + 48, col.ink, 12, "center");
    // Lampochka
    const lx = Math.min(W - 26, rx + 46);
    const glow = bright * (0.6 + 0.4 * Math.abs(phase));
    const g = ctx.createRadialGradient(lx, cy, 2, lx, cy, 34);
    g.addColorStop(0, `rgba(255, 210, 80, ${glow})`);
    g.addColorStop(1, "rgba(255, 210, 80, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, cy, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lx, cy, 11, 0, Math.PI * 2);
    ctx.stroke();
    label(ctx, `d = ${dMm} mm`, W - 8, 14, col.ink, 12, "right");
    label(ctx, "Rx ni sichqoncha/barmoq bilan suring", 8, H - 12, col.muted, 11);
  };

  const onPointer = (x: number, _y: number, W: number) => {
    const tx = W * 0.18;
    const scale = (W * 0.7) / 120;
    setDmm(Math.round(Math.min(120, Math.max(0, (x - tx - 18) / scale))));
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="Tajriba">
          <Slider label="Masofa d" value={dMm} min={0} max={120} step={1} unit="mm" onChange={setDmm} hint={`G‘altak radiusi r = ${R_COIL * 1000} mm`} />
          <Slider label="Chastota f" value={fk} min={20} max={300} step={5} unit="kHz" onChange={setFk} />
          <Slider label="Tx toki I₁ (rms)" value={i1} min={0.1} max={2} step={0.1} unit="A" display={fmt(i1, 1)} onChange={setI1} />
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label="Tx va Rx g‘altaklar, maydon chiziqlari va lampochka" ratio={16 / 8} onPointer={onPointer} />
          <div className="lab-readouts">
            <Readout label="k (bog‘lanish)" value={fmt(k, 3)} tone={k > 0.2 ? "ok" : k > 0.05 ? "warn" : "bad"} />
            <Readout label="M" value={fmtSi(M, "H")} />
            <Readout label="U₂ (Rx, rms)" value={fmtSi(u2, "V")} tone="i" big />
            <Readout label="d / r" value={fmt(d / R_COIL, 2)} />
          </div>
          <Bar label="Lampochka yorug‘ligi" value={bright} max={1} text={`${fmt(bright * 100, 0)}%`} />
          <LiveFormula>
            U₂ = ωMI₁ = 2π · {fk} kHz · {fmtSi(M, "H")} · {fmt(i1, 1)} A = <b>{fmtSi(u2, "V")}</b>
          </LiveFormula>
        </div>
      </div>
    </div>
  );
}
