"use client";
import { useRef, useState } from "react";
import { useT, type Key } from "@/lib/i18n";
import { arrow, clamp, label, rrect, useCanvasLoop, type Colors } from "./sim";
import { Panels, Readout, Seg, Slider } from "./ui";

const FLUIDS: { id: string; rho: number; key: Key }[] = [
  { id: "oil", rho: 900, key: "x.arx.f.oil" },
  { id: "water", rho: 1000, key: "x.arx.f.water" },
  { id: "sea", rho: 1025, key: "x.arx.f.sea" },
  { id: "mercury", rho: 13600, key: "x.arx.f.mercury" },
];
const PRESETS: { rho: number; key: Key }[] = [
  { rho: 600, key: "x.arx.p.wood" },
  { rho: 917, key: "x.arx.p.ice" },
  { rho: 2700, key: "x.arx.p.alu" },
  { rho: 7800, key: "x.arx.p.steel" },
];

const G = 9.81;
const VOLUME = 0.001; // m³ (1 litr)
const WATER_LINE = 0.3; // suv sathi: idish balandligining ulushi (yuqoridan)
const START = 0.1; // jism pastki qirrasining boshlang'ich o'rni (idish balandligi ulushida)
const VIS_G = 2.4; // ko'rinadigan tezlanish: idish balandligi / s²

interface Sim {
  u: number; // jism pastki qirrasi, idish yuqorisidan, idish balandligi ulushida
  v: number;
  acc: number;
}

export default function Archimedes() {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Sim>({ u: START, v: 0, acc: 0 });
  const acc = useRef(0);
  const [rho, setRho] = useState(600);
  const [fluidId, setFluidId] = useState("water");
  const [frac, setFrac] = useState(0);

  const fluid = FLUIDS.find((f) => f.id === fluidId) ?? FLUIDS[1];
  const weight = rho * VOLUME * G;
  const buoy = fluid.rho * VOLUME * G * frac;
  const status: Key = Math.abs(rho - fluid.rho) < 8 ? "x.arx.hangs" : rho < fluid.rho ? "x.arx.floats" : "x.arx.sinks";

  const drop = () => {
    sim.current.u = START;
    sim.current.v = 0;
  };

  useCanvasLoop(canvasRef, (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, col: Colors) => {
    const s = sim.current;
    const tankL = w * 0.1;
    const tankR = w * 0.9;
    const tankT = h * 0.14;
    const tankB = h * 0.94;
    const tankH = tankB - tankT;
    const tankW = tankR - tankL;
    const side = Math.min(tankH * 0.2, tankW * 0.28);
    const sideF = side / tankH;

    // Fizika (kichik qadamlar bilan): og'irlik, itaruvchi kuch va qarshilik.
    const n = 8;
    const hs = dt / n;
    for (let i = 0; i < n; i++) {
      const depth = clamp(s.u - WATER_LINE, 0, sideF);
      const f = depth / sideF;
      // u pastga qarab o'sadi: og'irlik pastga, itaruvchi kuch yuqoriga
      const a = VIS_G * (1 - (fluid.rho * f) / rho) - (1.5 + 5 * f) * s.v;
      s.acc = a;
      s.v += a * hs;
      s.u += s.v * hs;
      if (s.u > 1) {
        s.u = 1;
        s.v = 0;
      }
    }
    const f = clamp(s.u - WATER_LINE, 0, sideF) / sideF;

    // Fon
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);

    // Suv
    const wlY = tankT + WATER_LINE * tankH;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = col.water;
    ctx.fillRect(tankL, wlY, tankW, tankB - wlY);
    ctx.restore();
    ctx.strokeStyle = col.blue;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tankL, wlY);
    ctx.lineTo(tankR, wlY);
    ctx.stroke();

    // Idish
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(tankL, tankT);
    ctx.lineTo(tankL, tankB);
    ctx.lineTo(tankR, tankB);
    ctx.lineTo(tankR, tankT);
    ctx.stroke();

    // Jism
    const cx = (tankL + tankR) / 2;
    const bottom = tankT + s.u * tankH;
    const top = bottom - side;
    const shade = clamp(rho / 8000, 0, 1);
    ctx.fillStyle = `hsl(32 ${52 - shade * 30}% ${72 - shade * 40}%)`;
    rrect(ctx, cx - side / 2, top, side, side, 6);
    ctx.fill();
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, `${rho}`, cx, top + side / 2, shade > 0.45 ? "#fff" : "#14213b", Math.max(11, side * 0.26), "center");

    // Kuchlar: og'irlik (pastga) va itaruvchi kuch (yuqoriga), uzunligi o'zaro nisbatda
    const wN = rho * VOLUME * G;
    const fN = fluid.rho * VOLUME * G * f;
    const ref = Math.max(wN, fN, 1e-6);
    const maxLen = Math.min(tankH * 0.34, 110);
    const x1 = cx + side * 0.8;
    const x2 = cx - side * 0.8;
    const mid = top + side / 2;
    arrow(ctx, x1, mid, x1, mid + 14 + maxLen * (wN / ref), col.red, 3);
    if (fN > ref * 0.01) arrow(ctx, x2, mid, x2, mid - 14 - maxLen * (fN / ref), col.green, 3);
    label(ctx, "W", x1 + 10, mid + 14 + maxLen * (wN / ref), col.red, 13);
    if (fN > ref * 0.01) label(ctx, "F", x2 - 10, mid - 14 - maxLen * (fN / ref), col.green, 13, "right");

    // O'qish qiymatlarini siyrak yangilash
    acc.current += dt;
    if (acc.current > 0.1) {
      acc.current = 0;
      setFrac(f);
    }
  });

  return (
    <Panels
      canvas={
        <>
          <canvas ref={canvasRef} className="ft-canvas" role="img" aria-label={t("x.arx.aria")} />
        </>
      }
      controls={
        <>
          <h2>{t("exp.controls")}</h2>
          <Slider
            label={t("x.arx.density")}
            value={rho}
            min={100}
            max={8000}
            step={50}
            format={(v) => `${v} ${t("u.kgm3")}`}
            onChange={(v) => {
              setRho(v);
              drop();
            }}
          />
          <div className="ft-ctl">
            <span className="ft-ctl-label">{t("x.arx.presets")}</span>
            <div className="ft-seg">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={rho === p.rho}
                  onClick={() => {
                    setRho(p.rho);
                    drop();
                  }}
                >
                  {t(p.key)}
                </button>
              ))}
            </div>
          </div>
          <Seg
            label={t("x.arx.fluid")}
            value={fluidId}
            options={FLUIDS.map((f) => ({ value: f.id, label: t(f.key) }))}
            onChange={(v) => {
              setFluidId(v);
              drop();
            }}
          />
          <div className="ft-actions">
            <button type="button" className="ft-btn small primary" onClick={drop}>
              {t("x.arx.drop")}
            </button>
          </div>
          <h2>{t("exp.readouts")}</h2>
          <div className="ft-readouts" aria-live="off">
            <Readout label={`ρ ${t("x.arx.fluid").toLowerCase()}`} value={`${fluid.rho} ${t("u.kgm3")}`} />
            <Readout label={t("x.arx.sub")} value={`${Math.round(frac * 100)} %`} />
            <Readout label={t("x.arx.weight")} value={`${weight.toFixed(1)} ${t("u.N")}`} />
            <Readout label={t("x.arx.buoy")} value={`${buoy.toFixed(1)} ${t("u.N")}`} />
            <Readout label="" value={t(status)} accent wide />
          </div>
        </>
      }
    />
  );
}
