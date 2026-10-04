import React from 'react';
import { random, useCurrentFrame } from 'remotion';

/** Yuqoridan ko'rinishdagi tarelka (mastava): sekin aylanadi. */
export const Plate: React.FC<{ size?: number; spin?: number; style?: React.CSSProperties }> = ({ size = 600, spin = 1.6, style }) => {
  const frame = useCurrentFrame();
  const items = Array.from({ length: 22 }).map((_, i) => {
    const a = random(`pa${i}`) * Math.PI * 2;
    const r = Math.sqrt(random(`pr${i}`)) * 150;
    const col = ['#ff7a1a', '#ffd23f', '#6ccf5d', '#ffffff', '#c0392b'][i % 5];
    return { x: 250 + Math.cos(a) * r, y: 250 + Math.sin(a) * r, s: 8 + random(`ps${i}`) * 13, col };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 500 500" style={style}>
      <defs>
        <radialGradient id="soup" cx="50%" cy="45%" r="60%"><stop offset="0" stopColor="#ffb347" /><stop offset="1" stopColor="#f26a10" /></radialGradient>
        <radialGradient id="plate" cx="50%" cy="40%" r="70%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e9e5df" /></radialGradient>
      </defs>
      <circle cx="260" cy="268" r="236" fill="rgba(23,23,28,0.18)" />
      <circle cx="250" cy="250" r="236" fill="url(#plate)" />
      <circle cx="250" cy="250" r="200" fill="none" stroke="#dcd6cd" strokeWidth="4" />
      <g transform={`rotate(${frame * spin} 250 250)`}>
        <circle cx="250" cy="250" r="168" fill="url(#soup)" />
        {items.map((it, i) => <circle key={i} cx={it.x} cy={it.y} r={it.s} fill={it.col} opacity="0.92" />)}
        <path d="M120 250c40-30 80 30 130 0s90 20 130 0" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="6" strokeLinecap="round" />
      </g>
      <ellipse cx="190" cy="170" rx="70" ry="30" fill="rgba(255,255,255,0.22)" transform="rotate(-30 190 170)" />
    </svg>
  );
};

/** Yon tomondan idish va ko'tarilayotgan bug'. */
export const Bowl: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 640, style }) => {
  const frame = useCurrentFrame();
  const puffs = Array.from({ length: 3 }).map((_, i) => {
    const t = ((frame + i * 24) % 72) / 72;
    const x = 200 + i * 100 + Math.sin((t + i) * Math.PI * 2) * 16;
    return { x, y: 230 - t * 200, o: Math.sin(t * Math.PI) * 0.85, k: 0.6 + t * 0.9 };
  });
  const wob = Math.sin(frame / 7) * 1.4;
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 600 480" style={style}>
      <defs>
        <linearGradient id="bowlg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#ece6de" /></linearGradient>
        <linearGradient id="soupg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffb347" /><stop offset="1" stopColor="#f26a10" /></linearGradient>
      </defs>
      {puffs.map((p, i) => (
        <g key={i} opacity={p.o} transform={`translate(${p.x} ${p.y}) scale(${p.k})`}>
          <path d="M0 0c-26-34 26-52 0-86s26-52 0-70" fill="none" stroke="#fff" strokeWidth="22" strokeLinecap="round" />
        </g>
      ))}
      <g transform={`rotate(${wob} 300 330)`}>
        <ellipse cx="300" cy="420" rx="230" ry="26" fill="rgba(23,23,28,0.22)" />
        <path d="M60 270h480c0 110-90 170-240 170S60 380 60 270z" fill="url(#bowlg)" />
        <ellipse cx="300" cy="270" rx="240" ry="48" fill="#f5efe7" />
        <ellipse cx="300" cy="274" rx="214" ry="38" fill="url(#soupg)" />
        <circle cx="230" cy="268" r="11" fill="#ffd23f" /><circle cx="300" cy="280" r="9" fill="#6ccf5d" /><circle cx="360" cy="266" r="12" fill="#fff" />
        <circle cx="270" cy="284" r="8" fill="#c0392b" /><circle cx="330" cy="262" r="8" fill="#6ccf5d" /><circle cx="205" cy="282" r="8" fill="#fff" />
        <path d="M110 330c60 40 330 40 380 0" fill="none" stroke="#ffb8a0" strokeWidth="10" strokeLinecap="round" opacity="0.8" />
      </g>
    </svg>
  );
};

/** Ilova belgisi (apps/…/icon): to'q sariq kvadrat ichida bug'li kosa. */
export const AppIcon: React.FC<{ size?: number; emoji?: string; bg?: string; radius?: number }> = ({ size = 220, emoji, bg = 'linear-gradient(135deg,#ff8a3d,#ff5a00)', radius }) => (
  <div style={{ width: size, height: size, borderRadius: radius ?? size * 0.24, background: bg, display: 'grid', placeItems: 'center', boxShadow: `0 ${size * 0.1}px ${size * 0.22}px rgba(23,23,28,0.28)` }}>
    {emoji ? <span style={{ fontSize: size * 0.52, lineHeight: 1 }}>{emoji}</span> : (
      <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 120 120">
        <path d="M28 62h64c0 18-14 30-32 30S28 80 28 62z" fill="#fff" />
        <path d="M42 50c-4-6 4-10 0-17M60 50c-4-6 4-10 0-17M78 50c-4-6 4-10 0-17" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".85" />
        <rect x="34" y="94" width="52" height="6" rx="3" fill="#fff" opacity=".9" />
      </svg>
    )}
  </div>
);

/** Qoniqish ifodasi: ko'zlari yurak bo'lgan kulgichi (SVG: har qanday kompyuterda bir xil ko'rinadi, emoji shriftiga bog'liq emas). */
export const LoveFace: React.FC<{ size?: number }> = ({ size = 330 }) => {
  const heart = 'M0 12 C-26 -6 -20 -26 -8 -26 C-2 -26 0 -20 0 -18 C0 -20 2 -26 8 -26 C20 -26 26 -6 0 12Z';
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <defs><radialGradient id="face" cx="40%" cy="35%" r="75%"><stop offset="0" stopColor="#ffe56a" /><stop offset="1" stopColor="#ffb41f" /></radialGradient></defs>
      <circle cx="100" cy="100" r="92" fill="url(#face)" stroke="#17171c" strokeWidth="6" />
      <g transform="translate(66 84)"><path d={heart} fill="#ff2d55" stroke="#17171c" strokeWidth="3.5" strokeLinejoin="round" /></g>
      <g transform="translate(134 84)"><path d={heart} fill="#ff2d55" stroke="#17171c" strokeWidth="3.5" strokeLinejoin="round" /></g>
      <path d="M56 122 Q100 176 144 122 Q100 132 56 122Z" fill="#fff" stroke="#17171c" strokeWidth="6" strokeLinejoin="round" />
      <ellipse cx="44" cy="124" rx="13" ry="8" fill="#ff7a8a" opacity="0.65" /><ellipse cx="156" cy="124" rx="13" ry="8" fill="#ff7a8a" opacity="0.65" />
    </svg>
  );
};
