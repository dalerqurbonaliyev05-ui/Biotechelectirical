"use client";
// 6-qadam: yuklama va stabilizator — stabilizatorsiz / LDO / buck, teskari aloqa bilan va usiz.
import { useMemo, useState } from "react";
import { Canvas, type DrawFn, label, LabPanel, Readout, Segmented, Slider, Toggle } from "@/components/template/lab";
import { fmt } from "@/lib/fmt";

/* ---------------- Animatsiya ---------------- */

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Teskari aloqa sxemasi: chiqish o‘lchanadi va uzatgich sozlanadi">
      <g className="am-pop">
        <rect x="30" y="110" width="110" height="70" rx="12" className="am-chip" />
        <text x="85" y="150" textAnchor="middle" className="am-t w sm">Tx inverter</text>
      </g>
      <path className="ws-wave am-draw" style={{ animationDelay: ".3s" }} d="M150 145 q 15 -18 30 0 t 30 0" />
      <g className="am-pop" style={{ animationDelay: ".6s" }}>
        <rect x="220" y="110" width="110" height="70" rx="12" className="am-chip" />
        <text x="275" y="140" textAnchor="middle" className="am-t w sm">Rx +</text>
        <text x="275" y="160" textAnchor="middle" className="am-t w sm">to‘g‘rilagich</text>
      </g>
      <path className="am-wire thin am-draw" style={{ animationDelay: ".9s" }} d="M330 145 H370" />
      <g className="am-pop" style={{ animationDelay: "1.1s" }}>
        <rect x="370" y="110" width="110" height="70" rx="12" className="am-cpu" />
        <text x="425" y="150" textAnchor="middle" className="am-t w sm">LDO / buck</text>
      </g>
      <path className="am-wire thin am-draw" style={{ animationDelay: "1.4s" }} d="M480 145 H530" />
      <g className="am-pop" style={{ animationDelay: "1.6s" }}>
        <rect x="530" y="115" width="80" height="60" rx="10" className="am-chip" />
        <text x="570" y="150" textAnchor="middle" className="am-t w sm">5 V</text>
      </g>
      <path className="ws-feedback am-draw" style={{ animationDelay: "2s" }} d="M570 175 V250 H85 V180" />
      <text x="330" y="272" textAnchor="middle" className="am-t sm acc">teskari aloqa: “kuchlanish yetmayapti / ortiqcha”</text>
      <path d="M78 190 L85 178 L92 190" fill="none" stroke="var(--accent-ink)" strokeWidth="3" />
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

type Reg = "none" | "ldo" | "buck";
const R_INT = 4; // Ω
const V_OUT = 5;
const DROP = 0.3; // V (LDO)
const ETA_BUCK = 0.9;

/** Ish nuqtasi: U_rect = Voc − I·R_ich; teskari aloqa bo'lsa Voc shunday tanlanadiki U_rect ≈ maqsad. */
function operate(reg: Reg, rl: number, fb: boolean) {
  const target = reg === "ldo" ? V_OUT + DROP + 0.2 : reg === "buck" ? 7 : V_OUT;
  const vocMax = 15;
  const pout0 = (V_OUT * V_OUT) / rl;
  let voc = 9;
  let urect = 0;
  let vout = 0;
  let iin = 0;
  let pin = 0;
  const solve = () => {
    if (reg === "none") {
      iin = voc / (rl + R_INT);
      urect = iin * rl;
      vout = urect;
      pin = urect * iin;
    } else if (reg === "ldo") {
      const iout = V_OUT / rl;
      iin = iout;
      urect = voc - iin * R_INT;
      vout = Math.min(V_OUT, Math.max(0, urect - DROP));
      // Dropout bo'lsa tok kamayadi: soddalashtirib, chiqish rezistiv deb qayta hisoblaymiz
      if (vout < V_OUT) {
        iin = Math.max(0, voc - DROP) / (rl + R_INT);
        urect = voc - iin * R_INT;
        vout = iin * rl;
      }
      pin = urect * iin;
    } else {
      const pneed = pout0 / ETA_BUCK;
      const disc = voc * voc - 4 * R_INT * pneed;
      if (disc >= 0) {
        iin = (voc - Math.sqrt(disc)) / (2 * R_INT);
        urect = voc - iin * R_INT;
        vout = V_OUT;
        pin = urect * iin;
      } else {
        // quvvat yetmaydi — bo'g'in maksimal quvvat nuqtasida, chiqish tushadi
        iin = voc / (2 * R_INT);
        urect = voc / 2;
        pin = urect * iin;
        vout = Math.sqrt(pin * ETA_BUCK * rl);
      }
    }
  };
  solve();
  if (fb) {
    // Uzatgich quvvatini moslash: oddiy iteratsiya bilan Voc ni tanlaymiz
    for (let it = 0; it < 40; it++) {
      const err = target - urect;
      voc = Math.min(vocMax, Math.max(1, voc + err * 0.6));
      solve();
    }
  }
  const pout = (vout * vout) / rl;
  return { voc, urect, vout, pout, pin, heat: Math.max(0, pin - pout), eta: pin > 0 ? pout / pin : 0 };
}

