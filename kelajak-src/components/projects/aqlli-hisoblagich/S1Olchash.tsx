"use client";
// 1-qadam: tok transformatori (CT) va kuchlanish bo'lgich.
import { useState } from "react";
import { Bar, Canvas, clamp, type DrawFn, grid, label, LabPanel, LiveFormula, plot, Readout, Segmented, Slider } from "@/components/template/lab";
import { fmt, fmtAuto, fmtSi } from "@/lib/fmt";
import { burdenVoltage, ctSecondary, dividerOut, peakFromRms } from "@/lib/physics/meter";

/* ---------------- Animatsiya ---------------- */

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Tok transformatori va kuchlanish bo‘lgich sxemasi">
      {/* Birlamchi sim */}
      <text x="250" y="40" className="am-t">L (faza), I₁</text>
      <path className="am-wire am-draw" d="M10 60 H380" />
      <path className="am-flow big" d="M10 60 H380" />
      {/* CT halqasi */}
      <g className="am-pop" style={{ animationDelay: ".5s" }}>
        <ellipse cx="170" cy="60" rx="34" ry="42" className="am-core" />
        <ellipse cx="170" cy="60" rx="20" ry="28" fill="var(--paper)" />
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <path key={k} className="am-turn" d={`M${150 + k * 8} 22 v -4`} />
        ))}
        <text x="78" y="40" className="am-t acc">CT</text>
      </g>
      {/* Magnit oqimi to'lqinlari */}
      <ellipse cx="170" cy="60" rx="46" ry="54" className="am-flux" />
      <ellipse cx="170" cy="60" rx="58" ry="66" className="am-flux d2" />
      {/* Ikkilamchi zanjir */}
      <path className="am-wire sec am-draw" style={{ animationDelay: ".9s" }} d="M150 100 V200 H110 V250 H230 V200 H190 V100" />
      <path className="am-flow small" d="M150 100 V200 H110 V250 H230 V200 H190 V100" />
      <rect x="95" y="205" width="30" height="40" rx="4" className="am-res" />
      <text x="40" y="230" className="am-t">R_b</text>
      <path className="am-wire thin am-draw" style={{ animationDelay: "1.3s" }} d="M230 225 H300" />
      <rect x="300" y="205" width="80" height="40" rx="8" className="am-chip" />
      <text x="340" y="230" textAnchor="middle" className="am-t w">ADC</text>
      <text x="20" y="288" className="am-t mut">I₂ = I₁ / n — kichik va xavfsiz tok</text>

      {/* Kuchlanish bo'lgich */}
      <g className="am-fade" style={{ animationDelay: "1.6s" }}>
        <text x="440" y="38" className="am-t">Kuchlanish bo‘lgich</text>
        <path className="am-wire" d="M470 60 V90" />
        <text x="430" y="64" className="am-t mut">L</text>
        <rect x="458" y="90" width="24" height="56" rx="4" className="am-res" />
        <text x="492" y="122" className="am-t">R₁</text>
        <path className="am-wire" d="M470 146 V176" />
        <rect x="458" y="176" width="24" height="44" rx="4" className="am-res r2" />
        <text x="492" y="202" className="am-t">R₂</text>
        <path className="am-wire" d="M470 220 V260" />
        <text x="430" y="264" className="am-t mut">N</text>
        <circle cx="470" cy="161" r="5" fill="var(--accent)" />
        <path className="am-wire thin" d="M470 161 H560" />
        <rect x="560" y="146" width="64" height="30" rx="8" className="am-chip" />
        <text x="592" y="166" textAnchor="middle" className="am-t w">ADC</text>
        <path className="am-sine sm" d="M520 140 q 6 -10 12 0 t 12 0 t 12 0" />
      </g>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

const RATIOS = [
  { value: "100:5", label: "100:5", p: 100, s: 5 },
  { value: "50:5", label: "50:5", p: 50, s: 5 },
  { value: "2000:1", label: "2000:1 (SCT-013)", p: 2000, s: 1 },
] as const;
type RatioKey = (typeof RATIOS)[number]["value"];

// E12 qatoridan yuklama rezistorlari, Om.
const RB = [0.1, 0.15, 0.22, 0.33, 0.47, 1, 2.2, 4.7, 10, 22, 33, 47, 68, 100, 150, 220];
const R1S = [
  { value: 470_000, label: "470 kΩ" },
  { value: 1_000_000, label: "1 MΩ" },
  { value: 2_200_000, label: "2,2 MΩ" },
];
const ADC_LIMIT = 1.5; // V, 1,65 V o'rta nuqtadan ±1,5 V — chetlardagi nochiziqlikdan uzoqroq

