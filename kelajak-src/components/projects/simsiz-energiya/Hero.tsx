"use client";
// Hero: zaryadlash padi (Tx) ustida telefon (Rx) — magnit maydon to'lqinlari va to'layotgan batareya.

export default function Hero() {
  return (
    <div className="am-hero">
      <svg viewBox="0 0 420 300" className="am-hero-svg" aria-hidden="true">
        {/* Maydon to'lqinlari */}
        {[0, 1, 2, 3].map((k) => (
          <ellipse key={k} cx="210" cy="214" rx="120" ry="34" className="ws-ring" style={{ animationDelay: `${k * 0.6}s` }} />
        ))}
        {/* Pad */}
        <ellipse cx="210" cy="236" rx="150" ry="38" fill="#1d1842" />
        <ellipse cx="210" cy="228" rx="150" ry="38" fill="#2a2160" stroke="var(--accent)" strokeWidth="2" />
        {[60, 44, 28].map((r) => (
          <ellipse key={r} cx="210" cy="228" rx={r * 1.9} ry={r * 0.48} className="ws-coil" />
        ))}
        {/* Telefon */}
        <g className="ws-float">
          <rect x="150" y="40" width="120" height="170" rx="20" fill="#14102e" stroke="#fff" strokeWidth="3" />
          <rect x="162" y="56" width="96" height="138" rx="10" fill="#0b0920" />
          <rect x="190" y="92" width="40" height="70" rx="6" fill="none" stroke="#fff" strokeWidth="3" />
          <rect x="202" y="84" width="16" height="8" rx="2" fill="#fff" />
          <rect x="195" y="97" width="30" height="60" rx="3" className="ws-charge" />
          <path d="M214 108 l-10 20 h9 l-4 18 l13 -24 h-9 l4 -14Z" fill="#14102e" />
        </g>
      </svg>
    </div>
  );
}
