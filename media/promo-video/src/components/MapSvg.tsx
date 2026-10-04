import React from 'react';
import { getLength, getPointAtLength, evolvePath } from '@remotion/paths';

/** Xarita koordinatalari (viewBox 390x520). Ko'chalar: x = 40,130,230,320; y = 60,160,260,360,460. */
export const SHOP = { x: 130, y: 90 };
export const HOME = { x: 320, y: 430 };
export const ROUTE_D = 'M130 90 L130 260 L230 260 L230 360 L320 360 L320 430';
export const ROUTE_LEN = getLength(ROUTE_D);

/** Kuryerlar (nomzodlar): eng yaqini [1] (≈1,2 km). */
export const CANDIDATES = [
  { x: 300, y: 70, km: '1,7 km' },
  { x: 230, y: 160, km: '1,2 km' },
  { x: 60, y: 200, km: '1,3 km' },
  { x: 40, y: 330, km: '2,5 km' },
];
export const NEAREST = 1;

export const routeEvolve = (progress: number) => evolvePath(progress, ROUTE_D);
export const routePoint = (progress: number): { x: number; y: number } => {
  const p = getPointAtLength(ROUTE_D, ROUTE_LEN * progress);
  return { x: p?.x ?? 0, y: p?.y ?? 0 };
};

const ROADS_H = [60, 160, 260, 360, 460];
const ROADS_V = [40, 130, 230, 320];

export const MapBase: React.FC<{ width: number; height: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ width, height, children, style }) => (
  <svg width={width} height={height} viewBox="0 0 390 520" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', ...style }}>
    <rect width="390" height="520" fill="#e8efe4" />
    {/* kvartallar */}
    {ROADS_V.concat([400]).map((x, i) => ROADS_H.concat([520]).map((y, j) => (
      (i + j) % 3 === 0 ? <rect key={`${i}-${j}`} x={(ROADS_V[i - 1] ?? 0) + 10} y={(ROADS_H[j - 1] ?? 0) + 10} width={x - (ROADS_V[i - 1] ?? 0) - 20} height={y - (ROADS_H[j - 1] ?? 0) - 20} rx="10" fill="#dfe8d8" />
        : (i + j) % 3 === 1 ? <rect key={`${i}-${j}`} x={(ROADS_V[i - 1] ?? 0) + 14} y={(ROADS_H[j - 1] ?? 0) + 14} width={x - (ROADS_V[i - 1] ?? 0) - 28} height={y - (ROADS_H[j - 1] ?? 0) - 28} rx="8" fill="#eef2e9" /> : null
    )))}
    <path d="M0 470 C80 440 120 500 210 480 S350 440 390 470 L390 520 L0 520Z" fill="#bfe0f2" opacity="0.8" />
    {ROADS_H.map((y) => <line key={`h${y}`} x1="0" x2="390" y1={y} y2={y} stroke="#fff" strokeWidth="16" />)}
    {ROADS_V.map((x) => <line key={`v${x}`} y1="0" y2="520" x1={x} x2={x} stroke="#fff" strokeWidth="16" />)}
    {ROADS_H.map((y) => <line key={`hd${y}`} x1="0" x2="390" y1={y} y2={y} stroke="#f3d28a" strokeWidth="1.5" strokeDasharray="8 8" />)}
    {children}
  </svg>
);

export const Pin: React.FC<{ x: number; y: number; emoji: string; color: string; scale?: number; label?: string }> = ({ x, y, emoji, color, scale = 1, label }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <ellipse cx="0" cy="2" rx="12" ry="4" fill="rgba(0,0,0,0.18)" />
    <path d="M0 0 C-4 -10 -20 -16 -20 -32 A20 20 0 1 1 20 -32 C20 -16 4 -10 0 0Z" fill={color} stroke="#fff" strokeWidth="3" />
    <text x="0" y="-26" textAnchor="middle" fontSize="20">{emoji}</text>
    {label && (
      <g transform="translate(0 -62)"><rect x="-34" y="-14" width="68" height="24" rx="12" fill="#17171c" /><text x="0" y="3" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" fontFamily="Manrope Variable, sans-serif">{label}</text></g>
    )}
  </g>
);

export const CourierDot: React.FC<{ x: number; y: number; scale?: number; pulse?: number; color?: string; label?: string }> = ({ x, y, scale = 1, pulse = 0, color = '#2f7cf6', label }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {pulse > 0 && <circle r={14 + pulse * 26} fill={color} opacity={0.35 * (1 - pulse)} />}
    <circle r="15" fill="#fff" />
    <circle r="12" fill={color} />
    <text x="0" y="5" textAnchor="middle" fontSize="14">🛵</text>
    {label && (
      <g transform="translate(0 -26)"><rect x="-26" y="-12" width="52" height="22" rx="11" fill="#17171c" /><text x="0" y="3" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="Manrope Variable, sans-serif">{label}</text></g>
    )}
  </g>
);
