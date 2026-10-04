import React, { useEffect, useMemo, useState } from 'react';

const INF = 1e12;
const COMP = {
  battery: { label: 'Batareya', sym: 'ℰ' },
  lamp: { label: 'Lampochka', sym: '⊗', R: 6 },
  switch: { label: 'Kalit', sym: '⏻' },
  ammeter: { label: 'Ampermetr', sym: 'A', R: 0 },
  voltmeter: { label: 'Voltmetr', sym: 'V', R: INF },
  wire: { label: 'Sim', sym: '—', R: 0 },
  r2: { label: '2 Ω', sym: 'R', R: 2 }, r3: { label: '3 Ω', sym: 'R', R: 3 }, r4: { label: '4 Ω', sym: 'R', R: 4 }, r6: { label: '6 Ω', sym: 'R', R: 6 },
};
const SLOTS = { S0: [40, 130, 'v'], S1: [120, 40, 'h'], S2: [220, 40, 'h'], P1: [300, 130, 'v'], P2: [372, 130, 'v'] };

const TASKS = [
  { id: 'lamp', title: 'Lampochkani yoqing', text: 'Batareya, kalit va lampochkani bo‘sh joylarga qo‘ying, so‘ng kalitni yoping (kalitni bosing).',
    palette: ['battery', 'switch', 'lamp'], fixed: { P1: 'wire' }, slots: ['S0', 'S1', 'S2'], emf: 4.5,
    goal: s => s.lit.length >= 1 && s.I > 0, hint: 'Zanjir berk bo‘lishi kerak: manba → kalit → iste’molchi → manba.' },
  { id: 'meters', title: 'Ampermetr va voltmetrni ulang', text: 'Lampochkadagi tok kuchi va kuchlanishni o‘lchang. Ampermetr ketma-ket, voltmetr esa lampochkaga parallel ulanadi.',
    palette: ['ammeter', 'voltmeter', 'wire'], fixed: { S0: 'battery', S1: 'wire', P1: 'lamp' }, slots: ['S2', 'P2'], emf: 6,
    goal: s => s.place.S2 === 'ammeter' && s.place.P2 === 'voltmeter' && s.I > 0, hint: 'Voltmetrning qarshiligi juda katta — uni ketma-ket ulasangiz tok deyarli o‘tmaydi.' },
  { id: 'twoamps', title: 'Tok kuchi 2 A bo‘lsin', text: 'Manba EYuK 12 V. Rezistorlarni ketma-ket yoki parallel ulab, zanjirdagi tok 2 A bo‘ladigan qiling.',
    palette: ['r2', 'r3', 'r4', 'r6', 'wire'], fixed: { S0: 'battery' }, slots: ['S1', 'S2', 'P1', 'P2'], emf: 12,
    goal: s => Math.abs(s.I - 2) < 0.01, hint: 'Om qonuni: R = U / I = 12 / 2 = 6 Ω bo‘lishi kerak. Ketma-ket: R₁ + R₂, parallel: R₁R₂/(R₁+R₂).' },
  { id: 'parallel', title: 'Ikki lampani parallel ulang', text: 'Ikkala lampochka yonsin, ular bir-biriga bog‘liq bo‘lmasin: biri o‘chsa, ikkinchisi yonib tursin.',
    palette: ['lamp', 'switch', 'wire'], fixed: { S0: 'battery' }, slots: ['S1', 'S2', 'P1', 'P2'], emf: 6,
    goal: s => s.place.P1 === 'lamp' && s.place.P2 === 'lamp' && s.lit.length === 2, hint: 'Parallel ulashda har bir lampochka manbaga alohida tarmoq orqali ulanadi (o‘ng tomondagi ikki joy).' },
  { id: 'free', title: 'Erkin laboratoriya', text: 'Istalgan sxemani yig‘ing va asboblar ko‘rsatkichini kuzating.',
    palette: ['battery', 'lamp', 'switch', 'ammeter', 'voltmeter', 'r2', 'r4', 'wire'], fixed: {}, slots: ['S0', 'S1', 'S2', 'P1', 'P2'], emf: 6, goal: () => false },
];

