"use client";
// 5-qadam: seriya-seriya (SS) kompensatsiya — C ni o'zgartirib rezonans egri chizig'ini ish chastotasiga olib kelish.
import { useMemo, useState } from "react";
import { Canvas, type DrawFn, label, LabPanel, LiveFormula, Readout, Slider, Toggle } from "@/components/template/lab";
import { fmt, fmtSi } from "@/lib/fmt";
import { resonantCap, resonantFreq, ssLink } from "@/lib/physics/wireless";

/* ---------------- Animatsiya ---------------- */

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Energiya g‘altak va kondensator o‘rtasida chayqaladi">
      <path className="am-wire" d="M120 80 H520 V220 H120 Z" />
      <path className="ws-coilpath" d="M200 80 q 10 -26 20 0 q 10 -26 20 0 q 10 -26 20 0 q 10 -26 20 0 q 10 -26 20 0" />
      <text x="250" y="40" textAnchor="middle" className="am-t">L — magnit maydon</text>
      <line x1="390" x2="390" y1="56" y2="104" className="am-wire" />
      <line x1="406" x2="406" y1="56" y2="104" className="am-wire" />
      <rect x="388" y="70" width="20" height="20" fill="var(--paper)" />
      <text x="400" y="40" textAnchor="middle" className="am-t">C — elektr maydon</text>
      {/* Energiya ustunlari */}
      <rect x="220" y="130" width="60" height="80" rx="6" className="ws-tank" />
      <rect x="220" y="130" width="60" height="80" rx="6" className="ws-fill l" />
      <rect x="370" y="130" width="60" height="80" rx="6" className="ws-tank" />
      <rect x="370" y="130" width="60" height="80" rx="6" className="ws-fill c" />
      <text x="250" y="248" textAnchor="middle" className="am-t sm">W_L = LI²/2</text>
      <text x="400" y="248" textAnchor="middle" className="am-t sm">W_C = CU²/2</text>
      <path className="ws-swap" d="M290 170 H360" />
      <text x="320" y="290" textAnchor="middle" className="am-t mut xs">rezonansda energiya chayqaladi, manba faqat yo‘qotishni to‘ldiradi</text>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

const L = 24e-6;
const R = 0.3;
const RL = 10;
const VS = 10;
const FMIN = 50e3;
const FMAX = 250e3;

