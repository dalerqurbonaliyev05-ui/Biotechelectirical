import React, { useEffect, useMemo, useRef, useState } from 'react';

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function Slider({ label, value, min, max, step = 1, onChange, unit, disabled }) {
  return (
    <label className="slider">
      <span className="lbl">{label}</span><span className="v">{value} {unit}</span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e => onChange(+e.target.value)} />
    </label>
  );
}

/* ================= Richag muvozanati (6-sinf) ================= */
export function LeverLab({ onFinish }) {
  const mk = () => ({ m: pick([2, 3, 4, 6]), d: pick([2, 3, 4, 6]) });
  const [round, setRound] = useState(0);
  const [left, setLeft] = useState(mk);
  const [items, setItems] = useState([]); // {m, d}
  const [mass, setMass] = useState(1);
  const [score, setScore] = useState(0);
  const Ml = left.m * left.d, Mr = items.reduce((a, i) => a + i.m * i.d, 0);
  const diff = Mr - Ml;
  const ang = Math.max(-14, Math.min(14, diff * 1.4));
  const balanced = diff === 0 && items.length > 0;
  const unit = 28, cx = 200, cy = 120;
  function place(d) { if (balanced) return; setItems(it => [...it.filter(i => i.d !== d), { m: mass, d }]); }
  function next() {
    const s = score + Math.max(4, 14 - (items.length - 1) * 3);
    setScore(s);
    if (round + 1 >= 4) return onFinish(s);
    setRound(round + 1); setLeft(mk()); setItems([]);
  }
  return (
    <div className="stack">
      <p className="muted">Chap tomonda <b>{left.m} kg</b> yuk tayanchdan <b>{left.d}</b> bo‘linma uzoqlikda. O‘ng yelkaga yuklarni qo‘yib, richagni muvozanatga keltiring. ({round + 1}/4)</p>
      <div className="lab">
        <svg className="scene" viewBox="0 0 400 220" aria-label="Richag">
          <polygon points={`${cx - 16},${cy + 70} ${cx + 16},${cy + 70} ${cx},${cy + 6}`} fill="var(--red)" />
          <g transform={`rotate(${ang} ${cx} ${cy})`}>
            <rect x={cx - 6.5 * unit} y={cy - 4} width={13 * unit} height="8" rx="3" fill="var(--pen)" />
            {[-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(d => (
              <g key={d}>
                <line x1={cx + d * unit} y1={cy - 6} x2={cx + d * unit} y2={cy + 6} stroke="var(--on-pen)" strokeWidth="1.5" />
                {d > 0 && <rect x={cx + d * unit - 12} y={cy - 46} width="24" height="44" fill="transparent" onClick={() => place(d)} style={{ cursor: 'pointer' }} role="button" aria-label={`${d}-bo‘linmaga qo‘yish`} />}
                {d > 0 && <text x={cx + d * unit} y={cy + 22} textAnchor="middle" fontSize="11" fill="var(--muted)">{d}</text>}
              </g>
            ))}
            <g transform={`translate(${cx - left.d * unit},${cy - 4})`}>
              <rect x="-13" y={-10 - left.m * 5} width="26" height={10 + left.m * 5} rx="4" fill="var(--ink)" />
              <text y={-14 - left.m * 5} textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--ink)">{left.m} kg</text>
            </g>
            {items.map(i => (
              <g key={i.d} transform={`translate(${cx + i.d * unit},${cy - 4})`} onClick={() => !balanced && setItems(it => it.filter(x => x.d !== i.d))} style={{ cursor: 'pointer' }}>
                <rect x="-12" y={-10 - i.m * 5} width="24" height={10 + i.m * 5} rx="4" fill="var(--green)" />
                <text y={-14 - i.m * 5} textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--ink)">{i.m} kg</text>
              </g>
            ))}
          </g>
          <text x="200" y="212" textAnchor="middle" fontSize="13" fill="var(--muted)" fontFamily="var(--f-math)">M₁ = {Ml} · M₂ = {Mr} (kg·bo‘linma)</text>
        </svg>
        <div className="controls">
          <div className="palette">{[1, 2, 3, 4].map(m => <button key={m} aria-pressed={mass === m} onClick={() => setMass(m)}>{m} kg</button>)}</div>
          <p className="small muted">Yuk massasini tanlab, o‘ng yelkadagi bo‘linma ustini bosing. Yukni olib tashlash uchun uni bosing.</p>
        </div>
      </div>
      {balanced ? <div className="notice" style={{ background: 'var(--green-soft)' }}><b>Muvozanat!</b> F₁·l₁ = F₂·l₂ bajarildi. <button className="btn small" style={{ marginLeft: 8 }} onClick={next}>Davom etish</button></div>
        : <p className="small">{diff > 0 ? 'O‘ng tomon og‘ir — momentni kamaytiring.' : items.length ? 'Chap tomon og‘ir — o‘ngga yuk qo‘shing yoki uzoqroqqa siljiting.' : ''}</p>}
    </div>
  );
}

