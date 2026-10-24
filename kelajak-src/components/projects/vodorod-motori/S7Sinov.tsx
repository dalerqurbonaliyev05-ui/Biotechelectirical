"use client";
// 7-qadam: sinov va xavfsizlik — azot bilan bosim sinovi, shamollatish va H₂ konsentratsiyasi, avtomobil kalkulyatori.
import { useState } from "react";
import { Canvas, type DrawFn, label, LabPanel, LiveFormula, Readout, Segmented, Slider } from "@/components/template/lab";
import { fmt } from "@/lib/fmt";
import { h2Per100km, MIRAI_LIKE, rangeKm, steadySpeed, tankMass } from "@/lib/physics/hydrogen";

/* ---------------- Animatsiya ---------------- */

const STEPS = ["N₂ bilan bosim sinovi", "Sizish izlash (datchik, sovun)", "Shamollatish tekshiruvi", "Yerga ulash (statik)", "Birinchi ishga tushirish"];

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Sinov ketma-ketligi">
      {STEPS.map((s, k) => (
        <g key={s} className="am-pop" style={{ animationDelay: `${k * 0.45}s` }}>
          <circle cx={70 + k * 125} cy="110" r="34" className="hv-step" />
          <text x={70 + k * 125} y="118" textAnchor="middle" className="am-t w">
            {k + 1}
          </text>
          <path className="hv-check" style={{ animationDelay: `${0.3 + k * 0.45}s` }} d={`M${56 + k * 125} 160 l10 10 l20 -22`} />
          <foreignObject x={10 + k * 125} y="190" width="120" height="80">
            <p className="hv-step-txt">{s}</p>
          </foreignObject>
        </g>
      ))}
      <path className="am-wire thin am-draw" d="M104 110 H161 M229 110 H286 M354 110 H411 M479 110 H536" />
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

type Tab = "bosim" | "shamol" | "avto";
const ROOM_L = 50_000; // 50 m³ garaj

