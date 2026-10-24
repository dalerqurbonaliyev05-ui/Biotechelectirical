"use client";
// 2-qadam: ADC — namuna olish (sampling), kvantlash va aliasing.
import { useState } from "react";
import { Canvas, type DrawFn, label, LabPanel, LiveFormula, Readout, Segmented, Slider, Toggle } from "@/components/template/lab";
import { fmt, fmtSi } from "@/lib/fmt";
import { adcLsb, aliasFrequency, quantize, sqnrDb } from "@/lib/physics/meter";

const F_SIG = 50; // Hz
const VREF = 3.3;
const WINDOW = 0.1; // s — 5 davr

/* ---------------- Animatsiya ---------------- */

export function Visual() {
  // Sinusoida → nuqtalar (namunalar) → pog'onalar (kvantlash) → raqamlar oqimi.
  const pts = Array.from({ length: 17 }, (_, k) => {
    const x = 40 + k * 32;
    const y = 150 - 90 * Math.sin((k / 16) * 2 * Math.PI);
    const q = 150 - 30 * Math.round((150 - y) / 30);
    return { x, y, q, code: Math.round((150 - y) / 30) + 3 };
  });
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Sinusoidaning raqamlanishi">
      {[0, 1, 2, 3, 4, 5, 6].map((k) => (
        <line key={k} x1="30" x2="600" y1={60 + k * 30} y2={60 + k * 30} className="am-gridline" />
      ))}
      <path className="am-sine big am-draw" d={`M40 150 ${pts.map((p) => `L${p.x} ${p.y.toFixed(1)}`).join(" ")}`} />
      {pts.map((p, k) => (
        <g key={k} className="am-pop" style={{ animationDelay: `${0.9 + k * 0.08}s` }}>
          <line x1={p.x} x2={p.x} y1="150" y2={p.y} className="am-stem" />
          <circle cx={p.x} cy={p.y} r="4.5" className="am-dot" />
        </g>
      ))}
      <path
        className="am-stair am-draw"
        style={{ animationDelay: "2.4s" }}
        d={`M40 ${pts[0].q} ${pts
          .slice(1)
          .map((p) => `H${p.x} V${p.q}`)
          .join(" ")} H600`}
      />
      <g className="am-fade" style={{ animationDelay: "3.2s" }}>
        <text x="40" y="285" className="am-t mono fix">
          {pts.map((p) => p.code.toString(2).padStart(3, "0")).join(" ")}
        </text>
      </g>
      <text x="40" y="34" className="am-t">u(t) → namunalar → kvantlash (3 bit) → kodlar</text>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

const FS = [20, 40, 55, 60, 75, 90, 100, 120, 150, 200, 300, 500, 800, 1000, 2000, 5000];
const BITS = [3, 4, 8, 10, 12];

export function Sim() {
  const [fsIdx, setFsIdx] = useState(FS.indexOf(1000));
  const [bits, setBits] = useState(4);
  const [showRec, setShowRec] = useState(true);
  const fs = FS[fsIdx] ?? 1000;
  const lsb = adcLsb(VREF, bits);
  const alias = aliasFrequency(F_SIG, fs);
  const nyquistOk = fs >= 2 * F_SIG;
  const perPeriod = fs / F_SIG;

  const draw: DrawFn = (ctx, w, h, _dt, t, col) => {
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    const errH = Math.max(44, h * 0.2);
    const top = 14;
    const bot = h - errH - 18;
    const yOf = (v: number) => bot - (v / VREF) * (bot - top);
    // Kvantlash pog'onalari (faqat ko'rinadigan darajada mayda bo'lmasa)
    const levels = 2 ** bits;
    if (levels <= 32) {
      ctx.strokeStyle = col.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k <= levels; k++) {
        const y = Math.round(yOf(k * lsb)) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    }
    const phase = t * 2 * Math.PI * 0.15; // signal sekin "suriladi" — namunalar jonli o'zgaradi
    const sig = (time: number) => VREF / 2 + 0.45 * VREF * Math.sin(2 * Math.PI * F_SIG * time + phase);
    const xOf = (time: number) => (time / WINDOW) * w;

    // Analog signal
    ctx.strokeStyle = col.muted;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let k = 0; k <= 400; k++) {
      const tm = (k / 400) * WINDOW;
      const y = yOf(sig(tm));
      if (k === 0) ctx.moveTo(0, y);
      else ctx.lineTo(xOf(tm), y);
    }
    ctx.stroke();

    // Namunalar va ushlab turish (sample-and-hold) pog'onalari
    const n = Math.floor(WINDOW * fs) + 1;
    const samples: { x: number; v: number }[] = [];
    for (let k = 0; k < n; k++) {
      const tm = k / fs;
      samples.push({ x: xOf(tm), v: quantize(sig(tm), VREF, bits) });
    }
    ctx.strokeStyle = col.u;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    samples.forEach((s, k) => {
      const y = yOf(s.v);
      if (k === 0) ctx.moveTo(s.x, y);
      else ctx.lineTo(s.x, yOf(samples[k - 1].v));
      ctx.lineTo(s.x, y);
    });
    if (samples.length) ctx.lineTo(w, yOf(samples[samples.length - 1].v));
    ctx.stroke();

    if (showRec && samples.length > 1) {
      // "Qayta tiklangan" signal: namunalarni to'g'ri chiziq bilan tutashtirish
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = col.p;
      ctx.lineWidth = 2;
      ctx.beginPath();
      samples.forEach((s, k) => (k === 0 ? ctx.moveTo(s.x, yOf(s.v)) : ctx.lineTo(s.x, yOf(s.v))));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (samples.length <= 120) {
      ctx.fillStyle = col.accent;
      for (const s of samples) {
        ctx.beginPath();
        ctx.arc(s.x, yOf(s.v), 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Kvantlash xatosi (±LSB/2 masshtabida)
    const ey = h - errH / 2 - 6;
    ctx.strokeStyle = col.grid;
    ctx.beginPath();
    ctx.moveTo(0, ey);
    ctx.lineTo(w, ey);
    ctx.stroke();
    ctx.strokeStyle = col.i;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let k = 0; k <= 600; k++) {
      const tm = (k / 600) * WINDOW;
      const v = sig(tm);
      const e = (quantize(v, VREF, bits) - v) / (lsb || 1); // −0,5 … 0,5
      const y = ey - e * (errH - 12);
      if (k === 0) ctx.moveTo(0, y);
      else ctx.lineTo(xOf(tm), y);
    }
    ctx.stroke();
    label(ctx, "kvantlash xatosi (±½ LSB)", 6, h - errH - 4, col.muted, 11);
    label(ctx, `${bits} bit · fs = ${fs} Hz`, w - 8, 12, nyquistOk ? col.ink : col.bad, 12, "right");
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="ADC sozlamalari">
          <Segmented label="Razryad (N)" value={bits} options={BITS.map((b) => ({ value: b, label: `${b} bit` }))} onChange={setBits} />
          <Slider label="Namuna olish chastotasi f_s" value={fsIdx} min={0} max={FS.length - 1} step={1} unit="Hz" display={fmt(fs, 0)} onChange={setFsIdx} hint="Signal chastotasi: 50 Hz (tarmoq)" />
          <Toggle label="Namunalarni tutashtirish (qayta tiklangan signal)" checked={showRec} onChange={setShowRec} />
          <ul className="lab-legend">
            <li className="l-muted">analog signal</li>
            <li className="l-u">ADC chiqishi (ushlab turish)</li>
            <li className="l-p">qayta tiklangan</li>
            <li className="l-i">kvantlash xatosi</li>
          </ul>
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label="Signal namunalari va kvantlash grafigi" ratio={16 / 10} />
          <div className="lab-readouts">
            <Readout label="LSB" value={fmtSi(lsb, "V")} />
            <Readout label="Maks. xato" value={fmtSi(lsb / 2, "V")} />
            <Readout label="SQNR" value={fmt(sqnrDb(bits), 1)} unit="dB" />
            <Readout label="Namuna / davr" value={fmt(perPeriod, perPeriod < 10 ? 1 : 0)} tone={perPeriod < 2 ? "bad" : perPeriod < 20 ? "warn" : "ok"} />
            <Readout label="Ko‘rinadigan chastota" value={fmt(alias, 1)} unit="Hz" tone={nyquistOk ? "ok" : "bad"} />
          </div>
          {nyquistOk ? (
            <p className={`lab-alert ${perPeriod < 20 ? "t-warn" : "t-ok"}`}>
              {perPeriod < 20
                ? "Nayqvist sharti bajarilgan, lekin bir davrda namunalar kam: shakl va garmonikalar aniq o‘lchanmaydi. Hisoblagich uchun ≥ 2 kHz tavsiya etiladi."
                : "Yaxshi: bir davrda yetarlicha namuna bor, quvvat va samarali qiymatlar aniq hisoblanadi."}
            </p>
          ) : (
            <p className="lab-alert t-bad" role="alert">
              Aliasing! f_s = {fs} Hz &lt; 2 · 50 Hz. Namunalar 50 Hz o‘rniga {fmt(alias, 1)} Hz li “soxta” to‘lqinni ko‘rsatyapti.
            </p>
          )}
          <LiveFormula>
            LSB = 3,3 V / 2^{bits} = <b>{fmtSi(lsb, "V")}</b>; f_alias = |50 − {fs} · round(50/{fs})| = <b>{fmt(alias, 1)} Hz</b>
          </LiveFormula>
        </div>
      </div>
    </div>
  );
}
