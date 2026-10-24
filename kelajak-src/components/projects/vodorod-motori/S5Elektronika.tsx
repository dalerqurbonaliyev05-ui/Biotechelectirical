"use client";
// 5-qadam: quvvat elektronikasi — stek → DC/DC → shina ↔ akkumulyator, shina → inverter → motor; rekuperatsiya.
import { useRef, useState } from "react";
import { Canvas, type DrawFn, label, LabPanel, Readout, Segmented, Slider } from "@/components/template/lab";
import { fmt } from "@/lib/fmt";

/* ---------------- Animatsiya ---------------- */

function Box({ x, y, t, cls = "am-chip" }: { x: number; y: number; t: string; cls?: string }) {
  return (
    <g>
      <rect x={x - 52} y={y - 26} width="104" height="52" rx="10" className={cls} />
      <text x={x} y={y + 5} textAnchor="middle" className="am-t w sm">
        {t}
      </text>
    </g>
  );
}

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Energiya oqimi diagrammasi">
      <Box x={70} y={90} t="Stek" />
      <Box x={210} y={90} t="DC/DC boost" />
      <Box x={430} y={90} t="Inverter" />
      <Box x={570} y={90} t="Motor" cls="am-cpu" />
      <Box x={320} y={230} t="Akkumulyator" cls="am-cpu" />
      <line x1="300" x2="340" y1="60" y2="60" className="am-wire" />
      <text x="320" y="44" textAnchor="middle" className="am-t xs mut">shina 400–650 V</text>
      <path className="hv-flow" d="M122 90 H158" />
      <path className="hv-flow" d="M262 90 H378" />
      <path className="hv-flow" d="M482 90 H518" />
      <path className="hv-flow bat" d="M320 110 V204" />
      <path className="hv-flow regen" d="M518 120 C 470 170 380 190 372 210" />
      <text x="470" y="200" className="am-t xs acc">rekuperatsiya</text>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

type Drive = "acc" | "cruise" | "brake" | "stop";
const DEMAND: Record<Drive, number> = { acc: 110, cruise: 22, brake: -35, stop: 0 }; // kW, shinadan talab
const FC_MAX = 90; // kW
const FC_RAMP = 15; // kW/s
const BAT_KWH = 1.6;
const BAT_MAX = 35; // kW
const ETA_DC = 0.97;

