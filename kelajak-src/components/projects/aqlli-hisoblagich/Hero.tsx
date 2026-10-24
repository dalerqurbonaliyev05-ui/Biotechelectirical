"use client";
// Hero: uy → aqlli hisoblagich (aylanayotgan raqamlar, impuls chirog'i) → bulut/dashboard. Doimiy loop.
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/components/template/hooks";
import Odometer from "./Odometer";

export default function Hero() {
  const reduced = useReducedMotion();
  const [kwh, setKwh] = useState(1284.37);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setKwh((v) => v + 0.01), 700);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div className="am-hero">
      <svg viewBox="0 0 420 300" className="am-hero-svg" aria-hidden="true">
        <defs>
          <linearGradient id="amh-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2a2160" />
            <stop offset="1" stopColor="#14102e" />
          </linearGradient>
        </defs>
        {/* Tarmoq simlari */}
        <path className="am-wire" d="M0 70 H120" />
        <path className="am-flow" d="M0 70 H120" />
        {/* Hisoblagich korpusi */}
        <rect x="120" y="30" width="170" height="210" rx="22" fill="url(#amh-g)" stroke="var(--accent)" strokeWidth="2" />
        <rect x="138" y="52" width="134" height="58" rx="10" fill="#0b0920" stroke="rgba(255,255,255,.12)" />
        {/* Sinusoida ekrani */}
        <rect x="138" y="124" width="134" height="62" rx="10" fill="#0b0920" stroke="rgba(255,255,255,.12)" />
        <path className="am-sine" d="M144 155 q 8 -22 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0" />
        <path className="am-sine i" d="M144 155 q 8 -14 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0" />
        <circle className="am-led" cx="152" cy="212" r="7" />
        <text x="166" y="216" className="am-small">1000 imp/kVt·soat</text>
        {/* Bulut va dashboard */}
        <path className="am-wire thin" d="M290 120 C 330 120 330 70 360 70" />
        {reduced ? null : (
          <rect className="am-packet" x="-8" y="-5" width="16" height="10" rx="3">
            <animateMotion dur="2.4s" repeatCount="indefinite" path="M290 120 C 330 120 330 70 360 70" />
          </rect>
        )}
        <path d="M352 76a18 18 0 0 1 4-35 24 24 0 0 1 45 6 15 15 0 0 1 1 29Z" fill="#fff" opacity=".95" />
        <g className="am-bars">
          <rect x="330" y="230" width="12" height="30" rx="2" />
          <rect x="348" y="215" width="12" height="45" rx="2" />
          <rect x="366" y="200" width="12" height="60" rx="2" />
          <rect x="384" y="222" width="12" height="38" rx="2" />
        </g>
        <path className="am-wire thin" d="M380 78 V 190" />
      </svg>
      <div className="am-hero-odo">
        <Odometer value={kwh} intDigits={5} fracDigits={2} />
      </div>
    </div>
  );
}
