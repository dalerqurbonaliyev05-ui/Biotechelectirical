"use client";
// 4-qadam: Rx g'altak, diodli ko'prik va silliqlovchi kondensator — pulsatsiya simulyatsiyasi.
import { useState } from "react";
import { Bar, Canvas, type DrawFn, label, LabPanel, LiveFormula, Readout, Segmented, Slider } from "@/components/template/lab";
import { fmt, fmtSi } from "@/lib/fmt";
import { bridgeRectifier } from "@/lib/physics/wireless";

/* ---------------- Animatsiya ---------------- */

function Diode({ x, y, rot, cls }: { x: number; y: number; rot: number; cls: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} className={`ws-diode ${cls}`}>
      <path d="M-12 -12 L12 0 L-12 12 Z" />
      <line x1="12" x2="12" y1="-13" y2="13" />
    </g>
  );
}

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Diodli ko‘prik ikki yarim to‘lqinni bir yo‘nalishga buradi">
      {/* Rx g'altak */}
      <path className="ws-coilpath" d="M80 90 q 22 8 0 16 q 22 8 0 16 q 22 8 0 16 q 22 8 0 16 q 22 8 0 16 q 22 8 0 16 q 22 8 0 16 q 22 8 0 24" />
      <text x="34" y="156" className="am-t">Rx</text>
      <path className="am-wire thin" d="M80 90 V60 H180 V150 H230 M80 210 V285 H400 V150 H370" />
      {/* Ko'prik: chap/o'ng tugun — AC, yuqori — "+", pastki — "−" */}
      <path className="am-wire thin" d="M230 150 L300 60 L370 150 L300 240 Z" />
      <Diode x={265} y={105} rot={-52} cls="a" />
      <Diode x={335} y={105} rot={-128} cls="b" />
      <Diode x={265} y={195} rot={-128} cls="b" />
      <Diode x={335} y={195} rot={-52} cls="a" />
      <text x="232" y="96" className="am-t xs mut">D1</text>
      <text x="350" y="96" className="am-t xs mut">D2</text>
      <text x="232" y="216" className="am-t xs mut">D3</text>
      <text x="350" y="216" className="am-t xs mut">D4</text>
      {/* Chiqish: kondensator va yuklama */}
      <path className="am-wire thin" d="M300 60 V40 H560 V100 M300 240 V258 H560 V200 M470 40 V138 M470 152 V258" />
      <line x1="448" x2="492" y1="138" y2="138" className="am-wire" />
      <line x1="448" x2="492" y1="152" y2="152" className="am-wire" />
      <text x="500" y="150" className="am-t sm">C</text>
      <rect x="540" y="100" width="40" height="100" rx="8" className="am-chip" />
      <text x="560" y="155" textAnchor="middle" className="am-t w sm">R_L</text>
      <text x="312" y="34" className="am-t sm acc">+</text>
      <text x="312" y="278" className="am-t sm">−</text>
      <path className="ws-ripple am-draw" style={{ animationDelay: ".6s" }} d="M590 70 q 8 -22 16 0 l 6 4 q 8 -24 16 -4" />
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

const CAPS = [0.47, 1, 2.2, 4.7, 10, 22, 47]; // µF
const F = 140e3;

