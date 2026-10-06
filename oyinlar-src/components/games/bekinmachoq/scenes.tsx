// Bekinmachoq sahnalari (SVG, 400x260). `back` — orqa fon, `front` — oldingi to'siqlar
// (bosishni o'tkazib yuboradi). Yashirinuvchilar `spots` nuqtalarida, back va front orasida chiziladi.
import type { L } from "@/lib/i18n/types";

export interface Spot {
  x: number;
  y: number;
  rot?: number;
}

export interface Scene {
  id: string;
  name: L;
  time: number;
  count: number;
  back: React.ReactNode;
  front: React.ReactNode;
  spots: Spot[];
}

const ikat = (id: string, a: string, b: string) => (
  <pattern id={id} width="16" height="12" patternUnits="userSpaceOnUse">
    <rect width="16" height="12" fill={a} />
    <path d="M8 0 14 6 8 12 2 6Z" fill={b} opacity=".85" />
  </pattern>
);

export const SCENES: Scene[] = [
  {
    id: "hovli",
    name: { uz: "Hovli", ru: "Двор", en: "Courtyard" },
    time: 60,
    count: 5,
    back: (
      <>
        <defs>
          <linearGradient id="bk-sky1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9fd9ea" />
            <stop offset="1" stopColor="#fdf0d2" />
          </linearGradient>
          {ikat("bk-gilam", "#c8323c", "#e0a526")}
        </defs>
        <rect width="400" height="260" fill="url(#bk-sky1)" />
        <rect y="168" width="400" height="92" fill="#e6cf9e" />
        <rect x="20" y="62" width="170" height="112" fill="#f3e4c4" stroke="#b08850" strokeWidth="2" />
        <path d="M80 175V112a25 25 0 0 1 50 0v63Z" fill="#6b3f1d" />
        <rect x="32" y="92" width="34" height="34" rx="4" fill="#9fd9ea" stroke="#8a5a2b" strokeWidth="3" />
        <rect x="144" y="92" width="34" height="34" rx="4" fill="#9fd9ea" stroke="#8a5a2b" strokeWidth="3" />
        <rect x="10" y="50" width="190" height="14" fill="#8a5a2b" />
        <rect x="300" y="88" width="13" height="96" fill="#7a4b22" />
        <ellipse cx="120" cy="216" rx="52" ry="14" fill="#4fb3d9" stroke="#2f7fa8" strokeWidth="3" />
        <rect x="200" y="140" width="100" height="12" fill="url(#bk-gilam)" />
      </>
    ),
    front: (
      <>
        <circle cx="306" cy="78" r="46" fill="#3f9b52" />
        <circle cx="280" cy="94" r="26" fill="#4daa5f" />
        <circle cx="332" cy="96" r="24" fill="#4daa5f" />
        <rect x="198" y="152" width="104" height="26" fill="#a26a35" stroke="#6b3f1d" strokeWidth="2" />
        <rect x="204" y="178" width="8" height="18" fill="#6b3f1d" />
        <rect x="288" y="178" width="8" height="18" fill="#6b3f1d" />
        <path d="M330 200c0-38 60-38 60 0Z" fill="#c98a4e" stroke="#8a5428" strokeWidth="3" />
        <ellipse cx="360" cy="168" rx="11" ry="5" fill="#5a3416" />
        <ellipse cx="38" cy="205" rx="34" ry="20" fill="#3f9b52" />
        <circle cx="26" cy="196" r="5" fill="#ff5c8a" />
        <circle cx="48" cy="192" r="5" fill="#ffb020" />
        <ellipse cx="232" cy="232" rx="30" ry="16" fill="#4daa5f" />
        <circle cx="224" cy="226" r="4" fill="#ff5c8a" />
      </>
    ),
    spots: [
      { x: 360, y: 158 },
      { x: 292, y: 64 },
      { x: 250, y: 146 },
      { x: 105, y: 150 },
      { x: 44, y: 188, rot: -10 },
      { x: 152, y: 46 },
      { x: 236, y: 216 },
      { x: 166, y: 210 },
    ],
  },
  {
    id: "bog",
    name: { uz: "Bog'", ru: "Сад", en: "Garden" },
    time: 60,
    count: 6,
    back: (
      <>
        <defs>
          <linearGradient id="bk-sky2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fd3e8" />
            <stop offset="1" stopColor="#eaf7dc" />
          </linearGradient>
        </defs>
        <rect width="400" height="260" fill="url(#bk-sky2)" />
        <rect y="148" width="400" height="112" fill="#9cc56a" />
        {Array.from({ length: 20 }, (_, i) => (
          <rect key={i} x={i * 20 + 2} y="112" width="14" height="44" rx="3" fill="#c49a62" stroke="#8a5a2b" />
        ))}
        <rect y="184" width="400" height="12" fill="#4fb3d9" />
        <rect x="74" y="80" width="12" height="76" fill="#7a4b22" />
        <rect x="326" y="76" width="12" height="80" fill="#7a4b22" />
        <rect x="150" y="96" width="6" height="64" fill="#7a4b22" />
        <rect x="254" y="96" width="6" height="64" fill="#7a4b22" />
      </>
    ),
    front: (
      <>
        <circle cx="80" cy="66" r="50" fill="#3f9b52" />
        <circle cx="64" cy="54" r="6" fill="#ffb020" />
        <circle cx="98" cy="80" r="6" fill="#ffb020" />
        <circle cx="332" cy="58" r="54" fill="#3a8f4b" />
        <circle cx="318" cy="70" r="6" fill="#c8323c" />
        <circle cx="350" cy="44" r="6" fill="#c8323c" />
        <rect x="146" y="90" width="118" height="8" fill="#7a4b22" />
        {[160, 180, 200, 220, 240, 254].map((x, i) => (
          <circle key={x} cx={x} cy={100 + (i % 2) * 6} r="14" fill="#4daa5f" />
        ))}
        {[176, 214, 238].map((x) => (
          <g key={x} fill="#7a3fa0">
            <circle cx={x} cy="118" r="4" />
            <circle cx={x + 5} cy="118" r="4" />
            <circle cx={x + 2.5} cy="124" r="4" />
          </g>
        ))}
        <path d="M262 186c4-40 52-40 56 0Z" fill="#e6c26a" stroke="#b08a3a" strokeWidth="2" />
        <ellipse cx="204" cy="214" rx="36" ry="22" fill="#3f9b52" />
        <ellipse cx="372" cy="222" rx="32" ry="20" fill="#4daa5f" />
        <ellipse cx="36" cy="230" rx="38" ry="20" fill="#3f9b52" />
      </>
    ),
    spots: [
      { x: 70, y: 46 },
      { x: 344, y: 64 },
      { x: 202, y: 98 },
      { x: 206, y: 200 },
      { x: 290, y: 166 },
      { x: 370, y: 206 },
      { x: 40, y: 214, rot: 8 },
      { x: 120, y: 138 },
    ],
  },
  {
    id: "bozor",
    name: { uz: "Bozor", ru: "Базар", en: "Bazaar" },
    time: 75,
    count: 8,
    back: (
      <>
        <defs>
          <linearGradient id="bk-sky3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f7c98b" />
            <stop offset="1" stopColor="#fdeccf" />
          </linearGradient>
          {ikat("bk-ayvon1", "#1aa6a6", "#fbf3e4")}
          {ikat("bk-ayvon2", "#c8323c", "#e0a526")}
          {ikat("bk-ayvon3", "#1d2a5c", "#1aa6a6")}
        </defs>
        <rect width="400" height="260" fill="url(#bk-sky3)" />
        <path d="M150 70a50 44 0 0 1 100 0Z" fill="#1aa6a6" />
        <rect x="140" y="68" width="120" height="50" fill="#e9d2a2" />
        <rect y="164" width="400" height="96" fill="#d9c6a0" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={20 + i * 130} y="82" width="6" height="84" fill="#7a4b22" />
        ))}
        {[0, 1, 2].map((i) => (
          <rect key={i} x={114 + i * 130} y="82" width="6" height="84" fill="#7a4b22" />
        ))}
      </>
    ),
    front: (
      <>
        <rect x="10" y="62" width="116" height="24" rx="4" fill="url(#bk-ayvon1)" />
        <rect x="140" y="62" width="116" height="24" rx="4" fill="url(#bk-ayvon2)" />
        <rect x="270" y="62" width="116" height="24" rx="4" fill="url(#bk-ayvon3)" />
        <rect x="18" y="160" width="104" height="32" fill="#a26a35" stroke="#6b3f1d" strokeWidth="2" />
        <rect x="148" y="160" width="104" height="32" fill="#a26a35" stroke="#6b3f1d" strokeWidth="2" />
        <rect x="278" y="160" width="104" height="32" fill="#a26a35" stroke="#6b3f1d" strokeWidth="2" />
        {[[50, 220], [80, 222], [64, 204], [36, 232], [94, 236]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="18" ry="14" fill="#e3c24f" stroke="#a88a2a" strokeWidth="2" />
        ))}
        <path d="M310 204h50l-6 40h-38Z" fill="#c49a62" stroke="#7a4b22" strokeWidth="2" />
        <path d="M310 214h50M312 226h46" stroke="#7a4b22" strokeWidth="2" />
        <circle cx="200" cy="228" r="16" fill="#3a8f4b" />
        <circle cx="216" cy="232" r="16" fill="#2e7d3f" />
      </>
    ),
    spots: [
      { x: 60, y: 82 },
      { x: 200, y: 80 },
      { x: 330, y: 82 },
      { x: 120, y: 156 },
      { x: 262, y: 156 },
      { x: 76, y: 196 },
      { x: 334, y: 200 },
      { x: 200, y: 36 },
    ],
  },
];

export const HIDERS = ["🧒", "👧", "👦", "🐈", "🐓", "🧸", "⚽", "🐕", "🦆", "🫖", "🍉", "🪁"];
