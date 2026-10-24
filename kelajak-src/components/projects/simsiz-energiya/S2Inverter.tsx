"use client";
// 2-qadam: ko'prikli inverter — kalitlar navbati, to'g'ri burchakli chiqish va asosiy garmonika.
import { useState } from "react";
import { Canvas, type DrawFn, label, LabPanel, LiveFormula, Readout, Segmented, Slider } from "@/components/template/lab";
import { fmt, fmtSi } from "@/lib/fmt";
import { squareFundamental } from "@/lib/physics/wireless";

/* ---------------- Animatsiya ---------------- */

function Sw({ x, y, name, group }: { x: number; y: number; name: string; group: "a" | "b" }) {
  return (
    <g className={`ws-sw ${group}`}>
      <rect x={x - 26} y={y - 22} width="52" height="44" rx="10" />
      <text x={x} y={y + 5} textAnchor="middle" className="am-t w sm">
        {name}
      </text>
    </g>
  );
}

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="To‘liq ko‘prikli inverter: kalitlar navbat bilan ulanadi">
      <text x="30" y="34" className="am-t">U_dc +</text>
      <text x="30" y="282" className="am-t">U_dc −</text>
      <path className="am-wire am-draw" d="M100 30 H520 M100 278 H520 M200 30 V278 M440 30 V278" />
      <Sw x={200} y={90} name="Q1" group="a" />
      <Sw x={200} y={220} name="Q2" group="b" />
      <Sw x={440} y={90} name="Q3" group="b" />
      <Sw x={440} y={220} name="Q4" group="a" />
      {/* G'altak (yuklama) */}
      <path className="am-wire" d="M200 155 H268 M372 155 H440" />
      <path className="ws-coilpath" d="M268 155 q 8 -22 16 0 q 8 -22 16 0 q 8 -22 16 0 q 8 -22 16 0 q 8 -22 16 0 q 8 -22 16 0 q 8 -22 8 0" />
      <text x="320" y="190" textAnchor="middle" className="am-t sm">Tx g‘altak + C</text>
      {/* Tok yo'nalishi */}
      <text x="320" y="128" textAnchor="middle" className="ws-dir a am-t acc">→ I</text>
      <text x="320" y="128" textAnchor="middle" className="ws-dir b am-t acc">I ←</text>
      {/* Chiqish to'lqini */}
      <path className="am-stair am-draw" style={{ animationDelay: ".8s" }} d="M540 120 h20 v-40 h20 v80 h20 v-80 h20 v40" />
      <text x="580" y="190" textAnchor="middle" className="am-t mut xs">u_chiq</text>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

export function Sim() {
  const [bridge, setBridge] = useState<"full" | "half">("full");
  const [fk, setFk] = useState(140);
  const [duty, setDuty] = useState(50);
  const [udc, setUdc] = useState(12);
  const vAmp = bridge === "full" ? udc : udc / 2;
  const d = duty / 100; // yarim davrdagi ulush, 0,1…0,5
  const v1 = squareFundamental(vAmp, d);
  const T = 1 / (fk * 1000);

  const draw: DrawFn = (ctx, w, h, _dt, t, col) => {
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    const rows = [
      { name: "Q1, Q4", y: h * 0.12, color: col.u },
      { name: "Q2, Q3", y: h * 0.3, color: col.i },
    ];
    const periods = 2;
    const shift = (t * 0.25) % 1; // sekin siljish
    const pulse = (x: number, second: boolean) => {
      // x — davr ulushida (0…periods), kalit har yarim davr boshida d·T davomida yoqiladi (markazlangan)
      const ph = (((x + shift) % 1) + 1) % 1;
      const center = second ? 0.75 : 0.25;
      return Math.abs(ph - center) < d / 2 ? 1 : 0;
    };
    for (const [k, r] of rows.entries()) {
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let prev = -1;
      for (let i = 0; i <= 600; i++) {
        const x = (i / 600) * periods;
        const v = pulse(x, k === 1);
        const px = (i / 600) * w;
        const py = r.y + (1 - v) * h * 0.1;
        if (i === 0) ctx.moveTo(px, py);
        else {
          if (v !== prev) ctx.lineTo(px, r.y + (1 - prev) * h * 0.1);
          ctx.lineTo(px, py);
        }
        prev = v;
      }
      ctx.stroke();
      label(ctx, r.name, 6, r.y - 4, r.color, 11);
    }
    // Chiqish kuchlanishi va asosiy garmonika
    const cy = h * 0.72;
    const amp = h * 0.18;
    const vmax = 24;
    ctx.strokeStyle = col.grid;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i <= 600; i++) {
      const x = (i / 600) * periods;
      const v = (pulse(x, false) - pulse(x, true)) * vAmp;
      const py = cy - (v / vmax) * amp * 1.6;
      if (i === 0) ctx.moveTo(0, py);
      else ctx.lineTo((i / 600) * w, py);
    }
    ctx.stroke();
    ctx.strokeStyle = col.p;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 300; i++) {
      const x = (i / 300) * periods;
      const v = v1 * Math.sin(2 * Math.PI * (x + shift));
      const py = cy - (v / vmax) * amp * 1.6;
      if (i === 0) ctx.moveTo(0, py);
      else ctx.lineTo((i / 300) * w, py);
    }
    ctx.stroke();
    label(ctx, "u_chiq", 6, cy - amp * 1.25, col.ink, 11);
    label(ctx, "1-garmonika", w - 6, cy - amp * 1.25, col.p, 11, "right");
    label(ctx, `T = ${fmt(T * 1e6, 2)} µs`, w - 6, h - 10, col.muted, 11, "right");
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="Inverter">
          <Segmented
            label="Sxema"
            value={bridge}
            options={[
              { value: "full", label: "To‘liq ko‘prik (4 kalit)" },
              { value: "half", label: "Yarim ko‘prik (2 kalit)" },
            ]}
            onChange={setBridge}
          />
          <Slider label="Ta’minot U_dc" value={udc} min={5} max={24} step={1} unit="V" onChange={setUdc} />
          <Slider label="Chastota f" value={fk} min={80} max={300} step={5} unit="kHz" onChange={setFk} hint="Qi: taxminan 100–200 kHz" />
          <Slider label="To‘ldirish koeffitsiyenti (yarim davrda)" value={duty} min={10} max={50} step={1} unit="%" onChange={setDuty} />
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label="Kalitlarni boshqarish signallari va inverter chiqishi" ratio={16 / 9} />
          <div className="lab-readouts">
            <Readout label="Davr T" value={fmtSi(T, "s")} />
            <Readout label="Chiqish ± amplituda" value={fmt(vAmp, 1)} unit="V" />
            <Readout label="1-garmonika amplitudasi" value={fmt(v1, 2)} unit="V" tone="p" big />
            <Readout label="1-garmonika (rms)" value={fmt(v1 / Math.SQRT2, 2)} unit="V" />
          </div>
          <LiveFormula>
            U₁ = 4/π · {fmt(vAmp, 1)} V · sin(π · {fmt(d, 2)}) = <b>{fmt(v1, 2)} V</b>
          </LiveFormula>
          {duty < 50 ? <p className="lab-note">Kalitlar yarim davrning faqat bir qismida yoqilgan — oraliqda chiqish nolga teng. Bu quvvatni boshqarishning oddiy usuli.</p> : null}
        </div>
      </div>
    </div>
  );
}