export function Sim() {
  const [vm, setVm] = useState(9);
  const [diode, setDiode] = useState<"si" | "sch">("sch");
  const [cIdx, setCIdx] = useState(CAPS.indexOf(10));
  const [iL, setIL] = useState(0.5);
  const vf = diode === "si" ? 0.7 : 0.35;
  const C = CAPS[cIdx] * 1e-6;
  const r = bridgeRectifier(vm, vf, iL, F, C);
  const vpk = Math.max(0, vm - 2 * vf);
  const ripplePct = r.vdc > 0 ? (r.ripple / r.vdc) * 100 : 0;

  const draw: DrawFn = (ctx, w, h, _dt, t, col) => {
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    const periods = 3;
    const cy = h * 0.55;
    const scale = (h * 0.42) / 15;
    const yOf = (v: number) => cy - v * scale;
    ctx.strokeStyle = col.grid;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
    const shift = t * 0.2;
    const N = 900;
    // AC kirish
    ctx.strokeStyle = col.muted;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * periods;
      const v = vm * Math.sin(2 * Math.PI * (x + shift));
      if (i === 0) ctx.moveTo(0, yOf(v));
      else ctx.lineTo((i / N) * w, yOf(v));
    }
    ctx.stroke();
    // To'g'rilangan |u| − 2U_f
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = col.u;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * periods;
      const v = Math.max(0, Math.abs(vm * Math.sin(2 * Math.PI * (x + shift))) - 2 * vf);
      if (i === 0) ctx.moveTo(0, yOf(v));
      else ctx.lineTo((i / N) * w, yOf(v));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // Kondensatordagi kuchlanish: zaryad (cho'qqiga) va yuklama orqali chiziqli razryad
    const dtSim = periods / F / N; // s har qadamda
    let vc = vpk;
    ctx.strokeStyle = col.ok;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i <= N; i++) {
        const x = (i / N) * periods;
        const rect = Math.max(0, Math.abs(vm * Math.sin(2 * Math.PI * (x + shift))) - 2 * vf);
        vc = Math.max(rect, vc - (iL / C) * dtSim);
        if (pass === 1) {
          if (i === 0) ctx.moveTo(0, yOf(vc));
          else ctx.lineTo((i / N) * w, yOf(vc));
        }
      }
    }
    ctx.stroke();
    label(ctx, "AC (Rx)", 6, 14, col.muted, 11);
    label(ctx, "|u| − 2U_f", 80, 14, col.u, 11);
    label(ctx, "U_C (chiqish)", 180, 14, col.ok, 11);
    label(ctx, `f = 140 kHz, pulsatsiya 280 kHz`, w - 6, h - 10, col.muted, 11, "right");
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="Rx tomoni">
          <Slider label="Rx dagi amplituda U_m" value={vm} min={3} max={15} step={0.5} unit="V" display={fmt(vm, 1)} onChange={setVm} />
          <Segmented
            label="Diodlar"
            value={diode}
            options={[
              { value: "sch", label: "Shottki (0,35 V)" },
              { value: "si", label: "Kremniy (0,7 V)" },
            ]}
            onChange={setDiode}
          />
          <Slider label="Silliqlovchi C" value={cIdx} min={0} max={CAPS.length - 1} step={1} unit="µF" display={fmt(CAPS[cIdx], CAPS[cIdx] < 1 ? 2 : CAPS[cIdx] < 10 ? 1 : 0)} onChange={setCIdx} />
          <Slider label="Yuklama toki I" value={iL} min={0.05} max={1.5} step={0.05} unit="A" display={fmt(iL, 2)} onChange={setIL} />
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label="Rx kuchlanishi, to‘g‘rilangan va silliqlangan chiqish" ratio={16 / 9} />
          <div className="lab-readouts">
            <Readout label="U_dc (o‘rtacha)" value={fmt(r.vdc, 2)} unit="V" tone="ok" big />
            <Readout label="Pulsatsiya ΔU" value={fmtSi(r.ripple, "V")} tone={ripplePct > 10 ? "bad" : ripplePct > 3 ? "warn" : "ok"} />
            <Readout label="Pulsatsiya %" value={fmt(ripplePct, 1)} unit="%" />
            <Readout label="Diodlardagi yo‘qotish" value={fmt(2 * vf * iL, 2)} unit="W" />
          </div>
          <Bar label="Pulsatsiya (chegara 5%)" value={ripplePct} max={20} limit={5} text={`${fmt(ripplePct, 1)}%`} />
          <LiveFormula>
            ΔU = I / (2f·C) = {fmt(iL, 2)} / (2 · 140 kHz · {fmt(CAPS[cIdx], 2)} µF) = <b>{fmtSi(r.ripple, "V")}</b>
          </LiveFormula>
        </div>
      </div>
    </div>
  );
}
