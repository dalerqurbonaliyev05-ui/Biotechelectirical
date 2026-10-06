"use client";
import { useRef, useState } from "react";
import { useGame } from "@/components/games/GameShell";
import { sfx } from "@/lib/games/audio";
import { useKeys, useRafLoop } from "@/lib/games/hooks";
import { useT } from "@/lib/i18n";
import s from "./Chillak.module.css";

const ATTEMPTS = 5;
const G = 9.81;
const VIEW_M = 90; // ekranga sig'adigan masofa (m)
const MIN_A = 12;
const MAX_A = 78;

type Phase = "intro" | "aim" | "power" | "flying" | "landed" | "over";

interface Sim {
  phase: Phase;
  osc: number; // tebranuvchi o'lchagich vaqti
  angle: number; // gradus
  power: number; // 0..1
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  wind: number; // m/s, + o'ngga
  trail: { x: number; y: number }[];
  marks: number[];
  dark: boolean;
}

function windNow(): number {
  return Math.round((Math.random() * 6 - 3) * 10) / 10;
}

export default function Chillak() {
  const t = useT();
  const game = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Sim>({
    phase: "intro",
    osc: 0,
    angle: 45,
    power: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    spin: 0,
    wind: 0,
    trail: [],
    marks: [],
    dark: false,
  });
  const [phase, setPhase] = useState<Phase>("intro");
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [wind, setWind] = useState(0);
  const [last, setLast] = useState<number | null>(null);

  const go = (p: Phase) => {
    sim.current.phase = p;
    setPhase(p);
  };

  const land = () => {
    const S = sim.current;
    const d = Math.max(0, Math.round(S.x * 10) / 10);
    S.marks.push(d);
    const list = [...results, d];
    setResults(list);
    setLast(d);
    sfx.tak();
    if (list.length >= ATTEMPTS) {
      go("over");
      const best = Math.max(...list);
      if (best >= 30) sfx.win();
      game.finish({
        score: best,
        detail: list.map((x) => x.toFixed(1)).join(" · ") + " " + t("unit.m"),
      });
    } else go("landed");
  };

  useRafLoop((dt) => {
    const S = sim.current;
    const c = canvasRef.current;
    if (!c) return;
    if (S.phase === "aim") {
      S.osc += dt;
      S.angle = MIN_A + ((1 - Math.cos(S.osc * 2.2)) / 2) * (MAX_A - MIN_A);
    } else if (S.phase === "power") {
      S.osc += dt;
      S.power = (1 - Math.cos(S.osc * 4.2)) / 2;
    } else if (S.phase === "flying") {
      // Kichik qadamlar bilan integratsiya — barqaror parabola
      const steps = 3;
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        S.vx += S.wind * 0.35 * h;
        S.vy -= G * h;
        S.x += S.vx * h;
        S.y += S.vy * h;
      }
      S.spin += dt * 14;
      const lastP = S.trail[S.trail.length - 1];
      if (!lastP || Math.hypot(S.x - lastP.x, S.y - lastP.y) > 0.6) S.trail.push({ x: S.x, y: S.y });
      if (S.y <= 0) {
        S.y = 0;
        land();
      }
    }
    draw(c, S);
  }, game.active && phase !== "over");

  const act = () => {
    if (!game.active) return;
    const S = sim.current;
    if (S.phase === "intro" || S.phase === "landed") {
      const w = windNow();
      S.wind = w;
      setWind(w);
      S.osc = 0;
      S.trail = [];
      S.x = 0;
      S.y = 0;
      setLast(null);
      if (S.phase === "landed") setAttempt((a) => a + 1);
      go("aim");
      sfx.click();
    } else if (S.phase === "aim") {
      S.osc = 0;
      go("power");
      sfx.tick();
    } else if (S.phase === "power") {
      const v0 = 6 + S.power * 17;
      const a = (S.angle * Math.PI) / 180;
      S.vx = v0 * Math.cos(a);
      S.vy = v0 * Math.sin(a);
      S.x = 0.4;
      S.y = 0.6;
      S.trail = [{ x: S.x, y: S.y }];
      go("flying");
      sfx.tak();
      sfx.whoosh();
    }
  };

  useKeys(["Space", "Enter"], act, phase !== "over");

  const best = results.length ? Math.max(...results) : 0;
  const label =
    phase === "intro"
      ? t("g.start")
      : phase === "aim"
        ? t("ch.setAngle")
        : phase === "power"
          ? t("ch.hit")
          : phase === "landed"
            ? t("ch.next")
            : "…";

  return (
    <div className={s.wrap}>
      <div className={s.hud}>
        <span className="chip">
          {t("ch.attempt")}: <b>{Math.min(attempt + 1, ATTEMPTS)}/{ATTEMPTS}</b>
        </span>
        <span className="chip">
          {t("ch.wind")}: <b>{wind === 0 ? "0" : `${wind > 0 ? "→" : "←"} ${Math.abs(wind).toFixed(1)}`} m/s</b>
        </span>
        <span className="chip">
          🏆 <b>{best.toFixed(1)} m</b>
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className={s.canvas}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || e.button === 0) act();
        }}
        role="img"
        aria-label={t("ch.canvasLabel")}
      />
      <p className={s.status} aria-live="polite">
        {last !== null ? t("ch.landed", { n: last.toFixed(1), steps: Math.round(last / 0.75) }) : t(`ch.tip.${phase}`)}
      </p>
      <button
        type="button"
        className="btn btn-primary btn-big"
        onClick={act}
        disabled={phase === "flying" || phase === "over"}
      >
        {label}
      </button>
      {results.length > 0 && (
        <ol className={s.results}>
          {results.map((r, i) => (
            <li key={i} className={r === best ? s.top : undefined}>
              {i + 1}. {r.toFixed(1)} m
            </li>
          ))}
        </ol>
      )}
      <p className={s.keys}>{t("g.keysSpace")}</p>
    </div>
  );
}

