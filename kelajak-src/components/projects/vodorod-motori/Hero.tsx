"use client";
// Hero: vodorodli avtomobil — balon → stek → akkumulyator/motor, energiya oqimi va chiqindisi suv tomchilari.

export default function Hero() {
  return (
    <div className="am-hero">
      <svg viewBox="0 0 420 300" className="am-hero-svg" aria-hidden="true">
        {/* Kuzov */}
        <path d="M30 200 C 40 150 90 140 130 120 C 170 96 250 92 300 120 C 340 130 380 150 392 200 Z" fill="#1d1842" stroke="var(--accent)" strokeWidth="3" />
        <path d="M150 124 C 180 104 240 102 280 124 Z" fill="#0b0920" opacity=".7" />
        {/* Balon */}
        <rect x="70" y="160" width="110" height="34" rx="17" fill="#2a2160" stroke="#fff" strokeWidth="2" />
        <text x="125" y="182" textAnchor="middle" className="am-t w xs">H₂ 700 bar</text>
        {/* Stek */}
        <g>
          {Array.from({ length: 8 }, (_, k) => (
            <rect key={k} x={200 + k * 7} y="150" width="5" height="44" rx="1.5" fill="var(--accent)" opacity={0.55 + (k % 2) * 0.35} />
          ))}
        </g>
        {/* Motor */}
        <circle cx="292" cy="150" r="16" fill="#2a2160" stroke="#fff" strokeWidth="2" />
        <path className="hv-rotor" d="M292 138 V162 M280 150 H304" stroke="var(--c-u)" strokeWidth="4" strokeLinecap="round" />
        {/* Oqim */}
        <path className="hv-flow" d="M180 177 H198" />
        <path className="hv-flow e" d="M258 166 L278 156" />
        {/* G'ildiraklar */}
        {[100, 320].map((x) => (
          <g key={x} className="hv-wheel" style={{ transformOrigin: `${x}px 214px` }}>
            <circle cx={x} cy="214" r="28" fill="#14102e" stroke="#fff" strokeWidth="3" />
            <path d={`M${x - 18} 214 H${x + 18} M${x} 196 V232`} stroke="#fff" strokeWidth="3" />
          </g>
        ))}
        {/* Suv tomchilari */}
        {[0, 1, 2].map((k) => (
          <path key={k} className="hv-drop" style={{ animationDelay: `${k * 0.7}s` }} d="M22 206 q 4 7 0 10 q -4 -3 0 -10Z" />
        ))}
        <text x="14" y="252" className="am-t xs mut">H₂O</text>
        <line x1="0" x2="420" y1="244" y2="244" stroke="var(--line)" strokeWidth="3" />
      </svg>
    </div>
  );
}
