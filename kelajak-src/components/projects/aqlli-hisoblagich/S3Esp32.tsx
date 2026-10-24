"use client";
// 3-qadam: ESP32 hisob-kitobi — u(t), i(t), p(t), vektor diagramma, P/Q/S/cosφ va kVt·soat hisoblagichi.
import { useMemo, useRef, useState } from "react";
import { Canvas, type DrawFn, label, LabPanel, Readout, Segmented, Slider, Toggle } from "@/components/template/lab";
import { fmt } from "@/lib/fmt";
import { energyKWh, powerFromSamples, sineSamples } from "@/lib/physics/meter";
import Odometer from "./Odometer";

/* ---------------- Animatsiya ---------------- */

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="ESP32 o‘lchov sikli">
      <g className="am-pop">
        <rect x="40" y="90" width="120" height="70" rx="12" className="am-chip" />
        <text x="100" y="122" textAnchor="middle" className="am-t w">ADC</text>
        <text x="100" y="142" textAnchor="middle" className="am-t mut sm">u[k], i[k]</text>
      </g>
      <path className="am-wire thin am-draw" style={{ animationDelay: ".4s" }} d="M160 125 H250" />
      <path className="am-flow small" d="M160 125 H250" />
      <g className="am-pop" style={{ animationDelay: ".7s" }}>
        <rect x="250" y="60" width="160" height="130" rx="14" className="am-cpu" />
        <text x="330" y="88" textAnchor="middle" className="am-t w">ESP32</text>
        <text x="270" y="116" className="am-t mono sm fix">Σu², Σi², Σu·i</text>
        <text x="270" y="140" className="am-t mono sm fix">÷ N, √ …</text>
        <text x="270" y="164" className="am-t mono sm fix">P, Q, S, cosφ</text>
        <circle className="am-spin" cx="390" cy="80" r="8" />
      </g>
      <path className="am-wire thin am-draw" style={{ animationDelay: "1.1s" }} d="M410 125 H480" />
      <path className="am-flow small" d="M410 125 H480" />
      <g className="am-pop" style={{ animationDelay: "1.4s" }}>
        <rect x="480" y="80" width="130" height="90" rx="12" className="am-chip" />
        <text x="545" y="110" textAnchor="middle" className="am-t w">∫ P dt</text>
        <text x="545" y="140" textAnchor="middle" className="am-t acc">kVt·soat</text>
      </g>
      <path className="am-sine am-draw" style={{ animationDelay: "1.8s" }} d="M40 240 q 25 -40 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0" />
      <path className="am-sine i am-draw" style={{ animationDelay: "2.1s" }} d="M58 240 q 25 -26 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0" />
      <text x="40" y="290" className="am-t mut sm">u(t) va i(t): tok kuchlanishdan φ burchakka orqada</text>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

type Load = "R" | "RL" | "RC";
const SPEEDS = [
  { value: 1, label: "×1" },
  { value: 60, label: "×60 (1 s = 1 daq)" },
  { value: 3600, label: "×3600 (1 s = 1 soat)" },
];

