"use client";
// 1-qadam: PEM yoqilg'i elementi (zarrachalar animatsiyasi) va vodorodli ichki yonuv dvigateli bilan taqqoslash.
import { useRef, useState } from "react";
import { useReducedMotion } from "@/components/template/hooks";
import { Bar, Canvas, type DrawFn, label, LabPanel, Readout, Segmented, Slider } from "@/components/template/lab";
import { fmt } from "@/lib/fmt";
import { cellVoltage, FARADAY, M_H2, U_TN } from "@/lib/physics/hydrogen";

/* ---------------- Animatsiya ---------------- */

export function Visual() {
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="PEM yoqilg‘i elementi: protonlar membranadan, elektronlar tashqi zanjirdan o‘tadi">
      {/* Tashqi zanjir */}
      <path className="am-wire" d="M250 110 V40 H390 V110" />
      <circle cx="320" cy="40" r="18" className="hv-lamp" />
      <circle cx="320" cy="40" r="28" className="ws-glow" />
      {reduced
        ? null
        : [0, 1, 2, 3].map((k) => (
            <circle key={k} r="5" className="hv-e">
              <animateMotion dur="1.8s" begin={`${k * 0.45}s`} repeatCount="indefinite" path="M250 110 V40 H390 V110" />
            </circle>
          ))}
      {/* Anod, membrana, katod */}
      <rect x="120" y="110" width="130" height="160" rx="10" className="hv-anode" />
      <rect x="250" y="110" width="20" height="160" className="hv-cat" />
      <rect x="270" y="110" width="100" height="160" className="hv-mem" />
      <rect x="370" y="110" width="20" height="160" className="hv-cat" />
      <rect x="390" y="110" width="130" height="160" rx="10" className="hv-cathode" />
      <text x="185" y="290" textAnchor="middle" className="am-t sm">Anod (−)</text>
      <text x="320" y="290" textAnchor="middle" className="am-t sm">PEM</text>
      <text x="455" y="290" textAnchor="middle" className="am-t sm">Katod (+)</text>
      {/* H2 molekulalari */}
      {[0, 1, 2].map((k) => (
        <g key={k} transform={`translate(0 ${k * 40})`}>
          <g className="hv-h2" style={{ animationDelay: `${k * 0.8}s` }}>
            <circle cx="0" cy="150" r="8" />
            <circle cx="13" cy="150" r="8" />
          </g>
        </g>
      ))}
      <text x="40" y="130" className="am-t acc">H₂ →</text>
      {/* Protonlar */}
      {[0, 1, 2, 3].map((k) => (
        <circle key={k} cx="0" cy={140 + k * 32} r="6" className="hv-p" style={{ animationDelay: `${k * 0.5}s` }} />
      ))}
      <text x="296" y="104" className="am-t xs mut">H⁺ →</text>
      {/* O2 va suv */}
      <text x="540" y="130" className="am-t">← O₂</text>
      {[0, 1, 2].map((k) => (
        <path key={k} className="hv-water" style={{ animationDelay: `${k * 0.9}s` }} d="M470 230 q 6 10 0 14 q -6 -4 0 -14Z" />
      ))}
      <text x="540" y="256" className="am-t sm acc">H₂O</text>
      <text x="400" y="34" className="am-t sm">e⁻ → yuklama</text>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

type Mode = "fc" | "ice";
interface P {
  kind: "h2" | "hp" | "e" | "o2" | "w";
  x: number;
  y: number;
  t: number;
  ty: number;
  /** Elektron yo'li bosqichi: 0 — yuqoriga, 1 — sim bo'ylab, 2 — katodga tushish */
  ph: number;
}
const AREA = 100; // cm²

export function Sim() {
  const [mode, setMode] = useState<Mode>("fc");
  const [cur, setCur] = useState(40);
  const parts = useRef<P[]>([]);
  const spawn = useRef(0);

  const i = cur / AREA;
  const u = cellVoltage(i);
  const p = u * cur;
  const h2mg = ((cur / (2 * FARADAY)) * M_H2 * 1000); // mg/s
  const water = (h2mg / M_H2) * 18.015; // mg/s
  const etaFc = u / U_TN;
  const etaIce = 0.36;
  const eta = mode === "fc" ? etaFc : etaIce;

  const draw: DrawFn = (ctx, w, h, dt, t, col) => {
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    if (mode === "ice") {
      // Silindr va porshen
      const cx = w / 2;
      const top = h * 0.14;
      const cw = Math.min(160, w * 0.3);
      const ch = h * 0.62;
      const s = Math.sin(t * 2 * Math.PI * 0.9);
      const py = top + ch * 0.45 + s * ch * 0.22;
      ctx.strokeStyle = col.ink;
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - cw / 2, top, cw, ch);
      if (s < -0.85) {
        const g = ctx.createRadialGradient(cx, top + 20, 4, cx, top + 20, cw * 0.6);
        g.addColorStop(0, "rgba(255,190,80,.95)");
        g.addColorStop(1, "rgba(255,90,60,0)");
        ctx.fillStyle = g;
        ctx.fillRect(cx - cw / 2 + 2, top + 2, cw - 4, py - top - 4);
      }
      ctx.fillStyle = col.muted;
      ctx.fillRect(cx - cw / 2 + 4, py, cw - 8, 26);
      ctx.strokeStyle = col.muted;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx, py + 26);
      ctx.lineTo(cx + Math.cos(t * 2 * Math.PI * 0.9) * 26, h * 0.92);
      ctx.stroke();
      label(ctx, "2H₂ + O₂ → 2H₂O + issiqlik", cx, top - 10 > 8 ? top - 10 : 10, col.u, 12, "center");
      label(ctx, "+ NOx (havodagi azotdan)", cx, h - 10, col.bad, 11, "center");
      return;
    }
    const xa = w * 0.36;
    const xc = w * 0.64;
    const yTop = h * 0.3;
    const yBot = h * 0.92;
    const wireY = h * 0.1;
    // Qatlamlar
    ctx.fillStyle = col.i + "22";
    ctx.fillRect(w * 0.06, yTop, xa - w * 0.06, yBot - yTop);
    ctx.fillStyle = col.u + "33";
    ctx.fillRect(xa, yTop, xc - xa, yBot - yTop);
    ctx.fillStyle = col.p + "22";
    ctx.fillRect(xc, yTop, w * 0.94 - xc, yBot - yTop);
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xa - 6, yTop);
    ctx.lineTo(xa - 6, wireY);
    ctx.lineTo(xc + 6, wireY);
    ctx.lineTo(xc + 6, yTop);
    ctx.stroke();
    // Lampa
    const lb = Math.min(1, p / 60);
    const g = ctx.createRadialGradient(w / 2, wireY, 2, w / 2, wireY, 30);
    g.addColorStop(0, `rgba(255,210,80,${0.2 + lb * 0.8})`);
    g.addColorStop(1, "rgba(255,210,80,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w / 2, wireY, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col.bg;
    ctx.strokeStyle = col.ink;
    ctx.beginPath();
    ctx.arc(w / 2, wireY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Zarrachalar: yangi H₂ va O₂ — tokka proporsional tezlikda
    const list = parts.current;
    spawn.current += dt * cur * 0.12;
    while (spawn.current > 1 && list.length < 260) {
      spawn.current -= 1;
      const y = yTop + 12 + Math.random() * (yBot - yTop - 24);
      list.push({ kind: "h2", x: w * 0.04, y, t: 0, ty: y, ph: 0 });
      if (Math.random() < 0.5) list.push({ kind: "o2", x: w * 0.96, y: yTop + 12 + Math.random() * (yBot - yTop - 24), t: 0, ty: 0, ph: 0 });
    }
    const speed = 70 + cur * 1.2;
    for (const q of list) {
      q.t += dt;
      if (q.kind === "h2") {
        q.x += speed * dt;
        if (q.x >= xa - 4) {
          q.kind = "hp";
          list.push({ kind: "e", x: xa - 6, y: q.y, t: 0, ty: q.y, ph: 0 });
        }
      } else if (q.kind === "hp") {
        q.x += speed * 0.6 * dt;
        if (q.x >= xc) {
          q.kind = "w";
          q.ty = 0;
        }
      } else if (q.kind === "e") {
        const v = speed * 2.2 * dt;
        if (q.ph === 0) {
          q.y -= v;
          if (q.y <= wireY) {
            q.y = wireY;
            q.ph = 1;
          }
        } else if (q.ph === 1) {
          q.x += v;
          if (q.x >= xc + 6) {
            q.x = xc + 6;
            q.ph = 2;
          }
        } else {
          q.y += v;
          if (q.y >= q.ty) q.t = 99;
        }
      } else if (q.kind === "o2") {
        q.x -= speed * 0.7 * dt;
        if (q.x <= xc + 4) q.t = 99;
      } else {
        q.x += speed * 0.4 * dt;
        q.y += speed * 0.5 * dt;
        if (q.y > yBot + 10) q.t = 99;
      }
    }
    parts.current = list.filter((q) => q.t < 99 && q.x < w + 10);
    for (const q of parts.current) {
      if (q.kind === "h2") {
        ctx.fillStyle = col.i;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 4.5, 0, Math.PI * 2);
        ctx.arc(q.x + 7, q.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (q.kind === "hp") {
        ctx.fillStyle = col.u;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (q.kind === "e") {
        ctx.fillStyle = col.ok;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (q.kind === "o2") {
        ctx.fillStyle = col.p;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 5, 0, Math.PI * 2);
        ctx.arc(q.x - 8, q.y, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#7fd8ff";
        ctx.beginPath();
        ctx.arc(q.x, q.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    label(ctx, "H₂", w * 0.06, yTop - 10, col.i, 12);
    label(ctx, "H⁺ (membrana)", w / 2, yTop - 10, col.u, 12, "center");
    label(ctx, "O₂", w * 0.94, yTop - 10, col.p, 12, "right");
    label(ctx, "e⁻", xa + 8, wireY + 14, col.ok, 12);
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="Tajriba">
          <Segmented
            label="Qurilma"
            value={mode}
            options={[
              { value: "fc", label: "Yoqilg‘i elementi (PEM)" },
              { value: "ice", label: "Ichki yonuv (H₂-ICE)" },
            ]}
            onChange={setMode}
          />
          {mode === "fc" ? (
            <Slider label="Yuklama toki I (100 cm² element)" value={cur} min={0} max={140} step={1} unit="A" onChange={setCur} />
          ) : (
            <p className="lab-note">Vodorod silindrda havo bilan yonadi. Termodinamik chegara va issiqlik yo‘qotishlari tufayli FIK ~30–40%.</p>
          )}
          <Bar label="Foydali energiya ulushi" value={eta * 100} max={100} text={`${fmt(eta * 100, 0)}%`} />
          <Bar label="Issiqlikka ketadi" value={(1 - eta) * 100} max={100} text={`${fmt((1 - eta) * 100, 0)}%`} />
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label={mode === "fc" ? "PEM elementida zarrachalar harakati" : "Ichki yonuv dvigateli silindri"} ratio={16 / 9} />
          {mode === "fc" ? (
            <div className="lab-readouts">
              <Readout label="Element kuchlanishi" value={fmt(u, 3)} unit="V" tone="u" />
              <Readout label="Quvvat" value={fmt(p, 1)} unit="W" tone="p" big />
              <Readout label="H₂ sarfi" value={fmt(h2mg, 3)} unit="mg/s" tone="i" />
              <Readout label="Suv hosil bo‘ladi" value={fmt(water, 2)} unit="mg/s" />
              <Readout label="FIK (LHV)" value={fmt(etaFc * 100, 0)} unit="%" tone={etaFc > 0.55 ? "ok" : "warn"} />
            </div>
          ) : (
            <div className="lab-readouts">
              <Readout label="FIK" value="30–40" unit="%" tone="warn" big />
              <Readout label="Chiqindi" value="H₂O + NOx" />
              <Readout label="Afzalligi" value="oddiy dvigatelga o‘xshash" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
