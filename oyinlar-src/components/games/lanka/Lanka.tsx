"use client";
import { useRef, useState } from "react";
import { useGame } from "@/components/games/GameShell";
import { sfx } from "@/lib/games/audio";
import { useKeys, useRafLoop } from "@/lib/games/hooks";
import { useT } from "@/lib/i18n";
import s from "./Lanka.module.css";

// Hamma o'lchamlar "birlik"da: o'yin maydoni balandligi = 100 birlik (ekran o'lchamidan mustaqil).
const GROUND = 90;
const R = 3.3;
const GRAVITY = 260;
const KICK = -78;
const POST_W = 9;
const SPACING = 54;

interface Post {
  x: number;
  gapY: number; // bo'shliq markazi
  gap: number;
  passed: boolean;
}

interface World {
  phase: "ready" | "play" | "dead";
  y: number;
  vy: number;
  t: number;
  speed: number;
  dist: number;
  posts: Post[];
  score: number;
  flash: number;
  dark: boolean;
}

function fresh(): World {
  return { phase: "ready", y: 45, vy: 0, t: 0, speed: 30, dist: 0, posts: [], score: 0, flash: 0, dark: false };
}

export default function Lanka() {
  const t = useT();
  const game = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const world = useRef<World>(fresh());
  const [phase, setPhase] = useState<World["phase"]>("ready");

  const die = () => {
    const W = world.current;
    W.phase = "dead";
    W.flash = 1;
    setPhase("dead");
    sfx.lose();
    game.finish({ score: W.score, detail: t("ln.detail", { n: Math.round(W.dist / 10) }) });
  };

  useRafLoop((dt) => {
    const c = canvasRef.current;
    if (!c) return;
    const W = world.current;
    const viewW = (c.clientWidth / Math.max(1, c.clientHeight)) * 100;
    W.t += dt;
    if (W.phase === "ready") {
      W.y = 45 + Math.sin(W.t * 3) * 3;
    } else if (W.phase === "play") {
      W.vy += GRAVITY * dt;
      W.y += W.vy * dt;
      if (W.y < R) {
        W.y = R;
        W.vy = 0;
      }
      W.speed = Math.min(58, 30 + W.score * 0.9);
      const dx = W.speed * dt;
      W.dist += dx;
      const lx = viewW * 0.28;
      for (const p of W.posts) {
        p.x -= dx;
        if (!p.passed && p.x + POST_W < lx - R) {
          p.passed = true;
          W.score += 1;
          sfx.tak();
        }
        // To'qnashuv: lanka (biroz kechirimli doira) va ustunlar
        const r = R * 0.8;
        if (lx + r > p.x && lx - r < p.x + POST_W) {
          const top = p.gapY - p.gap / 2;
          const bot = p.gapY + p.gap / 2;
          if (W.y - r < top || W.y + r > bot) {
            die();
            break;
          }
        }
      }
      W.posts = W.posts.filter((p) => p.x > -POST_W - 2);
      const lastX = W.posts.length ? W.posts[W.posts.length - 1].x : viewW * 0.6;
      if (lastX < viewW + 4) {
        const gap = Math.max(25, 36 - W.score * 0.35);
        const margin = gap / 2 + 8;
        W.posts.push({
          x: Math.max(lastX + SPACING, viewW + 4),
          gapY: margin + Math.random() * (GROUND - 2 * margin),
          gap,
          passed: false,
        });
      }
      if (W.y + R >= GROUND && W.phase === "play") die();
    }
    if (W.flash > 0) W.flash = Math.max(0, W.flash - dt * 2.5);
    draw(c, W, viewW);
  }, game.active);

  const kick = () => {
    if (!game.active) return;
    const W = world.current;
    if (W.phase === "dead") return;
    if (W.phase === "ready") {
      W.phase = "play";
      setPhase("play");
    }
    W.vy = KICK;
    sfx.jump();
  };

  useKeys(["Space", "ArrowUp", "KeyW", "Enter"], kick, phase !== "dead");

  return (
    <div className={s.wrap}>
      <canvas
        ref={canvasRef}
        className={s.canvas}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || e.button === 0) kick();
        }}
        role="img"
        aria-label={t("ln.canvasLabel")}
      />
      <p className={s.tip} aria-live="polite">
        {phase === "ready" ? t("ln.tapToStart") : phase === "dead" ? t("ln.fell") : t("ln.playing")}
      </p>
      <button type="button" className="btn btn-primary btn-big" onClick={kick} disabled={phase === "dead"}>
        🦶 {t("ln.kick")}
      </button>
      <p className={s.keys}>{t("ln.keys")}</p>
    </div>
  );
}

