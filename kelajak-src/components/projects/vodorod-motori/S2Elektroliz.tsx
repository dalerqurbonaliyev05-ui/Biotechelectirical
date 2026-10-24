"use client";
// 2-qadam: quyosh paneli bilan suv elektrolizi — Faradey qonuni, energiya va FIK, H₂ va O₂ hajmlari.
import { useRef, useState } from "react";
import { Canvas, type DrawFn, label, LabPanel, LiveFormula, Readout, Segmented, Slider } from "@/components/template/lab";
import { fmt } from "@/lib/fmt";
import { electrolysis, solarPower } from "@/lib/physics/hydrogen";

/* ---------------- Animatsiya ---------------- */

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Elektroliz: katodda vodorod, anodda kislorod pufakchalari">
      {/* Quyosh paneli */}
      <g className="am-pop">
        <circle cx="70" cy="50" r="22" className="hv-sun" />
        <rect x="40" y="96" width="100" height="60" rx="6" fill="#1d3a7a" stroke="#fff" strokeWidth="2" />
        <path d="M73 96 V156 M107 96 V156 M40 126 H140" stroke="#5a7fd0" strokeWidth="2" />
      </g>
      <path className="am-wire thin am-draw" d="M140 110 H250 V150 M140 140 H200 V250 H420 V150" />
      {/* Idish */}
      <rect x="220" y="140" width="240" height="140" rx="12" className="hv-tank-water" />
      {/* Probirkalar */}
      <rect x="236" y="40" width="40" height="190" rx="8" className="hv-tube" />
      <rect x="400" y="40" width="40" height="190" rx="8" className="hv-tube" />
      <rect x="238" y="42" width="36" height="120" className="hv-gas h" />
      <rect x="402" y="42" width="36" height="60" className="hv-gas o" />
      <line x1="256" x2="256" y1="150" y2="250" className="hv-electrode" />
      <line x1="420" x2="420" y1="150" y2="250" className="hv-electrode" />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <circle key={`h${k}`} cx={248 + (k % 3) * 8} cy="230" r="4" className="hv-bubble" style={{ animationDelay: `${k * 0.3}s` }} />
      ))}
      {[0, 1, 2].map((k) => (
        <circle key={`o${k}`} cx={414 + (k % 2) * 10} cy="230" r="5" className="hv-bubble o" style={{ animationDelay: `${k * 0.6}s` }} />
      ))}
      <text x="256" y="28" textAnchor="middle" className="am-t acc">H₂ (2V)</text>
      <text x="420" y="28" textAnchor="middle" className="am-t">O₂ (V)</text>
      <text x="300" y="268" className="am-t xs mut">katod (−)</text>
      <text x="350" y="214" className="am-t xs mut">anod (+)</text>
      <text x="480" y="200" className="am-t sm">2H₂O → 2H₂ + O₂</text>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

type Src = "sun" | "psu";
const PV_ETA = 0.2;

