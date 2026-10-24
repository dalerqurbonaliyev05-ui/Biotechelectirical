"use client";
// 3-qadam: bosimli balon — massa, zichlik taqqoslash, yurish masofasi va sizish (H₂ tepaga ko'tariladi).
import { useRef, useState } from "react";
import { Bar, Canvas, type DrawFn, label, LabPanel, LiveFormula, Readout, Segmented, Slider } from "@/components/template/lab";
import { fmt } from "@/lib/fmt";
import { h2Density, rangeKm, tankMass } from "@/lib/physics/hydrogen";

/* ---------------- Animatsiya ---------------- */

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Balon, xavfsizlik klapani va sizgan vodorodning tepaga ko‘tarilishi">
      {/* Garaj */}
      <path d="M20 280 V80 L320 20 L620 80 V280" className="hv-room" />
      <rect x="290" y="56" width="60" height="22" rx="4" className="hv-sensor" />
      <text x="320" y="72" textAnchor="middle" className="am-t w xs">H₂ datchik</text>
      <path d="M560 72 h40 M560 82 h40" className="hv-vent" />
      <text x="580" y="104" textAnchor="middle" className="am-t xs mut">shamollatish</text>
      {/* Balon */}
      <g className="am-pop">
        <rect x="160" y="190" width="280" height="70" rx="35" className="hv-cyl" />
        <rect x="170" y="200" width="260" height="50" rx="25" className="hv-cyl-in" />
        <text x="300" y="231" textAnchor="middle" className="am-t w sm">700 bar · uglerod tola</text>
        <rect x="440" y="214" width="26" height="22" rx="3" className="am-chip" />
        <text x="476" y="210" className="am-t xs">TPRD / klapan</text>
      </g>
      {/* Sizayotgan molekulalar */}
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <g key={k} transform={`translate(${452 + (k % 3) * 8} 210)`}>
          <g className="hv-rise" style={{ animationDelay: `${k * 0.5}s` }}>
            <circle cx="0" cy="0" r="4" />
            <circle cx="7" cy="0" r="4" />
          </g>
        </g>
      ))}
      <text x="30" y="150" className="am-t sm">H₂ havodan 14 baravar yengil ↑</text>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

interface Mol {
  x: number;
  y: number;
  vx: number;
}