function draw(c: HTMLCanvasElement, W: World, viewW: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = c.clientWidth;
  const ch = c.clientHeight;
  if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) {
    c.width = Math.round(cw * dpr);
    c.height = Math.round(ch * dpr);
    W.dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  const ctx = c.getContext("2d");
  if (!ctx) return;
  const u = ch / 100;
  ctx.setTransform(dpr * u, 0, 0, dpr * u, 0, 0);

  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, W.dark ? "#121733" : "#7cc9e6");
  sky.addColorStop(1, W.dark ? "#2a3566" : "#fdebc8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewW, 100);

  // Uzoqdagi tepaliklar (parallaks)
  ctx.fillStyle = W.dark ? "#222b55" : "#a9d2c4";
  const off = (W.dist * 0.2) % 60;
  ctx.beginPath();
  ctx.moveTo(0, GROUND);
  for (let x = -off; x < viewW + 60; x += 30) ctx.quadraticCurveTo(x + 15, GROUND - 22, x + 30, GROUND - 6);
  ctx.lineTo(viewW, GROUND);
  ctx.fill();

  // Ustunlar
  for (const p of W.posts) {
    const top = p.gapY - p.gap / 2;
    const bot = p.gapY + p.gap / 2;
    post(ctx, p.x, 0, top, true);
    post(ctx, p.x, bot, GROUND - bot, false);
  }

  // Yer: atlas naqshli yo'lak
  ctx.fillStyle = W.dark ? "#3a2d4d" : "#e9c98f";
  ctx.fillRect(0, GROUND, viewW, 100 - GROUND);
  const stripe = (W.dist % 12);
  const colors = ["#1aa6a6", "#c8323c", "#e0a526", "#1d2a5c"];
  for (let i = -1, x = -stripe; x < viewW; i++, x += 3) {
    ctx.fillStyle = colors[((i % 4) + 4) % 4];
    ctx.fillRect(x, GROUND, 1.6, 2.2);
  }

  // Lanka
  const lx = viewW * 0.28;
  ctx.save();
  ctx.translate(lx, W.y);
  ctx.rotate(Math.max(-0.6, Math.min(0.6, W.vy / 160)));
  const tuft = ["#c8323c", "#e0a526", "#1aa6a6", "#ffffff", "#c8323c"];
  tuft.forEach((col, i) => {
    const a = -Math.PI / 2 + (i - 2) * 0.32;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.quadraticCurveTo(Math.cos(a) * 5, Math.sin(a) * 5 - 2, Math.cos(a) * 8, Math.sin(a) * 9);
    ctx.stroke();
  });
  const g = ctx.createRadialGradient(-1, -1, 0.5, 0, 0, R);
  g.addColorStop(0, "#f2f2f2");
  g.addColorStop(1, "#6b7280");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0.6, R, R * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Hisob
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textAlign = "center";
  ctx.font = `800 ${Math.round(ch * 0.12)}px Unbounded, system-ui, sans-serif`;
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(29,42,92,.85)";
  ctx.fillStyle = "#fff";
  ctx.strokeText(String(W.score), cw / 2, ch * 0.16);
  ctx.fillText(String(W.score), cw / 2, ch * 0.16);
  if (W.flash > 0) {
    ctx.fillStyle = `rgba(200,50,60,${W.flash * 0.35})`;
    ctx.fillRect(0, 0, cw, ch);
  }
}

function post(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, top: boolean) {
  if (h <= 0) return;
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(x, y, POST_W, h);
  // Bo'yalgan halqalar
  const cols = ["#1aa6a6", "#e0a526", "#c8323c"];
  for (let i = 0, yy = top ? y + h - 6 : y + 3; i < 6 && yy > y && yy < y + h; i++, yy += top ? -7 : 7) {
    ctx.fillStyle = cols[i % 3];
    ctx.fillRect(x, yy, POST_W, 2.2);
  }
  ctx.fillStyle = "#5e3a17";
  const capY = top ? y + h - 3 : y;
  ctx.fillRect(x - 1.2, capY, POST_W + 2.4, 3);
}