export function Sim() {
  const [src, setSrc] = useState<Src>("sun");
  const [g, setG] = useState(800);
  const [area, setArea] = useState(1);
  const [cells, setCells] = useState(8);
  const [uCell, setUCell] = useState(2);
  const [iManual, setIManual] = useState(10);
  const [hours, setHours] = useState(1);
  const bubbles = useRef<{ x: number; y: number; o: boolean }[]>([]);

  const pPv = solarPower(g, area, PV_ETA);
  const current = src === "sun" ? pPv / Math.max(0.1, cells * uCell) : iManual;
  const r = electrolysis(current, hours * 3600, uCell, cells);
  const kWhPerKg = r.grams > 0 ? r.kWh / (r.grams / 1000) : 0;
  // Probirka shkalasi: 10, 100, 1000 … L — to'lishi nisbatni ko'rsatadi
  const maxL = Math.max(10, 10 ** Math.ceil(Math.log10(Math.max(1, r.litres * 1.05))));

  const draw: DrawFn = (ctx, w, h, dt, _t, col) => {
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    const tubeW = Math.min(70, w * 0.12);
    const top = h * 0.08;
    const tubeH = h * 0.62;
    const xs = [w * 0.32, w * 0.62];
    // Suv
    ctx.fillStyle = "#1f4f8a";
    ctx.fillRect(w * 0.2, top + tubeH * 0.55, w * 0.6, h * 0.86 - (top + tubeH * 0.55));
    const fills = [Math.min(1, r.litres / maxL), Math.min(1, r.o2Litres / maxL)];
    xs.forEach((x, k) => {
      ctx.strokeStyle = col.ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - tubeW / 2, top, tubeW, tubeH);
      const fh = fills[k] * tubeH * 0.95;
      ctx.fillStyle = k === 0 ? col.i + "aa" : col.p + "aa";
      ctx.fillRect(x - tubeW / 2 + 2, top + 2, tubeW - 4, fh);
      label(ctx, k === 0 ? `H₂ ${fmt(r.litres, 1)} L` : `O₂ ${fmt(r.o2Litres, 1)} L`, x, top + tubeH + 16, k === 0 ? col.i : col.p, 12, "center");
    });
    // Pufakchalar: tokka proporsional
    const list = bubbles.current;
    const rate = Math.min(60, current * 1.5);
    for (let k = 0; k < rate * dt; k++) {
      const o = Math.random() < 1 / 3;
      const x = (o ? xs[1] : xs[0]) + (Math.random() - 0.5) * tubeW * 0.6;
      list.push({ x, y: h * 0.84, o });
    }
    for (const b of list) b.y -= dt * 60;
    bubbles.current = list.filter((b) => b.y > top + tubeH * 0.6).slice(-220);
    for (const b of bubbles.current) {
      ctx.strokeStyle = b.o ? col.p : "#bfeaff";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.o ? 3.5 : 2.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    label(ctx, "katod (−)", xs[0], h - 8, col.muted, 11, "center");
    label(ctx, "anod (+)", xs[1], h - 8, col.muted, 11, "center");
    label(ctx, `I = ${fmt(current, 1)} A · shkala ${fmt(maxL, 0)} L`, w - 8, 14, col.ink, 12, "right");
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="Elektrolizyor">
          <Segmented
            label="Energiya manbai"
            value={src}
            options={[
              { value: "sun", label: "Quyosh paneli" },
              { value: "psu", label: "Tok manbai" },
            ]}
            onChange={setSrc}
          />
          {src === "sun" ? (
            <>
              <Slider label="Quyosh nurlanishi G" value={g} min={0} max={1000} step={10} unit="W/m²" onChange={setG} hint="Ochiq kunduz ≈ 1000, bulutli ≈ 200–400" />
              <Slider label="Panel yuzasi A (η = 20%)" value={area} min={0.2} max={4} step={0.1} unit="m²" display={fmt(area, 1)} onChange={setArea} />
            </>
          ) : (
            <Slider label="Tok I" value={iManual} min={0} max={50} step={0.5} unit="A" display={fmt(iManual, 1)} onChange={setIManual} />
          )}
          <Slider label="Elementlar soni N" value={cells} min={1} max={20} step={1} onChange={setCells} />
          <Slider label="Element kuchlanishi U" value={uCell} min={1.5} max={2.5} step={0.05} unit="V" display={fmt(uCell, 2)} onChange={setUCell} hint="Nazariy minimum 1,23 V; amalda 1,8–2,2 V" />
          <Slider label="Vaqt t" value={hours} min={0.25} max={10} step={0.25} unit="soat" display={fmt(hours, 2)} onChange={setHours} />
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label="Elektroliz: probirkalarda yig‘ilayotgan vodorod va kislorod" ratio={16 / 9} />
          <div className="lab-readouts">
            {src === "sun" ? <Readout label="Panel quvvati" value={fmt(pPv, 0)} unit="W" tone="u" /> : null}
            <Readout label="Tok I" value={fmt(current, 2)} unit="A" tone="i" />
            <Readout label="H₂" value={fmt(r.grams, 2)} unit="g" tone="i" big />
            <Readout label="H₂ miqdori" value={fmt(r.mol, 3)} unit="mol" />
            <Readout label="Energiya" value={fmt(r.kWh, 3)} unit="kVt·soat" />
            <Readout label="FIK (HHV)" value={fmt(r.eta * 100, 0)} unit="%" tone={r.eta > 0.7 ? "ok" : "warn"} big />
            <Readout label="1 kg H₂ uchun" value={kWhPerKg ? fmt(kWhPerKg, 1) : "—"} unit="kVt·soat" />
          </div>
          <LiveFormula>
            n = I·t·N / (2F) = {fmt(current, 2)} · {fmt(hours * 3600, 0)} · {cells} / (2 · 96 485) = <b>{fmt(r.mol, 3)} mol</b> → {fmt(r.grams, 2)} g, {fmt(r.litres, 1)} L
          </LiveFormula>
          <p className="lab-note">FIK elektrolizyor elementining o‘zi uchun (1,48 V / U). Tizim (nasos, quritish, siqish) bilan birga amalda ~60–75%.</p>
        </div>
      </div>
    </div>
  );
}