function draw(c: HTMLCanvasElement, S: Sim) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = c.clientWidth;
  const ch = c.clientHeight;
  if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) {
    c.width = Math.round(cw * dpr);
    c.height = Math.round(ch * dpr);
    S.dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  const ctx = c.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = cw;
  const h = ch;
  const groundY = h - 34;
  const x0 = 26;
  const ppm = (w - x0 - 14) / VIEW_M;
  const X = (m: number) => x0 + m * ppm;
  const Y = (m: number) => groundY - m * ppm;

  // Osmon
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  if (S.dark) {
    sky.addColorStop(0, "#141a3a");
    sky.addColorStop(1, "#2b3a6b");
  } else {
    sky.addColorStop(0, "#8fd3e8");
    sky.addColorStop(1, "#fbe9c6");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Tog'lar
  ctx.fillStyle = S.dark ? "#26305a" : "#b9d3c8";
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (let i = 0; i <= 8; i++) ctx.lineTo((w / 8) * i, groundY - 40 - ((i * 37) % 50));
  ctx.lineTo(w, groundY);
  ctx.fill();

  // Yer
  ctx.fillStyle = S.dark ? "#3b4a2f" : "#9cc56a";
  ctx.fillRect(0, groundY, w, h - groundY);
  ctx.fillStyle = S.dark ? "#2e3a24" : "#7aa94d";
  ctx.fillRect(0, groundY, w, 4);

  // Masofa belgilari
  ctx.font = "600 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (let m = 10; m <= VIEW_M; m += 10) {
    ctx.fillStyle = m % 50 === 0 ? "#c8323c" : S.dark ? "#cfd6f5" : "#1d2a5c";
    ctx.fillRect(X(m) - 1, groundY, 2, m % 50 === 0 ? 12 : 7);
    ctx.fillText(`${m}`, X(m), groundY + 24);
  }

  // Avvalgi urinishlar bayroqchalari
  S.marks.forEach((m, i) => {
    const px = X(Math.min(m, VIEW_M));
    ctx.strokeStyle = "#1d2a5c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, groundY);
    ctx.lineTo(px, groundY - 18);
    ctx.stroke();
    ctx.fillStyle = i === S.marks.length - 1 ? "#c8323c" : "#e0a526";
    ctx.beginPath();
    ctx.moveTo(px, groundY - 18);
    ctx.lineTo(px + 10, groundY - 14);
    ctx.lineTo(px, groundY - 10);
    ctx.fill();
  });

  // O'yinchi (sxematik)
  const px = x0 - 8;
  ctx.strokeStyle = S.dark ? "#f4ecdc" : "#1b1440";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(px, groundY - 44, 6, 0, Math.PI * 2);
  ctx.moveTo(px, groundY - 38);
  ctx.lineTo(px, groundY - 18);
  ctx.lineTo(px - 6, groundY);
  ctx.moveTo(px, groundY - 18);
  ctx.lineTo(px + 6, groundY);
  ctx.stroke();
  // Do'ppi
  ctx.fillStyle = "#1d2a5c";
  ctx.fillRect(px - 6, groundY - 54, 12, 5);
  // Tayoq
  const batA = S.phase === "aim" || S.phase === "power" ? (-S.angle * Math.PI) / 180 : -0.3;
  ctx.strokeStyle = "#8a5a12";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(px, groundY - 30);
  ctx.lineTo(px + Math.cos(batA) * 28, groundY - 30 + Math.sin(batA) * 28);
  ctx.stroke();

  // Iz (parabola)
  if (S.trail.length > 1) {
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 3;
    const grad = ctx.createLinearGradient(X(0), 0, X(S.x || 1), 0);
    grad.addColorStop(0, "rgba(26,166,166,.9)");
    grad.addColorStop(1, "rgba(200,50,60,.95)");
    ctx.strokeStyle = grad;
    ctx.beginPath();
    S.trail.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
    ctx.lineTo(X(S.x), Y(S.y));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Chillak
  const cxm = S.phase === "aim" || S.phase === "power" || S.phase === "intro" ? 0.4 : S.x;
  const cym = S.phase === "aim" || S.phase === "power" || S.phase === "intro" ? 0.15 : S.y;
  const cx = Math.min(X(cxm), w - 8);
  const cy = Y(cym);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(S.phase === "flying" ? S.spin : 0);
  ctx.fillStyle = "#b5651d";
  ctx.strokeStyle = "#6b3a0e";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-9, -3, 18, 6, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  if (S.x > VIEW_M && S.phase === "flying") {
    ctx.fillStyle = "#c8323c";
    ctx.font = "800 13px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${S.x.toFixed(0)} m →`, w - 10, Math.max(16, cy - 10));
  }

  // Burchak ko'rsatkichi
  if (S.phase === "aim" || S.phase === "power") {
    const a = (S.angle * Math.PI) / 180;
    const len = 46 + (S.phase === "power" ? S.power * 50 : 0);
    ctx.strokeStyle = S.phase === "aim" ? "#e0a526" : "#c8323c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(X(0.4), Y(0.15));
    ctx.lineTo(X(0.4) + Math.cos(a) * len, Y(0.15) - Math.sin(a) * len);
    ctx.stroke();
    ctx.fillStyle = S.dark ? "#f4ecdc" : "#1b1440";
    ctx.font = "800 12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.round(S.angle)}°`, X(0.4) + Math.cos(a) * (len + 8), Y(0.15) - Math.sin(a) * (len + 8));
  }

  // Kuch o'lchagichi
  const bw = Math.min(220, w * 0.5);
  ctx.fillStyle = "rgba(29,42,92,.25)";
  ctx.beginPath();
  ctx.roundRect(12, 12, bw, 16, 8);
  ctx.fill();
  const pg = ctx.createLinearGradient(12, 0, 12 + bw, 0);
  pg.addColorStop(0, "#2e9d5b");
  pg.addColorStop(0.65, "#e0a526");
  pg.addColorStop(1, "#c8323c");
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.roundRect(12, 12, Math.max(8, bw * S.power), 16, 8);
  ctx.fill();
}