export function Sim() {
  const [i1, setI1] = useState(30);
  const [ratio, setRatio] = useState<RatioKey>("2000:1");
  const [rbIdx, setRbIdx] = useState(RB.indexOf(33));
  const [open, setOpen] = useState(false);
  const [uIn, setUIn] = useState(230);
  const [r1, setR1] = useState(1_000_000);
  const [r2k, setR2k] = useState(4);

  const rt = RATIOS.find((r) => r.value === ratio) ?? RATIOS[2];
  const rb = RB[clamp(rbIdx, 0, RB.length - 1)];
  const i2 = open ? 0 : ctSecondary(i1, rt.p, rt.s);
  const ub = burdenVoltage(i2, rb);
  const ubPk = peakFromRms(ub);
  const clip = ubPk > ADC_LIMIT;

  const r2 = r2k * 1000;
  const uOut = dividerOut(uIn, r1, r2);
  const uOutPk = peakFromRms(uOut);
  const iDiv = uIn / (r1 + r2);
  const pR1 = iDiv * iDiv * r1;

  const draw: DrawFn = (ctx, w, h, _dt, t, col) => {
    grid(ctx, w, h, col, 28);
    const top = 18;
    const bot = h - 18;
    const yOf = (v: number) => bot - (v / 3.3) * (bot - top);
    // ADC chegaralari 0 V va 3,3 V, o'rta nuqta 1,65 V
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = col.muted;
    ctx.lineWidth = 1;
    for (const v of [0, 1.65, 3.3]) {
      ctx.beginPath();
      ctx.moveTo(0, yOf(v));
      ctx.lineTo(w, yOf(v));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    label(ctx, "3,3 V", 6, yOf(3.3) + 10, col.muted, 11);
    label(ctx, "1,65 V", 6, yOf(1.65) - 9, col.muted, 11);
    label(ctx, "0 V", 6, yOf(0) - 9, col.muted, 11);
    const ph = t * 2 * Math.PI * 0.5;
    const amp = open ? 0 : ubPk;
    const sig = (x: number) => clamp(1.65 + amp * Math.sin(2 * Math.PI * 3 * x - ph), 0, 3.3);
    plot(ctx, 0, w, yOf(1.65), (bot - top) / 3.3, (x) => sig(x) - 1.65, clip ? col.bad : col.i, 2.6);
    label(ctx, open ? "Ikkilamchi zanjir ochiq!" : clip ? "Kesilish (clipping)!" : "ADC kirishidagi signal", w - 8, top + 8, open || clip ? col.bad : col.ink, 12, "right");
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="Tok transformatori (CT)">
          <Slider label="Yuklama toki I₁" value={i1} min={0} max={100} step={0.5} unit="A" display={fmt(i1, 1)} onChange={setI1} />
          <Segmented label="CT nisbati" value={ratio} options={RATIOS.map((r) => ({ value: r.value, label: r.label }))} onChange={setRatio} />
          <Slider label="Yuklama rezistori R_b" value={rbIdx} min={0} max={RB.length - 1} step={1} unit="Ω" display={fmt(rb, rb < 1 ? 2 : rb < 10 ? 1 : 0)} onChange={setRbIdx} />
          <button type="button" className={`lab-btn${open ? " danger" : ""}`} onClick={() => setOpen((v) => !v)} aria-pressed={open}>
            {open ? "R_b ni qayta ulash" : "Ikkilamchi zanjirni uzish (xavfli!)"}
          </button>
          {open ? (
            <p className="lab-alert t-bad" role="alert">
              Ikkilamchi chulg‘am ochiq: I₂ oqmaydi, o‘zak to‘yinadi va uchlarida yuzlab volt impulslar paydo bo‘ladi. Haqiqiy CT bilan buni hech qachon qilmang!
            </p>
          ) : null}
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label="ESP32 ADC kirishidagi signal grafigi" ratio={16 / 9} />
          <div className="lab-readouts">
            <Readout label="I₂ (ikkilamchi)" value={fmtSi(i2, "A")} tone="i" />
            <Readout label="U_b (rms)" value={fmtSi(ub, "V")} />
            <Readout label="U_max (amplituda)" value={fmtSi(ubPk, "V")} tone={clip ? "bad" : "ok"} />
          </div>
          <Bar label="ADC uchun amplituda (chegara ±1,5 V)" value={ubPk} max={3} limit={ADC_LIMIT} text={`${fmt(ubPk, 2)} V`} />
          <LiveFormula>
            I₂ = {fmt(i1, 1)} · {rt.s} / {rt.p} = <b>{fmtSi(i2, "A")}</b> → U_b = I₂ · {fmt(rb, 2)} Ω = <b>{fmtSi(ub, "V")}</b>
          </LiveFormula>
        </div>
      </div>

      <div className="lab-cols">
        <LabPanel title="Kuchlanish bo‘lgich">
          <Slider label="Tarmoq kuchlanishi U_kir" value={uIn} min={180} max={260} step={1} unit="V" onChange={setUIn} />
          <Segmented label="R₁ (yuqori)" value={r1} options={R1S} onChange={setR1} />
          <Slider label="R₂ (pastki)" value={r2k} min={1} max={20} step={0.1} unit="kΩ" display={fmt(r2k, 1)} onChange={setR2k} />
        </LabPanel>
        <div className="lab-screen">
          <div className="lab-readouts">
            <Readout label="U_chiq (rms)" value={fmtSi(uOut, "V")} tone="u" />
            <Readout label="U_chiq amplituda" value={fmtSi(uOutPk, "V")} tone={uOutPk > ADC_LIMIT ? "bad" : "ok"} />
            <Readout label="Bo‘lgich toki" value={fmtSi(iDiv, "A")} />
            <Readout label="R₁ dagi quvvat" value={fmtSi(pR1, "W")} tone={pR1 > 0.125 ? "warn" : undefined} />
          </div>
          <Bar label="Chiqish amplitudasi (chegara 1,5 V)" value={uOutPk} max={3} limit={ADC_LIMIT} text={`${fmt(uOutPk, 2)} V`} />
          <LiveFormula>
            U_chiq = {uIn} · {fmtAuto(r2k)} kΩ / ({fmtAuto(r1 / 1000)} kΩ + {fmtAuto(r2k)} kΩ) = <b>{fmtSi(uOut, "V")}</b>
          </LiveFormula>
          <p className="lab-note">
            Rezistorli bo‘lgich galvanik ajratmaydi — ESP32 “yer”i tarmoq potensialida bo‘ladi. Amalda ZMPT101B kabi kichik transformator datchigi xavfsizroq.
          </p>
        </div>
      </div>
    </div>
  );
}