function solve(place, sw, emfEach) {
  const R = (k, slot) => { const c = place[slot]; if (!c) return INF; if (c === 'battery') return 0; if (c === 'switch') return sw[slot] ? 0 : INF; return COMP[c].R; };
  const series = ['S0', 'S1', 'S2'];
  const E = series.filter(s => place[s] === 'battery').length * emfEach;
  const Rs = series.reduce((a, s) => a + R(0, s), 0);
  const r1 = R(0, 'P1'), r2 = place.P2 ? R(0, 'P2') : INF;
  const Rp = r1 === 0 || r2 === 0 ? 0 : (r1 >= INF && r2 >= INF) ? INF : 1 / ((r1 >= INF ? 0 : 1 / r1) + (r2 >= INF ? 0 : 1 / r2));
  const Rt = Rs + Rp + 0.0001;
  const short = E > 0 && Rs + Rp < 0.01;
  const I = E > 0 && Rt < INF / 10 && !short ? E / Rt : 0;
  const Up = I * (Rp >= INF ? 0 : Rp);
  const cur = s => (series.includes(s) ? I : (R(0, s) >= INF ? 0 : R(0, s) === 0 ? (Rp === 0 ? I : 0) : Up / R(0, s)));
  const lit = Object.keys(place).filter(s => place[s] === 'lamp' && cur(s) > 0.05);
  // voltmetr ko'rsatkichi
  const volt = s => (series.includes(s) ? (Rs + Rp >= INF / 10 && E > 0 && place[s] === 'voltmeter' ? E : 0) : Up);
  return { E, I, Up, cur, lit, volt, short, Rt: Rs + Rp };
}