export function Sim() {
  const [tab, setTab] = useState<Tab>("bosim");
  // Bosim sinovi
  const [p0, setP0] = useState(770);
  const [hole, setHole] = useState(5);
  const tau = hole > 0 ? 4.5e7 / (hole * hole) : Infinity;
  const drop = 1 - Math.exp(-1800 / tau);
  const pass = drop <= 0.01;
  // Shamollatish
  const [qLeak, setQLeak] = useState(5);
  const [qVent, setQVent] = useState(500);
  const cSS = qLeak + qVent > 0 ? qLeak / (qLeak + qVent) : 0;
  const conc = (tMin: number) => (qVent > 0 ? cSS * (1 - Math.exp((-tMin * (qLeak + qVent)) / ROOM_L)) : (qLeak * tMin) / ROOM_L);
  const tTo = (c: number) => {
    if (qVent > 0 && c >= cSS) return Infinity;
    if (qVent <= 0) return qLeak > 0 ? (c * ROOM_L) / qLeak : Infinity;
    return (-ROOM_L / (qLeak + qVent)) * Math.log(1 - c / cSS);
  };
  const t1 = tTo(0.01);
  // Avtomobil
  const [vol, setVol] = useState(142);
  const [bar, setBar] = useState(700);
  const [fcKw, setFcKw] = useState(114);
  const [kmhCruise, setKmhCruise] = useState(100);
  const [price, setPrice] = useState(120000);
  const m = tankMass(vol, bar, 288);
  const q = h2Per100km(kmhCruise / 3.6, MIRAI_LIKE);
  const km = rangeKm(m, q);
  const vMax = steadySpeed(fcKw * 1000 * 0.97 * MIRAI_LIKE.etaDrive, MIRAI_LIKE) * 3.6;

  const draw: DrawFn = (ctx, w, h, _dt, t, col) => {
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    const left = 40;
    const right = w - 12;
    const top = 16;
    const bottom = h - 24;
    ctx.strokeStyle = col.grid;
    ctx.lineWidth = 1;
    if (tab === "bosim") {
      const yMin = 1 - Math.max(0.02, Math.min(0.2, drop * 1.6));
      const xOf = (min: number) => left + (min / 30) * (right - left);
      const yOf = (ratio: number) => bottom - ((ratio - yMin) / (1 - yMin)) * (bottom - top);
      for (const r of [yMin, (yMin + 0.99) / 2, 0.99, 1]) {
        ctx.beginPath();
        ctx.moveTo(left, yOf(r));
        ctx.lineTo(right, yOf(r));
        ctx.stroke();
        label(ctx, `${fmt(r * 100, 1)}%`, 2, yOf(r), col.muted, 10);
      }
      for (const mm of [0, 10, 20, 30]) label(ctx, `${mm} daq`, xOf(mm), h - 9, col.muted, 10, "center");
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = col.warn;
      ctx.beginPath();
      ctx.moveTo(left, yOf(0.99));
      ctx.lineTo(right, yOf(0.99));
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, "ruxsat: −1%", right - 4, yOf(0.99) - 9, col.warn, 10, "right");
      const prog = (t % 6) / 6; // 30 daqiqa 6 soniyada
      ctx.strokeStyle = pass ? col.ok : col.bad;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (let k = 0; k <= 200 * prog; k++) {
        const mm = (k / 200) * 30;
        const r = Math.max(yMin, Math.exp((-mm * 60) / tau));
        if (k === 0) ctx.moveTo(xOf(mm), yOf(r));
        else ctx.lineTo(xOf(mm), yOf(r));
      }
      ctx.stroke();
      const cur = Math.exp((-prog * 1800) / tau);
      label(ctx, `p = ${fmt(p0 * cur, 1)} bar`, left + 6, bottom - 12, col.ink, 12);
    } else if (tab === "shamol") {
      const cMaxView = 0.05;
      const xOf = (min: number) => left + (min / 60) * (right - left);
      const yOf = (c: number) => bottom - (Math.min(c, cMaxView) / cMaxView) * (bottom - top);
      for (const [c, n, cc] of [
        [0.004, "0,4% ogohlantirish", col.warn],
        [0.01, "1% avariya", col.bad],
        [0.04, "4% LEL — portlash chegarasi", col.bad],
      ] as const) {
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = cc;
        ctx.beginPath();
        ctx.moveTo(left, yOf(c));
        ctx.lineTo(right, yOf(c));
        ctx.stroke();
        ctx.setLineDash([]);
        label(ctx, n, right - 4, yOf(c) - 9, cc, 10, "right");
      }
      for (const mm of [0, 15, 30, 45, 60]) label(ctx, `${mm} daq`, xOf(mm), h - 9, col.muted, 10, "center");
      const prog = Math.min(1, (t % 8) / 6);
      ctx.strokeStyle = col.i;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (let k = 0; k <= 200 * prog; k++) {
        const mm = (k / 200) * 60;
        if (k === 0) ctx.moveTo(xOf(mm), yOf(conc(mm)));
        else ctx.lineTo(xOf(mm), yOf(conc(mm)));
      }
      ctx.stroke();
      label(ctx, `C = ${fmt(conc(prog * 60) * 100, 2)}%`, left + 6, top + 6, col.ink, 12);
    } else {
      // Avtomobil sxemasi: balon to'lishi va masofa shkalasi
      const bw = (right - left) * 0.5;
      ctx.strokeStyle = col.ink;
      ctx.lineWidth = 3;
      ctx.strokeRect(left, h * 0.2, bw, h * 0.22);
      ctx.fillStyle = col.i;
      ctx.fillRect(left + 3, h * 0.2 + 3, (bw - 6) * Math.min(1, m / 8), h * 0.22 - 6);
      label(ctx, `${fmt(m, 2)} kg H₂`, left + bw / 2, h * 0.31, col.bg, 13, "center");
      const xKm = (k: number) => left + (Math.min(k, 1000) / 1000) * (right - left);
      ctx.strokeStyle = col.grid;
      ctx.beginPath();
      ctx.moveTo(left, h * 0.72);
      ctx.lineTo(right, h * 0.72);
      ctx.stroke();
      for (const k of [0, 250, 500, 750, 1000]) label(ctx, `${k} km`, xKm(k), h * 0.84, col.muted, 10, "center");
      const carX = xKm(km * Math.min(1, (t % 5) / 4));
      ctx.fillStyle = col.accent;
      ctx.beginPath();
      ctx.roundRect?.(carX - 18, h * 0.72 - 22, 36, 16, 6);
      ctx.fill();
      ctx.fillStyle = col.ink;
      ctx.beginPath();
      ctx.arc(carX - 10, h * 0.72 - 5, 4, 0, Math.PI * 2);
      ctx.arc(carX + 10, h * 0.72 - 5, 4, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, `${fmt(km, 0)} km`, xKm(km), h * 0.72 - 34, col.ok, 13, "center");
    }
  };

  return (
    <div className="lab">
      <Segmented
        label="Sinov"
        value={tab}
        options={[
          { value: "bosim", label: "N₂ bosim sinovi" },
          { value: "shamol", label: "Shamollatish" },
          { value: "avto", label: "Avtomobil kalkulyatori" },
        ]}
        onChange={setTab}
      />
      <div className="lab-cols">
        <LabPanel title={tab === "bosim" ? "Bosim ushlab turish" : tab === "shamol" ? "Garaj (50 m³)" : "Mening avtomobilim"}>
          {tab === "bosim" ? (
            <>
              <Slider label="Sinov bosimi p₀ (azot)" value={p0} min={50} max={900} step={10} unit="bar" onChange={setP0} hint="Odatda ish bosimining 1,1–1,5 baravari" />
              <Slider label="Sizish teshigi (ekvivalent)" value={hole} min={0} max={40} step={1} unit="µm" onChange={setHole} />
            </>
          ) : tab === "shamol" ? (
            <>
              <Slider label="Sizish sarfi Q_siz" value={qLeak} min={0} max={30} step={0.5} unit="L/min" display={fmt(qLeak, 1)} onChange={setQLeak} />
              <Slider label="Shamollatish Q_shamol" value={qVent} min={0} max={3000} step={50} unit="L/min" onChange={setQVent} hint={`${fmt((qVent * 60) / ROOM_L, 1)} marta havo almashinuvi soatiga`} />
            </>
          ) : (
            <>
              <Slider label="Balon hajmi" value={vol} min={40} max={250} step={1} unit="L" onChange={setVol} />
              <Segmented
                label="Bosim"
                value={bar}
                options={[
                  { value: 350, label: "350 bar" },
                  { value: 700, label: "700 bar" },
                ]}
                onChange={setBar}
              />
              <Slider label="Stek quvvati" value={fcKw} min={30} max={180} step={2} unit="kW" onChange={setFcKw} />
              <Slider label="Yurish tezligi" value={kmhCruise} min={30} max={150} step={5} unit="km/soat" onChange={setKmhCruise} />
              <label className="lab-field">
                <span>H₂ narxi, so‘m/kg (misol)</span>
                <input type="number" inputMode="numeric" min={0} max={10_000_000} value={price} onChange={(e) => setPrice(Math.min(10_000_000, Math.max(0, Number(e.target.value) || 0)))} />
              </label>
            </>
          )}
        </LabPanel>
        <div className="lab-screen">
          <Canvas draw={draw} label={tab === "bosim" ? "Bosimning vaqt bo‘yicha pasayishi" : tab === "shamol" ? "Xonadagi vodorod konsentratsiyasi" : "Balon va yurish masofasi"} ratio={16 / 9} />
          {tab === "bosim" ? (
            <>
              <div className="lab-readouts">
                <Readout label="30 daqiqada pasayish" value={fmt(drop * 100, 2)} unit="%" tone={pass ? "ok" : "bad"} big />
                <Readout label="Bosim oxirida" value={fmt(p0 * (1 - drop), 1)} unit="bar" />
                <Readout label="Natija" value={pass ? "O‘TDI" : "O‘TMADI"} tone={pass ? "ok" : "bad"} big />
              </div>
              <LiveFormula>
                p(30 daq) = p₀ · e^(−1800/τ), τ = {Number.isFinite(tau) ? fmt(tau / 3600, 1) : "∞"} soat → Δp = <b>{fmt(drop * 100, 2)}%</b>
              </LiveFormula>
              <p className={`lab-alert ${pass ? "t-ok" : "t-bad"}`}>{pass ? "Germetik: keyingi bosqich — past bosimli vodorod bilan sizish izlash." : "Sizish bor! Ulanishlarni sovun eritmasi yoki ultratovushli detektor bilan tekshirib, tuzating va sinovni takrorlang."}</p>
            </>
          ) : tab === "shamol" ? (
            <>
              <div className="lab-readouts">
                <Readout label="Barqaror C" value={qVent > 0 ? fmt(cSS * 100, 2) : "∞"} unit="%" tone={cSS < 0.004 && qVent > 0 ? "ok" : cSS < 0.01 && qVent > 0 ? "warn" : "bad"} big />
                <Readout label="1% ga yetish vaqti" value={Number.isFinite(t1) ? fmt(t1, 0) : "yetmaydi"} unit={Number.isFinite(t1) ? "daq" : undefined} tone={Number.isFinite(t1) ? "bad" : "ok"} />
              </div>
              <LiveFormula>
                C = Q_siz / (Q_siz + Q_shamol) = {fmt(qLeak, 1)} / ({fmt(qLeak, 1)} + {qVent}) = <b>{qVent > 0 ? `${fmt(cSS * 100, 2)}%` : "cheksiz o‘sadi"}</b>
              </LiveFormula>
              <p className="lab-note">Model xonani to‘liq aralashgan deb oladi. Aslida H₂ shift ostida to‘planadi — mahalliy konsentratsiya yuqoriroq, shuning uchun so‘rish va datchik shiftda bo‘ladi.</p>
            </>
          ) : (
            <>
              <div className="lab-readouts">
                <Readout label="H₂ zaxirasi" value={fmt(m, 2)} unit="kg" tone="i" />
                <Readout label="Sarf" value={fmt(q, 2)} unit="kg/100 km" />
                <Readout label="Yurish masofasi" value={fmt(km, 0)} unit="km" tone="ok" big />
                <Readout label="Maks. tezlik (stek)" value={fmt(vMax, 0)} unit="km/soat" />
                <Readout label="100 km narxi" value={fmt(q * price, 0)} unit="so‘m" tone="p" />
              </div>
              <LiveFormula>
                S = m / q · 100 = {fmt(m, 2)} / {fmt(q, 2)} · 100 = <b>{fmt(km, 0)} km</b>
              </LiveFormula>
              <p className="lab-note">Narx misol uchun — vodorod narxini o‘zingiz kiriting. Tezlik oshsa sarf havo qarshiligi tufayli keskin ortadi.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
