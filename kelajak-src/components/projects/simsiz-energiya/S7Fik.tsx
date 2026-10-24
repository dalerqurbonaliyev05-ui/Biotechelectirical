"use client";
// 7-qadam: FIK–masofa — k(d) modeli va η_max = x/(1+√(1+x))², x = k²Q₁Q₂.
import { useMemo, useState } from "react";
import { Canvas, type DrawFn, label, LabPanel, LiveFormula, Readout, Slider } from "@/components/template/lab";
import { fmt } from "@/lib/fmt";
import { couplingK, etaMax } from "@/lib/physics/wireless";

/* ---------------- Animatsiya ---------------- */

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Rx uzoqlashgan sari maydon kuchsizlanadi">
      {[40, 70, 100, 130, 160].map((r, k) => (
        <path key={r} d={`M120 ${150 - r} A ${r * 1.1} ${r} 0 0 1 120 ${150 + r}`} className="ws-line" style={{ animationDelay: `${k * 0.2}s`, opacity: 1 - k * 0.16 }} />
      ))}
      <rect x="100" y="100" width="20" height="100" rx="5" className="ws-core" />
      <text x="110" y="226" textAnchor="middle" className="am-t">Tx</text>
      <g className="ws-move">
        <rect x="0" y="115" width="14" height="70" rx="4" className="ws-rx" />
        <text x="7" y="210" textAnchor="middle" className="am-t sm">Rx</text>
      </g>
      <path d="M150 40 C 230 42 300 200 600 250" className="ws-eta am-draw" />
      <text x="430" y="70" className="am-t">FIK</text>
      <text x="430" y="94" className="am-t mut sm">masofa bilan keskin tushadi</text>
      <line x1="150" x2="610" y1="270" y2="270" className="am-wire thin" />
      <text x="600" y="292" textAnchor="end" className="am-t mut xs">d →</text>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

const DMAX = 200; // mm

export function Sim() {
  const [d, setD] = useState(25);
  const [r, setR] = useState(25);
  const [q1, setQ1] = useState(100);
  const [q2, setQ2] = useState(100);
  const k = couplingK(d / 1000, r / 1000);
  const x = k * k * q1 * q2;
  const eta = etaMax(k, q1, q2);
  const lambda = 3e8 / 140e3;

  const curve = useMemo(
    () =>
      Array.from({ length: 201 }, (_, i) => {
        const di = (i / 200) * DMAX;
        const ki = couplingK(di / 1000, r / 1000);
        return { d: di, k: ki, eta: etaMax(ki, q1, q2) };
      }),
    [r, q1, q2],
  );
  const d50 = curve.find((p) => p.eta < 0.5)?.d;

  const draw: DrawFn = (ctx, w, h, _dt, t, col) => {
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    const left = 34;
    const bottom = h - 24;
    const top = 14;
    const xOf = (di: number) => left + (di / DMAX) * (w - left - 10);
    const yOf = (v: number) => bottom - v * (bottom - top);
    ctx.strokeStyle = col.grid;
    ctx.beginPath();
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      ctx.moveTo(left, yOf(v));
      ctx.lineTo(w, yOf(v));
      label(ctx, `${v * 100}%`, 2, yOf(v), col.muted, 10);
    }
    for (let di = 0; di < DMAX; di += 50) label(ctx, `${di}`, xOf(di), h - 9, col.muted, 10, "center");
    ctx.stroke();
    label(ctx, "mm", w - 8, h - 9, col.muted, 10, "right");
    // r belgisi
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = col.muted;
    ctx.beginPath();
    ctx.moveTo(xOf(r), top);
    ctx.lineTo(xOf(r), bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, "d = r", xOf(r) + 4, top + 8, col.muted, 10);
    const line = (key: "k" | "eta", color: string, width: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      curve.forEach((p, i) => (i === 0 ? ctx.moveTo(xOf(p.d), yOf(p[key])) : ctx.lineTo(xOf(p.d), yOf(p[key]))));
      ctx.stroke();
    };
    line("k", col.i, 1.8);
    line("eta", col.accent, 3);
    const pulse = 5 + 2 * Math.sin(t * 5);
    ctx.fillStyle = col.u;
    ctx.beginPath();
    ctx.arc(xOf(d), yOf(eta), pulse, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, "η_max", w - 8, top + 10, col.accent, 11, "right");
    label(ctx, "k", w - 8, top + 26, col.i, 11, "right");
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="Parametrlar">
          <Slider label="Masofa d" value={d} min={0} max={DMAX} step={1} unit="mm" onChange={setD} />
          <Slider label="G‘altak radiusi r" value={r} min={10} max={100} step={1} unit="mm" onChange={setR} />
          <Slider label="Q₁ (Tx sifati)" value={q1} min={10} max={400} step={5} onChange={setQ1} />
          <Slider label="Q₂ (Rx sifati)" value={q2} min={10} max={400} step={5} onChange={setQ2} />
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label="Maksimal FIK va bog‘lanish koeffitsiyentining masofaga bog‘liqligi" ratio={16 / 9} />
          <div className="lab-readouts">
            <Readout label="k" value={fmt(k, 3)} tone="i" />
            <Readout label="x = k²Q₁Q₂" value={fmt(x, x < 10 ? 2 : 0)} />
            <Readout label="η_max" value={fmt(eta * 100, 1)} unit="%" tone={eta > 0.8 ? "ok" : eta > 0.5 ? "warn" : "bad"} big />
            <Readout label="d / r" value={fmt(d / r, 2)} />
            <Readout label="η < 50% dan boshlab" value={d50 !== undefined ? fmt(d50, 0) : `> ${DMAX}`} unit="mm" />
          </div>
          <LiveFormula>
            x = {fmt(k, 3)}² · {q1} · {q2} = {fmt(x, 2)} → η_max = x / (1 + √(1 + x))² = <b>{fmt(eta * 100, 1)}%</b>
          </LiveFormula>
          <p className="lab-note">
            Nega “yaqin maydon”? 140 kHz da to‘lqin uzunligi λ = c/f ≈ {fmt(lambda / 1000, 1)} km. G‘altaklar orasidagi santimetrlar λ/2π dan juda kichik — bu yerda nurlanish emas, tez so‘nuvchi magnit
            maydon ishlaydi (k ∝ (r/d)³). Shuning uchun masofa g‘altak radiusidan oshgach, FIK keskin tushadi.
          </p>
        </div>
      </div>
    </div>
  );
}