export function Sim() {
  const [vol, setVol] = useState(122);
  const [bar, setBar] = useState(700);
  const [tC, setTC] = useState(15);
  const [cons, setCons] = useState(0.9);
  const [leak, setLeak] = useState(false);
  const leakMols = useRef<Mol[]>([]);
  const ceiling = useRef(0);

  const T = tC + 273.15;
  const rho = h2Density(bar, T);
  const m = tankMass(vol, bar, T);
  const km = rangeKm(m, cons);
  const gasolineL = (m * 33.33) / 8.9; // energiya bo'yicha ekvivalent benzin, L (8,9 kVt·soat/L)

  const draw: DrawFn = (ctx, w, h, dt, t, col) => {
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    // Balon kesimi: nuqtalar zichligi ρ ga proporsional
    const bx = w * 0.06;
    const by = h * 0.55;
    const bw = w * 0.5;
    const bh = h * 0.36;
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect?.(bx, by, bw, bh, bh / 2);
    if (!ctx.roundRect) ctx.rect(bx, by, bw, bh);
    ctx.stroke();
    const n = Math.round(rho * 6);
    ctx.fillStyle = col.i;
    for (let k = 0; k < n; k++) {
      const fx = ((k * 0.618034) % 1 + Math.sin(t * 2 + k) * 0.01 + 1) % 1;
      const fy = ((k * 0.414214) % 1 + Math.cos(t * 2.3 + k) * 0.02 + 1) % 1;
      ctx.beginPath();
      ctx.arc(bx + bh / 4 + fx * (bw - bh / 2), by + 8 + fy * (bh - 16), 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    label(ctx, `ρ = ${fmt(rho, 1)} kg/m³`, bx + 8, by - 10, col.i, 12);
    // Zichliklar taqqoslash
    const cmp = [
      { n: "1 bar", v: h2Density(1, T) },
      { n: "350 bar", v: h2Density(350, T) },
      { n: "700 bar", v: h2Density(700, T) },
      { n: "suyuq", v: 70.8 },
    ];
    const cx0 = w * 0.62;
    const cw = (w * 0.36) / cmp.length;
    cmp.forEach((c, k) => {
      const hh = (c.v / 75) * h * 0.4;
      const x = cx0 + k * cw;
      ctx.fillStyle = Math.abs(c.v - rho) < 0.5 ? col.accent : col.muted;
      ctx.fillRect(x + 4, h * 0.88 - hh, cw - 10, hh);
      label(ctx, c.n, x + cw / 2 - 1, h * 0.95, col.muted, 10, "center");
      label(ctx, fmt(c.v, 1), x + cw / 2 - 1, h * 0.88 - hh - 8, col.ink, 10, "center");
    });
    label(ctx, "zichlik, kg/m³", cx0, h * 0.4, col.muted, 11);
    // Sizish: molekulalar tepaga ko'tariladi va shift ostida to'planadi
    if (leak) {
      const list = leakMols.current;
      for (let k = 0; k < 12 * dt * 10; k++) list.push({ x: bx + bw, y: by + bh / 2, vx: (Math.random() - 0.3) * 30 });
      for (const q of list) {
        q.x += q.vx * dt;
        q.y = Math.max(16 + Math.random() * 10, q.y - 90 * dt);
      }
      leakMols.current = list.slice(-300);
      ceiling.current = Math.min(1, ceiling.current + dt * 0.05);
      ctx.fillStyle = col.i;
      for (const q of leakMols.current) {
        ctx.beginPath();
        ctx.arc(q.x, q.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      const alarm = ceiling.current > 0.3;
      ctx.fillStyle = alarm && Math.sin(t * 10) > 0 ? col.bad : col.grid;
      ctx.beginPath();
      ctx.arc(w / 2, 14, 8, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, alarm ? "DATCHIK: H₂ > 1% — klapan yopildi, shamollatish yoqildi!" : "H₂ shift ostida to‘planmoqda…", w / 2 + 14, 14, alarm ? col.bad : col.warn, 11);
    } else {
      leakMols.current = [];
      ceiling.current = 0;
      label(ctx, "shift", w / 2, 12, col.muted, 10, "center");
    }
    ctx.strokeStyle = col.grid;
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.lineTo(w, 28);
    ctx.stroke();
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="Balon">
          <Slider label="Balon hajmi V" value={vol} min={20} max={200} step={1} unit="L" onChange={setVol} />
          <Segmented
            label="Bosim"
            value={bar}
            options={[
              { value: 350, label: "350 bar (avtobus, yuk)" },
              { value: 700, label: "700 bar (yengil avto)" },
            ]}
            onChange={setBar}
          />
          <Slider label="Gaz harorati" value={tC} min={-20} max={85} step={1} unit="°C" onChange={setTC} />
          <Slider label="Sarf q" value={cons} min={0.6} max={1.5} step={0.05} unit="kg/100 km" display={fmt(cons, 2)} onChange={setCons} />
          <button type="button" className={`lab-btn${leak ? " danger" : ""}`} aria-pressed={leak} onClick={() => setLeak((v) => !v)}>
            {leak ? "Sizishni to‘xtatish" : "Sizishni simulyatsiya qilish"}
          </button>
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label="Balon kesimi, zichliklar taqqoslanishi va sizish" ratio={16 / 9} />
          <div className="lab-readouts">
            <Readout label="Zichlik ρ" value={fmt(rho, 1)} unit="kg/m³" />
            <Readout label="H₂ massasi" value={fmt(m, 2)} unit="kg" tone="i" big />
            <Readout label="Yurish masofasi" value={fmt(km, 0)} unit="km" tone="ok" big />
            <Readout label="Energiya (LHV)" value={fmt(m * 33.33, 0)} unit="kVt·soat" />
            <Readout label="Benzin ekvivalenti" value={fmt(gasolineL, 0)} unit="L" />
          </div>
          <Bar label="Balon to‘lishi (5 kg = Mirai darajasi)" value={m} max={8} text={`${fmt(m, 2)} kg`} />
          <LiveFormula>
            m = ρ·V = {fmt(rho, 1)} · {fmt(vol / 1000, 3)} = <b>{fmt(m, 2)} kg</b>; S = {fmt(m, 2)} / {fmt(cons, 2)} · 100 = <b>{fmt(km, 0)} km</b>
          </LiveFormula>
          {tC > 60 ? <p className="lab-alert t-warn">Gaz qizib ketgan: bir xil bosimda massa kamayadi, balon harorati 85 °C dan oshmasligi kerak.</p> : null}
        </div>
      </div>
    </div>
  );
}
