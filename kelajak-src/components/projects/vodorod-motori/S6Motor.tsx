"use client";
// 6-qadam: 3 fazali inverter va PMSM — gaz pedali → quvvat → barqaror tezlik, aylanish va H₂ sarfi.
import { useRef, useState } from "react";
import { Canvas, type DrawFn, label, LabPanel, LiveFormula, Readout, Slider } from "@/components/template/lab";
import { fmt } from "@/lib/fmt";
import { h2Per100km, MIRAI_LIKE, roadForce, steadySpeed } from "@/lib/physics/hydrogen";

/* ---------------- Animatsiya ---------------- */

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Uch fazali stator va aylanuvchi rotor">
      <circle cx="170" cy="150" r="110" className="hv-stator" />
      {[0, 120, 240].map((a, k) => (
        <g key={a} transform={`rotate(${a} 170 150)`}>
          <rect x="155" y="48" width="30" height="34" rx="6" className={`hv-phase p${k}`} />
          <rect x="155" y="218" width="30" height="34" rx="6" className={`hv-phase p${k}`} />
        </g>
      ))}
      <g className="hv-rotor-big">
        <circle cx="170" cy="150" r="56" fill="#2a2160" stroke="#fff" strokeWidth="3" />
        <path d="M170 94 A56 56 0 0 1 170 206 Z" fill="var(--c-bad)" opacity=".85" />
        <text x="196" y="155" className="am-t w sm">N</text>
        <text x="138" y="155" className="am-t w sm">S</text>
      </g>
      {/* Uch faza toki */}
      {["p0", "p1", "p2"].map((c, k) => (
        <path
          key={c}
          className={`hv-sine ${c} am-draw`}
          style={{ animationDelay: `${0.3 + k * 0.3}s` }}
          d={`M330 150 ${Array.from({ length: 61 }, (_, i) => `L${330 + i * 4.8} ${(150 - 60 * Math.sin((i / 60) * 4 * Math.PI - (k * 2 * Math.PI) / 3)).toFixed(1)}`).join(" ")}`}
        />
      ))}
      <text x="330" y="40" className="am-t">i_A, i_B, i_C — 120° siljigan</text>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

const P_MAX = 120_000; // W, motor
const GEAR = 9.3;
const R_WHEEL = 0.33; // m
const POLE_PAIRS = 4;

export function Sim() {
  const [pedal, setPedal] = useState(30);
  const ang = useRef(0);
  const car = MIRAI_LIKE;
  // Pedal quvvatni nochiziqli belgilaydi (haydovchiga qulay): P ≈ (pedal)² · P_max
  const pElec = (pedal / 100) ** 2 * P_MAX;
  const pWheel = pElec * car.etaDrive;
  const v = steadySpeed(pWheel, car);
  const kmh = v * 3.6;
  const rpm = (v / (2 * Math.PI * R_WHEEL)) * 60 * GEAR;
  const fEl = (rpm * POLE_PAIRS) / 60;
  const q = h2Per100km(v, car);
  const force = roadForce(v, car);
  const aero = 0.5 * 1.2 * car.cdA * v * v;

  const draw: DrawFn = (ctx, w, h, dt, _t, col) => {
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    // Motor: rotor aylanishi (ko'rinadigan tezlikka masshtablangan)
    const cx = w * 0.22;
    const cy = h * 0.5;
    const r = Math.min(w * 0.17, h * 0.4);
    ang.current += dt * (rpm / 60) * 2 * Math.PI * 0.02;
    ctx.strokeStyle = col.muted;
    ctx.lineWidth = r * 0.22;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // Stator fazalari — tok bilan yonadi
    const colors = [col.u, col.i, col.p];
    for (let k = 0; k < 3; k++) {
      const amp = Math.sin(ang.current - (k * 2 * Math.PI) / 3);
      for (const side of [0, Math.PI]) {
        const a = (k * 2 * Math.PI) / 3 + side;
        ctx.fillStyle = colors[k];
        ctx.globalAlpha = 0.3 + 0.7 * Math.abs(amp) * (pedal > 0 ? 1 : 0);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // Rotor
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang.current);
    ctx.fillStyle = "#2a2160";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col.bad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.restore();
    label(ctx, `${fmt(rpm, 0)} ayl/min`, cx, cy + r + r * 0.32, col.ink, 12, "center");
    // Uch faza toki
    const x0 = w * 0.46;
    const pw = w * 0.5;
    const amp = h * 0.16 * (0.25 + 0.75 * (pedal / 100));
    const cyc = 3;
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = colors[k];
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const x = i / 200;
        const y = h * 0.3 - amp * Math.sin(2 * Math.PI * cyc * x - ang.current - (k * 2 * Math.PI) / 3);
        if (i === 0) ctx.moveTo(x0 + x * pw, y);
        else ctx.lineTo(x0 + x * pw, y);
      }
      ctx.stroke();
    }
    label(ctx, `i_A, i_B, i_C · f = ${fmt(fEl, 0)} Hz`, x0, 12, col.muted, 11);
    // Spidometr
    const sx = x0 + pw / 2;
    const sy = h * 0.92;
    const sr = Math.min(pw * 0.32, h * 0.36);
    ctx.strokeStyle = col.grid;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, Math.PI, 2 * Math.PI);
    ctx.stroke();
    ctx.strokeStyle = col.accent;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, Math.PI, Math.PI + Math.PI * Math.min(1, kmh / 200));
    ctx.stroke();
    label(ctx, `${fmt(kmh, 0)} km/soat`, sx, sy - sr * 0.35, col.ink, 16, "center");
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="Haydovchi">
          <Slider label="Gaz pedali" value={pedal} min={0} max={100} step={1} unit="%" onChange={setPedal} hint={`P ≈ pedal² · ${P_MAX / 1000} kW; reduktor ${GEAR}, ${POLE_PAIRS} juft qutb`} />
          <p className="lab-note">Model: m = {car.mass} kg, C_dA = {fmt(car.cdA, 2)} m², C_rr = {car.crr}, η_yur = {car.etaDrive}, η_fc = {car.etaFc}; tekis yo‘l, shamolsiz.</p>
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label="Motor rotori, uch faza toki va spidometr" ratio={16 / 9} />
          <div className="lab-readouts">
            <Readout label="Tezlik" value={fmt(kmh, 0)} unit="km/soat" tone="ok" big />
            <Readout label="Elektr quvvat" value={fmt(pElec / 1000, 1)} unit="kW" tone="u" />
            <Readout label="Aylanish" value={fmt(rpm, 0)} unit="ayl/min" />
            <Readout label="Tok chastotasi" value={fmt(fEl, 0)} unit="Hz" />
            <Readout label="H₂ sarfi" value={fmt(q, 2)} unit="kg/100 km" tone={q > 1.5 ? "bad" : q > 1 ? "warn" : "ok"} big />
            <Readout label="Havo qarshiligi ulushi" value={fmt(force > 0 ? (aero / force) * 100 : 0, 0)} unit="%" />
          </div>
          <LiveFormula>
            F = ½·1,2·{fmt(car.cdA, 2)}·{fmt(v, 1)}² + {car.crr}·{car.mass}·9,81 = {fmt(force, 0)} N; P = F·v = <b>{fmt((force * v) / 1000, 1)} kW</b>
          </LiveFormula>
        </div>
      </div>
    </div>
  );
}