export function Sim() {
  const [load, setLoad] = useState<Load>("RL");
  const [phiAbs, setPhiAbs] = useState(37);
  const [urms, setUrms] = useState(230);
  const [irms, setIrms] = useState(10);
  const [harm, setHarm] = useState(false);
  const [speed, setSpeed] = useState(60);
  const [kwh, setKwh] = useState(0);
  const [virt, setVirt] = useState(0);
  const acc = useRef({ kwh: 0, virt: 0, last: 0, blink: 0 });

  const phi = load === "R" ? 0 : load === "RL" ? phiAbs : -phiAbs;
  const res = useMemo(() => {
    const s = sineSamples(urms, irms, phi, 400, harm ? 0.35 : 0);
    return powerFromSamples(s.u, s.i, phi < 0 ? -1 : 1);
  }, [urms, irms, phi, harm]);

  const draw: DrawFn = (ctx, w, h, dt, t, col) => {
    // Energiya integrali: virtual vaqt = real vaqt × tezlik
    const a = acc.current;
    a.kwh += energyKWh(res.p, dt * speed);
    a.virt += dt * speed;
    a.blink += (res.p / 3600) * dt * speed; // 1000 imp/kVt·soat → P[W]/3600 imp/s
    if (t - a.last > 0.12) {
      a.last = t;
      setKwh(a.kwh);
      setVirt(a.virt);
    }

    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    const narrow = w < 520;
    const pw = narrow ? w : w * 0.7;
    const cy = h * 0.5;
    const amp = h * 0.36;
    const um = Math.SQRT2 * urms;
    const im = Math.SQRT2 * irms;
    const ph = (phi * Math.PI) / 180;
    const scroll = t * 2 * Math.PI * 0.4;
    const hk = harm ? 0.35 : 0;
    const norm = 1 / Math.sqrt(1 + hk * hk);
    const uF = (x: number) => Math.sin(4 * Math.PI * x + scroll);
    const iF = (x: number) => norm * (Math.sin(4 * Math.PI * x + scroll - ph) + hk * Math.sin(3 * (4 * Math.PI * x + scroll - ph)));
    // p(t) = u·i (birlik amplitudalarda), maydon bilan
    ctx.beginPath();
    ctx.moveTo(0, cy);
    for (let k = 0; k <= 300; k++) {
      const x = k / 300;
      ctx.lineTo(x * pw, cy - uF(x) * iF(x) * amp * 0.9);
    }
    ctx.lineTo(pw, cy);
    ctx.closePath();
    ctx.fillStyle = col.p + "33";
    ctx.fill();
    ctx.strokeStyle = col.grid;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(pw, cy);
    ctx.stroke();
    const line = (f: (x: number) => number, color: string, width: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let k = 0; k <= 300; k++) {
        const x = k / 300;
        const y = cy - f(x) * amp;
        if (k === 0) ctx.moveTo(0, y);
        else ctx.lineTo(x * pw, y);
      }
      ctx.stroke();
    };
    line((x) => uF(x) * iF(x) * 0.9, col.p, 1.6);
    line(uF, col.u, 2.6);
    line((x) => iF(x) * 0.8, col.i, 2.6);
    label(ctx, `u: ${fmt(um, 0)} V amp.`, 8, 14, col.u, 11);
    label(ctx, `i: ${fmt(im, 1)} A amp.`, 8, 30, col.i, 11);
    label(ctx, "p = u·i", 8, 46, col.p, 11);

    if (!narrow) {
      // Vektor diagramma
      const vx = pw + (w - pw) / 2;
      const vy = cy;
      const r = Math.min((w - pw) / 2 - 14, h * 0.38);
      ctx.strokeStyle = col.grid;
      ctx.beginPath();
      ctx.arc(vx, vy, r, 0, Math.PI * 2);
      ctx.stroke();
      const arrowTo = (ang: number, len: number, color: string) => {
        const x2 = vx + Math.cos(ang) * len;
        const y2 = vy - Math.sin(ang) * len;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(vx, vy);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x2, y2, 4, 0, Math.PI * 2);
        ctx.fill();
      };
      arrowTo(0, r, col.u);
      arrowTo(-ph, r * 0.8, col.i);
      label(ctx, `φ = ${fmt(phi, 0)}°`, vx, vy + r + 12 > h - 6 ? h - 8 : vy + r + 12, col.ink, 12, "center");
      // Impuls chirog'i
      const on = a.blink % 1 < 0.15 && res.p > 0;
      ctx.fillStyle = on ? col.bad : col.grid;
      ctx.beginPath();
      ctx.arc(w - 16, 16, 7, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, "imp", w - 28, 16, col.muted, 10, "right");
    }
  };

  const hours = Math.floor(virt / 3600);
  const mins = Math.floor((virt % 3600) / 60);

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="Yuklama">
          <Segmented
            label="Yuklama turi"
            value={load}
            options={[
              { value: "R", label: "Aktiv (R)" },
              { value: "RL", label: "Induktiv (RL)" },
              { value: "RC", label: "Sig‘imli (RC)" },
            ]}
            onChange={setLoad}
          />
          <Slider label="Faza siljishi |φ|" value={load === "R" ? 0 : phiAbs} min={0} max={90} step={1} unit="°" onChange={setPhiAbs} hint={load === "R" ? "Aktiv yuklamada φ = 0" : load === "RL" ? "Tok kuchlanishdan orqada (motor, drossel)" : "Tok kuchlanishdan oldinda (kondensator)"} />
          <Slider label="Kuchlanish U_rms" value={urms} min={180} max={250} step={1} unit="V" onChange={setUrms} />
          <Slider label="Tok I_rms" value={irms} min={0.5} max={32} step={0.5} unit="A" display={fmt(irms, 1)} onChange={setIrms} />
          <Toggle label="Nochiziqli yuklama (3-garmonika, masalan LED drayver)" checked={harm} onChange={setHarm} />
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label="Kuchlanish, tok va oniy quvvat grafigi hamda vektor diagramma" ratio={16 / 9} />
          <div className="lab-readouts">
            <Readout label="U_rms" value={fmt(res.urms, 1)} unit="V" tone="u" />
            <Readout label="I_rms" value={fmt(res.irms, 2)} unit="A" tone="i" />
            <Readout label="P (aktiv)" value={fmt(res.p, 0)} unit="W" tone="p" big />
            <Readout label="Q (reaktiv)" value={fmt(res.q, 0)} unit="VAr" />
            <Readout label="S (to‘liq)" value={fmt(res.s, 0)} unit="VA" />
            <Readout label="cosφ" value={fmt(res.pf, 3)} tone={res.pf >= 0.9 ? "ok" : res.pf >= 0.7 ? "warn" : "bad"} big />
          </div>
        </div>
      </div>

      <div className="lab-cols">
        <LabPanel title="ESP32 kodi (jonli qiymatlar)">
          <pre className="lab-code">
            <code>
              {`for (k = 0; k < N; k++) {   // N = 400
  u = readU(k); i = readI(k);
  sumU2 += u*u; sumI2 += i*i;
  sumP  += u*i;
}
Urms = sqrt(sumU2/N);   // ${fmt(res.urms, 1)} V
Irms = sqrt(sumI2/N);   // ${fmt(res.irms, 2)} A
P    = sumP/N;          // ${fmt(res.p, 0)} W
S    = Urms*Irms;       // ${fmt(res.s, 0)} VA
Q    = sqrt(S*S - P*P); // ${fmt(Math.abs(res.q), 0)} VAr
pf   = P/S;             // ${fmt(res.pf, 3)}
kWh += P*dt/3.6e6;`}
            </code>
          </pre>
          {harm ? (
            <p className="lab-note">
              Garmonikalar bilan cosφ (siljish) va quvvat koeffitsiyenti P/S farq qiladi: Q formulasi endi buzilish (distortion) quvvatini ham o‘z ichiga oladi.
            </p>
          ) : null}
        </LabPanel>
        <div className="lab-screen">
          <div className="lab-meter">
            <span className="lab-meter-title">Hisoblagich (W = ∫ P dt)</span>
            <Odometer value={kwh} intDigits={5} fracDigits={3} />
            <p className="lab-meter-sub">
              Virtual vaqt: {hours} soat {mins} daq · har soatda +{fmt(Math.max(0, res.p) / 1000, 2)} kVt·soat
            </p>
          </div>
          <Segmented label="Vaqt tezligi" value={speed} options={SPEEDS} onChange={setSpeed} />
          <button
            type="button"
            className="lab-btn"
            onClick={() => {
              acc.current = { kwh: 0, virt: 0, last: 0, blink: 0 };
              setKwh(0);
              setVirt(0);
            }}
          >
            Hisoblagichni nolga qaytarish
          </button>
        </div>
      </div>
    </div>
  );
}
