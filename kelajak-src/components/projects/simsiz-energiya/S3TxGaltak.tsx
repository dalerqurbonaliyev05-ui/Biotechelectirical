"use client";
// 3-qadam: yassi spiral Tx g'altak — o'ramlar, diametr, qadam → L (Wheeler) va kerakli rezonans kondensatori.
import { useState } from "react";
import { Canvas, type DrawFn, label, LabPanel, LiveFormula, Readout, Segmented, Slider } from "@/components/template/lab";
import { fmt, fmtSi } from "@/lib/fmt";
import { resonantCap, spiralInductance } from "@/lib/physics/wireless";

/* ---------------- Animatsiya ---------------- */

function spiralPath(cx: number, cy: number, rOut: number, rIn: number, turns: number): string {
  const pts: string[] = [];
  const steps = turns * 48;
  for (let i = 0; i <= steps; i++) {
    const a = (i / 48) * 2 * Math.PI;
    const r = rOut - ((rOut - rIn) * i) / steps;
    pts.push(`${i === 0 ? "M" : "L"}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Yassi spiral g‘altak o‘raladi">
      <path className="ws-spiral am-draw" d={spiralPath(200, 150, 120, 40, 7)} />
      <line x1="80" x2="320" y1="285" y2="285" className="am-wire thin" />
      <text x="200" y="278" textAnchor="middle" className="am-t sm">D_tash</text>
      <g className="am-fade" style={{ animationDelay: "1.4s" }}>
        <text x="380" y="90" className="am-t">L ∝ N²</text>
        <text x="380" y="130" className="am-t mut sm">ko‘proq o‘ram → katta L</text>
        <text x="380" y="180" className="am-t">C = 1 / ((2πf₀)²·L)</text>
        <text x="380" y="215" className="am-t mut sm">rezonans uchun kondensator</text>
      </g>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

export function Sim() {
  const [n, setN] = useState(10);
  const [dOut, setDOut] = useState(50);
  const [pitch, setPitch] = useState(1.5);
  const [f0k, setF0k] = useState(140);
  const s = spiralInductance(n, dOut, pitch);
  const C = resonantCap(s.L, f0k * 1000);
  const xl = 2 * Math.PI * f0k * 1000 * s.L;

  const draw: DrawFn = (ctx, w, h, _dt, t, col) => {
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const scale = (Math.min(w, h) * 0.86) / 120; // 120 mm ko'rinadi
    const rOut = (dOut / 2) * scale;
    const rIn = Math.max(0, (s.innerMm / 2) * scale);
    // Spiral
    const steps = Math.max(1, n) * 60;
    ctx.strokeStyle = s.ok ? col.u : col.bad;
    ctx.lineWidth = Math.max(1, pitch * scale * 0.6);
    ctx.beginPath();
    let lastX = cx;
    let lastY = cy;
    const pos: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / 60) * 2 * Math.PI;
      const r = rOut - ((rOut - rIn) * i) / steps;
      lastX = cx + r * Math.cos(a);
      lastY = cy + r * Math.sin(a);
      pos.push([lastX, lastY]);
      if (i === 0) ctx.moveTo(lastX, lastY);
      else ctx.lineTo(lastX, lastY);
    }
    ctx.stroke();
    // Tok "nuqtalari" spiral bo'ylab yuguradi
    ctx.fillStyle = col.i;
    for (let q = 0; q < 6; q++) {
      const idx = Math.floor((((t * 0.15 + q / 6) % 1) + 1) % 1 * (pos.length - 1));
      const [px, py] = pos[idx];
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    label(ctx, `Ø ${dOut} mm`, 8, 14, col.ink, 12);
    label(ctx, s.ok ? `ichki Ø ${fmt(s.innerMm, 1)} mm` : "O‘ramlar sig‘maydi!", 8, 32, s.ok ? col.muted : col.bad, 12);
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="G‘altak o‘lchamlari">
          <Slider label="O‘ramlar soni N" value={n} min={2} max={30} step={1} onChange={setN} />
          <Slider label="Tashqi diametr" value={dOut} min={20} max={120} step={1} unit="mm" onChange={setDOut} />
          <Slider label="O‘ramlar qadami (sim + oraliq)" value={pitch} min={0.5} max={3} step={0.1} unit="mm" display={fmt(pitch, 1)} onChange={setPitch} />
          <Segmented
            label="Rezonans chastotasi f₀"
            value={f0k}
            options={[
              { value: 100, label: "100 kHz" },
              { value: 140, label: "140 kHz" },
              { value: 200, label: "200 kHz" },
            ]}
            onChange={setF0k}
          />
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label="Spiral g‘altakning ustdan ko‘rinishi" ratio={16 / 10} />
          <div className="lab-readouts">
            <Readout label="Induktivlik L" value={s.ok ? fmtSi(s.L, "H") : "—"} tone="u" big />
            <Readout label="Kerakli C" value={s.ok ? fmtSi(C, "F") : "—"} tone="p" big />
            <Readout label="X_L (f₀ da)" value={s.ok ? fmt(xl, 2) : "—"} unit="Ω" />
            <Readout label="Sim uzunligi" value={fmt(s.wireM, 2)} unit="m" />
          </div>
          {s.ok ? (
            <LiveFormula>
              C = 1 / ((2π · {f0k} kHz)² · {fmtSi(s.L, "H")}) = <b>{fmtSi(C, "F")}</b>
            </LiveFormula>
          ) : (
            <p className="lab-alert t-bad">Bu qadam va o‘ramlar soni bilan spiral ichki diametri nolga yetdi. O‘ramlarni kamaytiring yoki diametrni oshiring.</p>
          )}
          <p className="lab-note">Wheeler formulasi ferritsiz g‘altak uchun taxminiy. Ferrit plastina L ni 1,5–2 baravar oshiradi — real qiymatni LCR-metr bilan o‘lchang.</p>
        </div>
      </div>
    </div>
  );
}
