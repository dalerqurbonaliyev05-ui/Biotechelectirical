import React from 'react';
import { fmt } from './format.js';
import { catById } from './categories.js';

export function Header({ title, onBack, right }) {
  return (
    <div className="hdr">
      <button className="icon-btn" onClick={onBack} style={{ visibility: onBack ? 'visible' : 'hidden' }} aria-label="Orqaga">
        ←
      </button>
      <h1>{title}</h1>
      <div className="hdr-r">{right}</div>
    </div>
  );
}

export function CatIcon({ id, size = 40 }) {
  const c = catById(id);
  return (
    <span className="cat-icon" style={{ width: size, height: size, background: c.color + '22', color: c.color, fontSize: size * 0.5 }}>
      {c.icon}
    </span>
  );
}

export function AmountInput({ digits, setDigits, placeholder = '0', autoFocus }) {
  return (
    <input
      className="input amount"
      inputMode="numeric"
      autoFocus={autoFocus}
      placeholder={placeholder}
      value={digits ? fmt(Number(digits)) : ''}
      onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 12))}
    />
  );
}

export function Toggle({ on, onChange }) {
  return (
    <button className={'toggle' + (on ? ' on' : '')} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span />
    </button>
  );
}

export function Progress({ pct, color = 'var(--green)' }) {
  return (
    <div className="progress">
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

export function Donut({ items, total, label = "Jami xarajat" }) {
  const R = 78;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg viewBox="0 0 200 200" className="donut" role="img" aria-label="Xarajatlar diagrammasi">
      <g transform="rotate(-90 100 100)">
        <circle cx="100" cy="100" r={R} fill="none" stroke="#eef2f7" strokeWidth="34" />
        {items.map((it) => {
          const len = (it.amount / total) * C;
          const el = (
            <circle
              key={it.cat}
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={catById(it.cat).color}
              strokeWidth="34"
              strokeDasharray={`${Math.max(0, len - 1.5)} ${C - Math.max(0, len - 1.5)}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </g>
      <text x="100" y="92" textAnchor="middle" className="donut-l">{label}</text>
      <text x="100" y="116" textAnchor="middle" className="donut-v">{fmt(total)}</text>
      <text x="100" y="134" textAnchor="middle" className="donut-l">so'm</text>
    </svg>
  );
}

export function Bars({ data }) {
  const W = 320;
  const H = 110;
  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const slot = W / data.length;
  const bw = Math.max(2, Math.min(8, slot / 2.6));
  const every = data.length > 16 ? 5 : data.length > 8 ? 2 : 1;
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="bars" role="img" aria-label="Daromad va xarajatlar">
      <line x1="0" x2={W} y1={H} y2={H} stroke="#e2e8f0" />
      {data.map((d, i) => {
        const x = i * slot + slot / 2;
        const hi = (d.income / max) * (H - 6);
        const he = (d.expense / max) * (H - 6);
        return (
          <g key={d.date}>
            <rect x={x - bw - 0.5} y={H - hi} width={bw} height={hi} rx="1.5" fill="#16A34A" />
            <rect x={x + 0.5} y={H - he} width={bw} height={he} rx="1.5" fill="#EF4444" />
            {(i % every === 0 || i === data.length - 1) && (
              <text x={x} y={H + 13} textAnchor="middle" className="axis">{d.day}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function BottomNav({ tab, setTab }) {
  const items = [
    ['home', '🏠', 'Bosh sahifa'],
    ['stats', '📊', 'Statistika'],
    ['goals', '🎯', 'Maqsadlar'],
    ['profile', '👤', 'Profil'],
  ];
  return (
    <nav className="nav">
      {items.map(([id, icon, label]) => (
        <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
          <span className="nav-i">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