export function Sim() {
  const [drive, setDrive] = useState<Drive>("acc");
  const [scale, setScale] = useState(100);
  const st = useRef({ fc: 0, soc: 0.6, bat: 0, brake: 0, last: 0 });
  const [view, setView] = useState({ fc: 0, soc: 0.6, bat: 0, brake: 0 });

  const draw: DrawFn = (ctx, w, h, dt, t, col) => {
    // Boshqaruv: stek sekin oshadi (rampa), farqni akkumulyator qoplaydi
    const s = st.current;
    const demand = (DEMAND[drive] * scale) / 100;
    let fcTarget = Math.max(0, Math.min(FC_MAX, demand / ETA_DC));
    if (demand >= 0 && s.soc < 0.45) fcTarget = Math.min(FC_MAX, fcTarget + 15); // akkumulyatorni zaryadlash
    const step = FC_RAMP * dt;
    s.fc += Math.max(-step * 3, Math.min(step, fcTarget - s.fc));
    let bat = demand - s.fc * ETA_DC; // + razryad, − zaryad
    s.brake = 0;
    if (bat > BAT_MAX) bat = BAT_MAX;
    if (bat < -BAT_MAX) {
      s.brake = -BAT_MAX - bat;
      bat = -BAT_MAX;
    }
    if (s.soc >= 0.95 && bat < 0) {
      s.brake += -bat;
      bat = 0;
    }
    if (s.soc <= 0.1 && bat > 0) bat = 0;
    s.bat = bat;
    s.soc = Math.min(1, Math.max(0, s.soc - (bat * dt * 4) / (BAT_KWH * 3600))); // vaqt 4× tezlashtirilgan
    if (t - s.last > 0.1) {
      s.last = t;
      setView({ fc: s.fc, soc: s.soc, bat: s.bat, brake: s.brake });
    }

    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    const small = w < 520;
    const fs = small ? 9 : 12;
    const nodes = {
      fc: { x: w * 0.1, y: h * 0.3, n: "Stek" },
      dc: { x: w * 0.32, y: h * 0.3, n: "DC/DC" },
      bus: { x: w * 0.52, y: h * 0.3, n: "Shina" },
      inv: { x: w * 0.72, y: h * 0.3, n: small ? "Inv." : "Inverter" },
      mot: { x: w * 0.9, y: h * 0.3, n: "Motor" },
      bat: { x: w * 0.52, y: h * 0.78, n: "Akk." },
    };
    const flow = (a: { x: number; y: number }, b: { x: number; y: number }, kw: number, color: string) => {
      if (Math.abs(kw) < 0.3) {
        ctx.strokeStyle = col.grid;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        return;
      }
      const [p, q] = kw > 0 ? [a, b] : [b, a];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 + Math.min(14, Math.abs(kw) / 8);
      ctx.setLineDash([2, 14]);
      ctx.lineDashOffset = -t * 60;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, `${fmt(Math.abs(kw), 0)}${small ? "" : " kW"}`, (a.x + b.x) / 2, (a.y + b.y) / 2 - 16, color, fs, "center");
    };
    const motorKw = demand;
    flow(nodes.fc, nodes.dc, s.fc, col.i);
    flow(nodes.dc, nodes.bus, s.fc * ETA_DC, col.i);
    flow(nodes.bus, nodes.inv, motorKw, motorKw >= 0 ? col.u : col.ok);
    flow(nodes.inv, nodes.mot, motorKw, motorKw >= 0 ? col.u : col.ok);
    flow(nodes.bus, nodes.bat, -bat, bat > 0 ? col.p : col.ok);
    for (const nd of Object.values(nodes)) {
      ctx.fillStyle = "#2a2160";
      ctx.strokeStyle = col.accent;
      ctx.lineWidth = 2;
      const bw = Math.min(84, w * 0.15);
      ctx.beginPath();
      ctx.rect(nd.x - bw / 2, nd.y - 18, bw, 36);
      ctx.fill();
      ctx.stroke();
      label(ctx, nd.n, nd.x, nd.y, col.ink, fs, "center");
    }
    // SOC
    const bx = w * 0.7;
    const by = h * 0.7;
    const bwid = w * 0.22;
    ctx.strokeStyle = col.ink;
    ctx.strokeRect(bx, by, bwid, 26);
    ctx.fillStyle = s.soc < 0.3 ? col.bad : col.ok;
    ctx.fillRect(bx + 2, by + 2, (bwid - 4) * s.soc, 22);
    label(ctx, `${small ? "" : "Akkumulyator "}SOC ${fmt(s.soc * 100, 0)}%`, bx + bwid / 2, by - 10, col.ink, fs, "center");
    if (s.brake > 0.5) label(ctx, `mexanik tormoz: ${fmt(s.brake, 0)} kW`, w * 0.04, h * 0.92, col.warn, 11);
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="Harakat rejimi">
          <Segmented
            label="Rejim"
            value={drive}
            options={[
              { value: "acc", label: "Tezlanish" },
              { value: "cruise", label: "Bir tekis" },
              { value: "brake", label: "Tormozlash" },
              { value: "stop", label: "To‘xtash" },
            ]}
            onChange={setDrive}
          />
          <Slider label="Talab intensivligi" value={scale} min={20} max={130} step={5} unit="%" onChange={setScale} />
          <p className="lab-note">
            Stek maks. {FC_MAX} kW, quvvati {FC_RAMP} kW/s tezlikda oshadi. Akkumulyator {BAT_KWH} kVt·soat, ±{BAT_MAX} kW. Vaqt 4× tezlashtirilgan.
          </p>
          <button
            type="button"
            className="lab-btn"
            onClick={() => {
              st.current = { fc: 0, soc: 0.6, bat: 0, brake: 0, last: 0 };
            }}
          >
            Qayta boshlash (SOC = 60%)
          </button>
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label="Quvvat oqimlari diagrammasi va akkumulyator zaryadi" ratio={16 / 9} />
          <div className="lab-readouts">
            <Readout label="Motor talabi" value={fmt((DEMAND[drive] * scale) / 100, 0)} unit="kW" tone="u" />
            <Readout label="Stek" value={fmt(view.fc, 1)} unit="kW" tone="i" />
            <Readout label="Akkumulyator" value={fmt(view.bat, 1)} unit="kW" tone={view.bat > 0 ? "p" : "ok"} />
            <Readout label="SOC" value={fmt(view.soc * 100, 0)} unit="%" tone={view.soc < 0.3 ? "bad" : "ok"} big />
          </div>
          <p className={`lab-alert ${view.bat < -0.5 ? "t-ok" : view.bat > 0.5 ? "t-warn" : "t-ok"}`}>
            {view.bat > 0.5
              ? "Akkumulyator yordam beryapti: stek quvvati hali oshib ulgurmadi yoki yetmayapti."
              : view.bat < -0.5
                ? drive === "brake"
                  ? "Rekuperatsiya: motor generator rejimida, energiya akkumulyatorga qaytmoqda."
                  : "Stek ortiqcha quvvat bilan akkumulyatorni zaryadlamoqda."
                : "Muvozanat: talabni stek to‘liq qoplayapti."}
          </p>
        </div>
      </div>
    </div>
  );
}