/* ================= Nishonga otish (7/10-sinf) ================= */
export function ProjectileLab({ onFinish }) {
  const g = 9.8;
  const [target, setTarget] = useState(() => rnd(25, 90));
  const [ang, setAng] = useState(45);
  const [v, setV] = useState(20);
  const [shot, setShot] = useState(null);
  const [t, setT] = useState(0);
  const [hits, setHits] = useState(0);
  const [tries, setTries] = useState(0);
  const raf = useRef();
  const W = 110; // metr ko'rinish
  const sx = x => 20 + x * (360 / W), sy = y => 200 - y * (360 / W);
  useEffect(() => {
    if (!shot) return;
    const T = (2 * shot.v * Math.sin(shot.a)) / g;
    const st = performance.now();
    const step = now => { const tt = Math.min(T, ((now - st) / 1000) * 1.6); setT(tt); if (tt < T) raf.current = requestAnimationFrame(step); };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [shot]);
  const L = (v * v * Math.sin((2 * ang * Math.PI) / 180)) / g;
  const pts = shot ? Array.from({ length: 40 }, (_, i) => { const tt = (t * i) / 39; return [sx(shot.v * Math.cos(shot.a) * tt), sy(shot.v * Math.sin(shot.a) * tt - (g * tt * tt) / 2)]; }) : [];
  const landed = shot && t >= (2 * shot.v * Math.sin(shot.a)) / g - 1e-6;
  const hit = landed && Math.abs(shot.L - target) <= 3;
  function fire() { setShot({ v, a: (ang * Math.PI) / 180, L }); setT(0); setTries(x => x + 1); }
  function next() {
    const nh = hits + (hit ? 1 : 0); setHits(nh);
    if (nh >= 3 || tries >= 8) return onFinish(Math.max(5, nh * 15 + Math.max(0, 15 - tries * 2)));
    if (hit) setTarget(rnd(25, 90));
    setShot(null);
  }
  return (
    <div className="stack">
      <p className="muted">Nishon <b>{target} m</b> uzoqlikda. Burchak va tezlikni tanlab, 3 marta nishonga tegizing. Havoning qarshiligi hisobga olinmaydi, g = 9,8 m/s².</p>
      <div className="lab">
        <svg className="scene" viewBox="0 0 400 220" aria-label="Otilgan jism traektoriyasi">
          <line x1="0" y1="200" x2="400" y2="200" stroke="var(--ink)" strokeWidth="2" />
          {[20, 40, 60, 80, 100].map(m => <g key={m}><line x1={sx(m)} y1="200" x2={sx(m)} y2="206" stroke="var(--muted)" /><text x={sx(m)} y="217" fontSize="10" textAnchor="middle" fill="var(--muted)">{m} m</text></g>)}
          <rect x={sx(target) - 3 * 360 / W} y="192" width={6 * 360 / W} height="8" fill="var(--red)" />
          <text x={sx(target)} y="186" textAnchor="middle" fontSize="16">🎯</text>
          <g transform={`rotate(${-ang} 20 200)`}><rect x="14" y="194" width="30" height="12" rx="3" fill="var(--pen)" /></g>
          {pts.length > 1 && <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke="var(--pen)" strokeWidth="2" strokeDasharray="4 4" />}
          {pts.length > 1 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="6" fill="var(--ink)" />}
        </svg>
        <div className="controls">
          <Slider label="Otish burchagi α" value={ang} min={5} max={85} onChange={setAng} unit="°" disabled={shot && !landed} />
          <Slider label="Boshlang‘ich tezlik v₀" value={v} min={5} max={35} onChange={setV} unit="m/s" disabled={shot && !landed} />
          <p className="small math">L = v₀²·sin 2α / g ≈ {shot ? '?' : '…'} <span className="muted">(hisoblab ko‘ring!)</span></p>
          {!shot || !landed ? <button className="btn" onClick={fire} disabled={shot && !landed}>Otish</button> : (
            <div className="row"><span className={'tag ' + (hit ? 'green' : 'red')} style={{ fontSize: 15, padding: 8 }}>{hit ? 'Nishonga tegdi!' : `Tushdi: ${shot.L.toFixed(1)} m`}</span><button className="btn small grow" onClick={next}>{hit ? 'Keyingi nishon' : 'Qayta urinish'}</button></div>
          )}
          <p className="small muted">Tegishlar: {hits}/3 · Urinishlar: {tries}</p>
        </div>
      </div>
    </div>
  );
}

/* ================= Linza tasviri (9-sinf) ================= */
const LENS_OPTS = [
  ['real-small', 'Haqiqiy, teskari, kichraygan'], ['real-same', 'Haqiqiy, teskari, teng'], ['real-big', 'Haqiqiy, teskari, kattalashgan'],
  ['none', 'Tasvir hosil bo‘lmaydi'], ['virtual', 'Mavhum, to‘g‘ri, kattalashgan'],
];
function lensKind(d, F) { if (d === F) return 'none'; if (d < F) return 'virtual'; if (d === 2 * F) return 'real-same'; return d > 2 * F ? 'real-small' : 'real-big'; }
export function LensLab({ onFinish }) {
  const F = 3;
  const cases = useMemo(() => [5, 6, 4.5, 3, 2, 8, 1.5].sort(() => Math.random() - 0.5).slice(0, 5), []);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState(null);
  const [score, setScore] = useState(0);
  const d = cases[i]; const kind = lensKind(d, F);
  const u = 20, cx = 200, ay = 110, h = 1.6;
  const f = d === F ? Infinity : (d * F) / (d - F); const H = d === F ? 0 : -(f / d) * h;
  const X = x => cx + x * u, Y = y => ay - y * u;
  const shown = ans != null;
  function next() {
    const s = score + (ans === kind ? 12 : 0); setScore(s);
    if (i + 1 >= cases.length) return onFinish(s);
    setI(i + 1); setAns(null);
  }
  return (
    <div className="stack">
      <p className="muted">Yig‘uvchi linza, fokus masofasi F = {F} bo‘linma. Buyum linzadan <b>d = {String(d).replace('.', ',')}</b> bo‘linma uzoqlikda ({d > 2 * F ? 'd > 2F' : d === 2 * F ? 'd = 2F' : d > F ? 'F < d < 2F' : d === F ? 'd = F' : 'd < F'}). Tasvir qanday bo‘ladi? ({i + 1}/{cases.length})</p>
      <div className="lab">
        <svg className="scene" viewBox="0 0 400 220" aria-label="Linzada tasvir yasash">
          <line x1="0" y1={ay} x2="400" y2={ay} stroke="var(--muted)" strokeDasharray="4 4" />
          <ellipse cx={cx} cy={ay} rx="7" ry="92" fill="var(--pen-soft)" stroke="var(--pen)" strokeWidth="2" />
          {[-2 * F, -F, F, 2 * F].map(x => <g key={x}><circle cx={X(x)} cy={ay} r="3" fill="var(--ink)" /><text x={X(x)} y={ay + 18} textAnchor="middle" fontSize="11" fill="var(--muted)" fontFamily="var(--f-math)" fontStyle="italic">{Math.abs(x) === F ? 'F' : '2F'}</text></g>)}
          <line x1={X(-d)} y1={ay} x2={X(-d)} y2={Y(h)} stroke="var(--ink)" strokeWidth="3" markerEnd="" /><polygon points={`${X(-d) - 6},${Y(h) + 8} ${X(-d) + 6},${Y(h) + 8} ${X(-d)},${Y(h) - 2}`} fill="var(--ink)" />
          {shown && (
            <g strokeWidth="1.8" fill="none">
              <path d={`M${X(-d)} ${Y(h)} L${cx} ${Y(h)} L${X(12)} ${Y(h - (12 / F) * h)}`} stroke="var(--red)" />
              <path d={`M${X(-d)} ${Y(h)} L${X(12)} ${Y(h - (12 + d) * (h / d))}`} stroke="var(--green)" />
              {kind === 'virtual' && <><path d={`M${cx} ${Y(h)} L${X(f)} ${Y(H)}`} stroke="var(--red)" strokeDasharray="4 4" /><path d={`M${X(-d)} ${Y(h)} L${X(f)} ${Y(H)}`} stroke="var(--green)" strokeDasharray="4 4" /></>}
              {kind !== 'none' && isFinite(f) && Math.abs(f) < 10 && <><line x1={X(f)} y1={ay} x2={X(f)} y2={Y(H)} stroke="var(--pen)" strokeWidth="3" strokeDasharray={kind === 'virtual' ? '5 4' : ''} /></>}
            </g>
          )}
        </svg>
        <div className="controls">
          <div className="stack tight">
            {LENS_OPTS.map(([k, l]) => (
              <button key={k} className={'opt' + (shown && k === kind ? ' ok' : shown && k === ans ? ' bad' : '')} disabled={shown} onClick={() => setAns(k)} style={{ fontFamily: 'var(--f-ui)', fontSize: 16 }}>
                <span className="L">•</span><span className="tx">{l}</span>
              </button>
            ))}
          </div>
          {shown && <><p className="small math">1/F = 1/d + 1/f → f = {isFinite(f) ? (Math.round(f * 100) / 100).toString().replace('.', ',') : '∞'}; Γ = |f/d| = {isFinite(f) ? (Math.round(Math.abs(f / d) * 100) / 100).toString().replace('.', ',') : '—'}</p>
            <button className="btn" onClick={next}>{i + 1 < cases.length ? 'Keyingisi' : 'Yakunlash'}</button></>}
        </div>
      </div>
    </div>
  );
}

/* ================= Arximed: suzadimi? (6-sinf) ================= */
const BODIES = [['Po‘kak', 240], ['Yog‘och (qarag‘ay)', 500], ['Muz', 900], ['Parafin', 900], ['Plastmassa', 1100], ['Alyuminiy', 2700], ['Temir', 7800], ['Oltin', 19300], ['Mis', 8900]];
const LIQ = [['Suv', 1000], ['Kerosin', 800], ['Dengiz suvi', 1030], ['Simob', 13600]];
export function ArchimedesLab({ onFinish }) {
  const mk = () => ({ b: pick(BODIES), l: pick(LIQ) });
  const [r, setR] = useState(0);
  const [c, setC] = useState(mk);
  const [ans, setAns] = useState(null);
  const [score, setScore] = useState(0);
  const ratio = c.b[1] / c.l[1];
  const res = ratio < 0.999 ? 'float' : ratio > 1.001 ? 'sink' : 'mid';
  const shown = ans != null;
  const sub = Math.min(1, ratio);
  const by = !shown ? 4 : res === 'sink' ? 160 : res === 'mid' ? 110 : 30 + 40 * sub;
  function next() {
    const s = score + (ans === res ? 12 : 0); setScore(s);
    if (r + 1 >= 5) return onFinish(s);
    setR(r + 1); setC(mk()); setAns(null);
  }
  return (
    <div className="stack">
      <p className="muted">{r + 1}/5. <b>{c.b[0]}</b> (ρ = {c.b[1]} kg/m³) <b>{c.l[0]}</b>ga (ρ = {c.l[1]} kg/m³) tashlandi. Nima bo‘ladi?</p>
      <div className="lab">
        <svg className="scene" viewBox="0 0 400 220" aria-label="Arximed kuchi tajribasi">
          <rect x="110" y="70" width="180" height="130" fill={c.l[0] === 'Simob' ? 'rgba(160,160,170,.55)' : c.l[0] === 'Kerosin' ? 'rgba(240,200,80,.35)' : 'rgba(60,140,230,.3)'} />
          <path d="M110 30 V200 H290 V30" fill="none" stroke="var(--ink)" strokeWidth="3" />
          <rect x="175" y={by} width="50" height="40" rx="4" fill={c.b[1] > 2000 ? '#8a8f99' : c.b[1] < 950 ? '#c58b4a' : '#9ad'} stroke="var(--ink)" style={{ transition: 'y 1s ease' }} />
          {shown && <text x="200" y="22" textAnchor="middle" fontSize="13" fontFamily="var(--f-math)" fill="var(--ink)">ρ_jism / ρ_suyuqlik = {(Math.round(ratio * 100) / 100).toString().replace('.', ',')}</text>}
        </svg>
        <div className="controls grid3">
          {[['float', 'Suzadi'], ['mid', 'Muallaq turadi'], ['sink', 'Cho‘kadi']].map(([k, l]) => (
            <button key={k} className={'btn ' + (shown ? (k === res ? 'green' : k === ans ? 'red' : 'ghost') : 'ghost')} disabled={shown} onClick={() => setAns(k)}>{l}</button>
          ))}
        </div>
        {shown && <p className="small" style={{ marginTop: 10 }}>{res === 'float' ? `Jism zichligi kichik — suzadi, hajmining ${Math.round(sub * 100)}% qismi botadi.` : res === 'sink' ? 'Jism zichligi suyuqlikdan katta — Arximed kuchi og‘irlikni muvozanatlay olmaydi.' : 'Zichliklar teng — jism suyuqlik ichida muallaq turadi.'}</p>}
        {shown && <button className="btn block" style={{ marginTop: 10 }} onClick={next}>{r + 1 < 5 ? 'Keyingisi' : 'Yakunlash'}</button>}
      </div>
    </div>
  );
}

/* ================= Matematik mayatnik (10-sinf) ================= */
export function PendulumLab({ onFinish }) {
  const planets = [['Yer', 9.8], ['Oy', 1.62], ['Mars', 3.7]];
  const [r, setR] = useState(0);
  const [goal] = useState(() => [1.5, 2, 1].map((T, i) => ({ T: T + (i === 1 ? 0 : 0), p: planets[i] })));
  const [l, setL] = useState(0.5);
  const [ph, setPh] = useState(0);
  const [score, setScore] = useState(0);
  const g = goal[r].p[1];
  const T = 2 * Math.PI * Math.sqrt(l / g);
  const ok = Math.abs(T - goal[r].T) <= 0.05;
  useEffect(() => { let id; const st = performance.now(); const f = now => { setPh(((now - st) / 1000) * (2 * Math.PI / T)); id = requestAnimationFrame(f); }; id = requestAnimationFrame(f); return () => cancelAnimationFrame(id); }, [T]);
  const th = 0.35 * Math.sin(ph); const Lpx = 30 + l * 60;
  function next() { const s = score + 15; setScore(s); if (r + 1 >= goal.length) return onFinish(s); setR(r + 1); }
  return (
    <div className="stack">
      <p className="muted">{goal[r].p[0]}da (g = {String(g).replace('.', ',')} m/s²) tebranish davri <b>T = {String(goal[r].T).replace('.', ',')} s</b> bo‘lgan mayatnik yasang. ({r + 1}/{goal.length})</p>
      <div className="lab">
        <svg className="scene" viewBox="0 0 400 230" aria-label="Matematik mayatnik">
          <line x1="140" y1="16" x2="260" y2="16" stroke="var(--ink)" strokeWidth="4" />
          <line x1="200" y1="16" x2={200 + Lpx * Math.sin(th)} y2={16 + Lpx * Math.cos(th)} stroke="var(--ink)" strokeWidth="1.5" />
          <circle cx={200 + Lpx * Math.sin(th)} cy={16 + Lpx * Math.cos(th)} r="12" fill={ok ? 'var(--green)' : 'var(--red)'} />
          <text x="20" y="210" fontSize="14" fontFamily="var(--f-math)" fill="var(--ink)">T = 2π√(l/g) = {T.toFixed(2).replace('.', ',')} s</text>
        </svg>
        <div className="controls">
          <Slider label="Ip uzunligi l" value={l} min={0.05} max={3} step={0.01} onChange={setL} unit="m" />
          {ok ? <button className="btn green" onClick={next}>Topdingiz! Davom etish</button> : <p className="small muted">Kerakli uzunlik: l = gT²/(4π²). Hisoblang va sozlang.</p>}
        </div>
      </div>
    </div>
  );
}