export function Sim() {
  const [rl, setRl] = useState(10);
  const [reg, setReg] = useState<Reg>("ldo");
  const [fb, setFb] = useState(false);
  const op = operate(reg, rl, fb);

  const curve = useMemo(() => {
    const pts: { r: number; v: number; u: number }[] = [];
    for (let i = 0; i <= 120; i++) {
      const r = 2 * 50 ** (i / 120); // 2…100 Ω, logarifmik
      const o = operate(reg, r, fb);
      pts.push({ r, v: o.vout, u: o.urect });
    }
    return pts;
  }, [reg, fb]);

  const draw: DrawFn = (ctx, w, h, _dt, t, col) => {
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    const left = 34;
    const bottom = h - 24;
    const top = 14;
    const xOf = (r: number) => left + (Math.log(r / 2) / Math.log(50)) * (w - left - 10);
    const yOf = (v: number) => bottom - (v / 15) * (bottom - top);
    ctx.strokeStyle = col.grid;
    ctx.beginPath();
    for (const v of [0, 5, 10, 15]) {
      ctx.moveTo(left, yOf(v));
      ctx.lineTo(w, yOf(v));
      label(ctx, `${v} V`, 2, yOf(v), col.muted, 10);
    }
    for (const r of [2, 5, 10, 20, 50, 100]) label(ctx, `${r} Ω`, xOf(r), h - 9, col.muted, 10, "center");
    ctx.stroke();
    const line = (key: "v" | "u", color: string, dash: number[]) => {
      ctx.setLineDash(dash);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      curve.forEach((p, i) => (i === 0 ? ctx.moveTo(xOf(p.r), yOf(p[key])) : ctx.lineTo(xOf(p.r), yOf(p[key]))));
      ctx.stroke();
      ctx.setLineDash([]);
    };
    line("u", col.u, [5, 4]);
    line("v", col.ok, []);
    const pulse = 5 + 2 * Math.sin(t * 5);
    ctx.fillStyle = col.ok;
    ctx.beginPath();
    ctx.arc(xOf(rl), yOf(op.vout), pulse, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, "U_chiq", w - 8, yOf(op.vout) - 12, col.ok, 11, "right");
    label(ctx, "U_rect", w - 8, Math.max(top + 6, yOf(curve[curve.length - 1].u) - 12), col.u, 11, "right");
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="Chiqish tomoni">
          <Slider label="Yuklama R_L" value={rl} min={2} max={100} step={1} unit="Ω" onChange={setRl} hint={`Telefon ~5 V 1 A ≈ 5 Ω, LED lenta ≈ 50 Ω`} />
          <Segmented
            label="Stabilizator"
            value={reg}
            options={[
              { value: "none", label: "Yo‘q" },
              { value: "ldo", label: "LDO 5 V" },
              { value: "buck", label: "Buck 5 V" },
            ]}
            onChange={setReg}
          />
          <Toggle label="Teskari aloqa (Tx quvvatini boshqarish)" checked={fb} onChange={setFb} />
          <p className="lab-note">Model: salt yurish {fb ? `${fmt(op.voc, 1)} V (moslashtirilgan)` : "9 V"}, ichki qarshilik {R_INT} Ω.</p>
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label="Chiqish kuchlanishining yuklamaga bog‘liqligi" ratio={16 / 9} />
          <div className="lab-readouts">
            <Readout label="U_rect" value={fmt(op.urect, 2)} unit="V" tone="u" />
            <Readout label="U_chiq" value={fmt(op.vout, 2)} unit="V" tone={Math.abs(op.vout - 5) < 0.15 ? "ok" : "bad"} big />
            <Readout label="P_chiq" value={fmt(op.pout, 2)} unit="W" />
            <Readout label="Issiqlik" value={fmt(op.heat, 2)} unit="W" tone={op.heat > 1.5 ? "bad" : op.heat > 0.7 ? "warn" : "ok"} />
            <Readout label="Bosqich FIK" value={fmt(op.eta * 100, 0)} unit="%" />
          </div>
          {reg === "none" ? (
            <p className="lab-alert t-bad">Stabilizatorsiz chiqish yuklamaga qarab {fmt(curve[0].v, 1)}–{fmt(curve[curve.length - 1].v, 1)} V oralig‘ida “suzadi” — telefon uchun yaroqsiz.</p>
          ) : Math.abs(op.vout - 5) > 0.15 ? (
            <p className="lab-alert t-bad">Quvvat yetmayapti: chiqish 5 V ni ushlab tura olmayapti. Teskari aloqani yoqing yoki yuklamani kamaytiring.</p>
          ) : (
            <p className="lab-alert t-ok">
              Chiqish barqaror 5 V. {reg === "ldo" ? "LDO ortiqcha kuchlanishni issiqlikka aylantiradi" : "Buck yo‘qotishi kichik"}
              {fb ? " — teskari aloqa U_rect ni kerakli darajaga tushirib, issiqlikni kamaytirdi." : "."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