export default function CircuitLab({ onFinish }) {
  const [ti, setTi] = useState(0);
  const task = TASKS[ti];
  const [place, setPlace] = useState({ ...task.fixed });
  const [sw, setSw] = useState({});
  const [tool, setTool] = useState(task.palette[0]);
  const [solved, setSolved] = useState([]);
  const s = useMemo(() => ({ ...solve(place, sw, task.emf), place }), [place, sw, task]);
  const ok = task.goal(s);
  useEffect(() => { if (ok) setSolved(x => (x.includes(task.id) ? x : [...x, task.id])); }, [ok, task.id]);

  function choose(i) { setTi(i); setPlace({ ...TASKS[i].fixed }); setSw({}); setTool(TASKS[i].palette[0]); }
  function tap(slot) {
    if (task.fixed[slot]) return;
    if (place[slot] === 'switch' && tool !== 'remove') { setSw(w => ({ ...w, [slot]: !w[slot] })); return; }
    if (tool === 'remove') { const p = { ...place }; delete p[slot]; setPlace(p); return; }
    setPlace(p => ({ ...p, [slot]: tool }));
  }
  const active = new Set([...task.slots, ...Object.keys(task.fixed)]);
  const showP2 = active.has('P2');
  const flow = s.I > 0;

  const drawComp = (slot) => {
    const [x, y, o] = SLOTS[slot];
    const c = place[slot];
    const empty = !c;
    const lamp = c === 'lamp';
    const glow = lamp && s.lit.includes(slot) ? Math.min(1, s.cur(slot) / 1.2) : 0;
    let reading = null;
    if (c === 'ammeter') reading = s.cur(slot).toFixed(2) + ' A';
    if (c === 'voltmeter') reading = s.volt(slot).toFixed(2) + ' V';
    const label = c ? (COMP[c].label.match(/Ω/) ? COMP[c].label : COMP[c].sym) : '+';
    return (
      <g key={slot} onClick={() => tap(slot)} style={{ cursor: task.fixed[slot] ? 'default' : 'pointer' }} role="button" aria-label={`${slot}: ${c ? COMP[c].label : 'bo‘sh joy'}`}>
        <rect x={x - 24} y={y - 18} width="48" height="36" rx="8" fill={glow ? `rgba(255,214,0,${0.25 + glow * 0.6})` : 'var(--surface)'}
          stroke={empty ? 'var(--muted)' : task.fixed[slot] ? 'var(--muted)' : 'var(--pen)'} strokeWidth="2" strokeDasharray={empty ? '4 4' : ''} />
        {c === 'battery' ? (<g stroke="var(--ink)" strokeWidth="3"><line x1={x - 5} y1={y - 12} x2={x - 5} y2={y + 12} /><line x1={x + 5} y1={y - 6} x2={x + 5} y2={y + 6} strokeWidth="5" /></g>)
          : c === 'switch' ? (<g stroke="var(--ink)" strokeWidth="2.5" fill="var(--ink)"><circle cx={x - 12} cy={y + 6} r="3" /><circle cx={x + 12} cy={y + 6} r="3" /><line x1={x - 12} y1={y + 6} x2={sw[slot] ? x + 12 : x + 8} y2={sw[slot] ? y + 6 : y - 10} /></g>)
          : c === 'lamp' ? (<g stroke="var(--ink)" strokeWidth="2" fill="none"><circle cx={x} cy={y} r="11" fill={glow ? '#FFD84A' : 'none'} /><line x1={x - 8} y1={y - 8} x2={x + 8} y2={y + 8} /><line x1={x + 8} y1={y - 8} x2={x - 8} y2={y + 8} /></g>)
          : <text x={x} y={y + 6} textAnchor="middle" fontSize={label.length > 2 ? 14 : 20} fontFamily="var(--f-math)" fontStyle="italic" fill="var(--ink)">{label}</text>}
        {reading && <text x={x} y={y + 34} textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--pen)">{reading}</text>}
      </g>
    );
  };

  return (
    <div className="stack">
      <div className="seg">{TASKS.map((t, i) => <button key={t.id} aria-pressed={ti === i} onClick={() => choose(i)}>{solved.includes(t.id) ? '✓ ' : ''}{i + 1}</button>)}</div>
      <div><h2>{task.title}</h2><p className="muted" style={{ marginTop: 4 }}>{task.text}</p></div>
      <div className="lab">
        <svg className="scene" viewBox="0 0 420 260" aria-label="Elektr zanjir sxemasi">
          <defs>
            <pattern id="flow" width="20" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="2" fill="var(--pen)">
              <animate attributeName="cx" from="0" to="20" dur={flow ? `${Math.max(0.25, 1.2 / Math.max(s.I, 0.2))}s` : '0s'} repeatCount="indefinite" /></circle></pattern>
          </defs>
          <g stroke="var(--ink)" strokeWidth="3" fill="none">
            <path d="M40 40 H300 V220 H40 Z" />
            {showP2 && <path d="M300 70 H372 V190 H300" />}
          </g>
          {flow && <g stroke="var(--pen)" strokeWidth="3" fill="none" strokeDasharray="2 14" style={{ animation: 'none' }}>
            <path d="M40 220 V40 H300 V220 Z" opacity=".55"><animate attributeName="stroke-dashoffset" from="32" to="0" dur={`${Math.max(0.3, 1.5 / Math.max(s.I, 0.2))}s`} repeatCount="indefinite" /></path>
          </g>}
          {showP2 && <><circle cx="300" cy="70" r="4" fill="var(--ink)" /><circle cx="300" cy="190" r="4" fill="var(--ink)" /></>}
          {Object.keys(SLOTS).filter(k => active.has(k)).map(drawComp)}
          <text x="170" y="245" textAnchor="middle" fontSize="13" fill="var(--muted)">{s.short ? 'Qisqa tutashuv! Manbani sim bilan to‘g‘ridan-to‘g‘ri ulamang.' : `ℰ = ${s.E} V · I = ${s.I.toFixed(2)} A${s.Rt < 1e9 ? ` · R = ${s.Rt.toFixed(2)} Ω` : ''}`}</text>
        </svg>
        <div className="controls">
          <div className="palette" role="group" aria-label="Elementlar">
            {task.palette.map(p => <button key={p} aria-pressed={tool === p} onClick={() => setTool(p)}><span className="math" style={{ fontSize: 18, fontStyle: 'italic' }}>{COMP[p].sym}</span>{COMP[p].label}</button>)}
            <button aria-pressed={tool === 'remove'} onClick={() => setTool('remove')}><span style={{ fontSize: 18 }}>⌫</span>Olib tashlash</button>
          </div>
          <p className="small muted">Elementni tanlang va sxemadagi bo‘sh joyni bosing. Kalitni yoqish/o‘chirish uchun uni bosing.</p>
        </div>
      </div>
      {ok ? (
        <div className="notice" style={{ background: 'var(--green-soft)' }}><b>Bajarildi!</b> {ti + 1 < TASKS.length - 1 ? 'Keyingi topshiriqqa o‘ting.' : ''}</div>
      ) : task.hint && <details className="small"><summary style={{ cursor: 'pointer', fontWeight: 700 }}>Yordam</summary><p style={{ marginTop: 6 }}>{task.hint}</p></details>}
      <div className="row">
        {ti + 1 < TASKS.length && <button className="btn grow" disabled={!ok} onClick={() => choose(ti + 1)}>Keyingi topshiriq</button>}
        <button className="btn ghost grow" onClick={() => onFinish(Math.min(60, solved.length * 15))}>Yakunlash ({solved.length} ta bajarildi)</button>
      </div>
    </div>
  );
}