export function Sim() {
  const [cNf, setCnf] = useState(70);
  const [fk, setFk] = useState(100);
  const [k, setK] = useState(0.2);
  const [comp, setComp] = useState(true);
  const C = comp ? cNf * 1e-9 : 0;
  const f = fk * 1000;
  const f0 = comp ? resonantFreq(L, C) : 0;
  const cNeed = resonantCap(L, f);
  const res = ssLink({ Vs: VS, f, L1: L, C1: C, R1: R, L2: L, C2: C, R2: R, RL, k });
  const uC = comp && C > 0 ? res.I1 / (2 * Math.PI * f * C) : 0;

  // Quvvat–chastota egri chizig'i (hisob og'ir emas, lekin har kadrda emas — faqat parametr o'zgarganda)
  const curve = useMemo(() => {
    const pts: { f: number; p: number }[] = [];
    for (let i = 0; i <= 300; i++) {
      const fi = FMIN + ((FMAX - FMIN) * i) / 300;
      pts.push({ f: fi, p: ssLink({ Vs: VS, f: fi, L1: L, C1: C, R1: R, L2: L, C2: C, R2: R, RL, k }).PL });
    }
    return pts;
  }, [C, k]);
  const pMax = Math.max(1e-3, ...curve.map((p) => p.p));
  const yMax = Math.max(pMax, 5);

  const draw: DrawFn = (ctx, w, h, _dt, t, col) => {
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    const left = 40;
    const bottom = h - 26;
    const top = 16;
    const xOf = (fi: number) => left + ((fi - FMIN) / (FMAX - FMIN)) * (w - left - 10);
    const yOf = (p: number) => bottom - (p / yMax) * (bottom - top);
    ctx.strokeStyle = col.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let fi = 50e3; fi < 250e3; fi += 50e3) {
      ctx.moveTo(xOf(fi), top);
      ctx.lineTo(xOf(fi), bottom);
      label(ctx, `${fi / 1000}`, xOf(fi), h - 10, col.muted, 10, "center");
    }
    ctx.stroke();
    label(ctx, "kHz", w - 8, h - 10, col.muted, 10, "right");
    label(ctx, `${fmt(yMax, 0)} W`, 4, top + 4, col.muted, 10);
    // Egri chiziq
    ctx.beginPath();
    curve.forEach((pt, i) => (i === 0 ? ctx.moveTo(xOf(pt.f), yOf(pt.p)) : ctx.lineTo(xOf(pt.f), yOf(pt.p))));
    ctx.strokeStyle = col.accent;
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.lineTo(xOf(FMAX), bottom);
    ctx.lineTo(xOf(FMIN), bottom);
    ctx.closePath();
    ctx.fillStyle = col.accent + "22";
    ctx.fill();
    // f₀ belgisi
    if (f0 > FMIN && f0 < FMAX) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = col.ok;
      ctx.beginPath();
      ctx.moveTo(xOf(f0), top);
      ctx.lineTo(xOf(f0), bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, `f₀ = ${fmt(f0 / 1000, 1)} kHz`, xOf(f0) + 4, top + 22, col.ok, 11);
    }
    // Ish nuqtasi
    const px = xOf(f);
    const py = yOf(res.PL);
    const pulse = 6 + 3 * Math.sin(t * 5);
    ctx.fillStyle = col.u;
    ctx.beginPath();
    ctx.arc(px, py, pulse, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, `ish nuqtasi: ${fmt(res.PL, 1)} W`, Math.min(px + 10, w - 150), Math.max(py - 12, top + 40), col.u, 11);
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="SS kontur">
          <p className="lab-note">L₁ = L₂ = 24 µH (Tx va Rx g‘altaklar)</p>
          <Toggle label="Rezonans kondensatorlari (kompensatsiya)" checked={comp} onChange={setComp} />
          <Slider label="C₁ = C₂" value={cNf} min={30} max={300} step={1} unit="nF" onChange={setCnf} hint={`Ish chastotasi uchun kerak: ${fmt(cNeed * 1e9, 1)} nF`} />
          <Slider label="Ish chastotasi f" value={fk} min={60} max={240} step={1} unit="kHz" onChange={setFk} />
          <Slider label="Bog‘lanish k" value={k} min={0.02} max={0.6} step={0.01} display={fmt(k, 2)} onChange={setK} hint="k katta bo‘lsa cho‘qqi ikkiga bo‘linadi (splitting)" />
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label="Yuklamadagi quvvatning chastotaga bog‘liqligi" ratio={16 / 9} />
          <div className="lab-readouts">
            <Readout label="f₀" value={comp ? fmt(f0 / 1000, 1) : "—"} unit="kHz" tone="ok" />
            <Readout label="P_L (yuklama)" value={fmt(res.PL, 2)} unit="W" tone="u" big />
            <Readout label="FIK η" value={fmt(res.eta * 100, 1)} unit="%" tone={res.eta > 0.8 ? "ok" : res.eta > 0.5 ? "warn" : "bad"} big />
            <Readout label="I₁ (Tx)" value={fmt(res.I1, 2)} unit="A" tone="i" />
            <Readout label="U_C₁" value={comp ? fmt(uC, 0) : "—"} unit="V" tone={uC > 100 ? "warn" : undefined} />
          </div>
          {!comp ? (
            <p className="lab-alert t-bad">Kompensatsiyasiz g‘altakning induktiv qarshiligi (ωL ≈ {fmt(2 * Math.PI * f * L, 1)} Ω) tokni cheklaydi — yuklamaga juda kam quvvat yetadi.</p>
          ) : Math.abs(f - f0) / f < 0.03 ? (
            <p className="lab-alert t-ok">Rezonans! X_L = X_C, kontur faqat aktiv qarshilikdek ko‘rinadi. Kondensatordagi kuchlanish ({fmt(uC, 0)} V) manbadan ancha katta — zaxira bilan tanlang.</p>
          ) : (
            <p className="lab-alert t-warn">Ish nuqtasi rezonansdan tashqarida: C ni {fmt(cNeed * 1e9, 1)} nF ga yaqinlashtiring.</p>
          )}
          <LiveFormula>
            f₀ = 1 / (2π√(24 µH · {comp ? `${cNf} nF` : "∞"})) = <b>{comp ? `${fmt(f0 / 1000, 1)} kHz` : "—"}</b> · U = {VS} V, R_L = {RL} Ω
          </LiveFormula>
          <p className="lab-note">Model: U = 10 V (1-garmonika, rms), R₁ = R₂ = {fmtSi(R, "Ω")}, R_L = {RL} Ω — taxminiy.</p>
        </div>
      </div>
    </div>
  );
}
