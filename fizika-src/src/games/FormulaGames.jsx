import React, { useEffect, useMemo, useState } from 'react';
import { FORMULAS, UNITS } from '../data/formulas.js';

const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const poolFor = grade => { const p = FORMULAS.filter(f => !grade || f.g <= grade); return p.length >= 6 ? p : FORMULAS; };

/* ---------- 1. Formula juftliklari (xotira o'yini) ---------- */
export function FormulaMemory({ grade, onFinish }) {
  const [cards, setCards] = useState(() => {
    const pick = shuffle(poolFor(grade)).slice(0, 6);
    return shuffle(pick.flatMap(f => [{ k: f.id + 'n', id: f.id, text: f.name, kind: 'name' }, { k: f.id + 'f', id: f.id, text: f.f, kind: 'formula' }]));
  });
  const [open, setOpen] = useState([]);
  const [done, setDone] = useState([]);
  const [moves, setMoves] = useState(0);
  const [miss, setMiss] = useState(null);
  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open.map(k => cards.find(c => c.k === k));
    setMoves(m => m + 1);
    if (a.id === b.id && a.kind !== b.kind) { setDone(d => [...d, a.id]); setOpen([]); }
    else { setMiss(open); const t = setTimeout(() => { setOpen([]); setMiss(null); }, 900); return () => clearTimeout(t); }
  }, [open, cards]);
  const finished = done.length === 6;
  useEffect(() => { if (finished) onFinish(Math.max(10, 60 - Math.max(0, moves - 6) * 4)); }, [finished]); // eslint-disable-line
  return (
    <div className="stack">
      <p className="muted">Formulani uning nomi bilan juftlang. Kamroq urinishda topsangiz ko‘proq XP olasiz.</p>
      <p className="small"><b>Urinishlar:</b> {moves} · <b>Topildi:</b> {done.length}/6</p>
      <div className="memory">
        {cards.map(c => {
          const isOpen = open.includes(c.k) || done.includes(c.id);
          return (
            <button key={c.k} className={'mcard' + (isOpen ? ' open' : '') + (c.kind === 'formula' ? ' formula' : '') + (done.includes(c.id) ? ' done' : '') + (miss?.includes(c.k) ? ' miss' : '')}
              disabled={done.includes(c.id) || open.length === 2} onClick={() => !open.includes(c.k) && setOpen(o => [...o, c.k])}
              aria-label={isOpen ? c.text : 'Yopiq karta'}>
              {isOpen ? c.text : <span style={{ fontFamily: 'var(--f-math)', fontSize: 26, fontStyle: 'italic' }}>?</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 2. Formula yig'ish ---------- */
function tokenize(f) {
  return f.replace(/\s+/g, ' ').split(/(\s|\(|\)|\/|·|=|\+|−|√|²)/).map(s => s.trim()).filter(Boolean);
}
export function FormulaBuilder({ grade, onFinish }) {
  const rounds = useMemo(() => shuffle(poolFor(grade).filter(f => tokenize(f.f).length >= 4 && tokenize(f.f).length <= 11)).slice(0, 5), [grade]);
  const [r, setR] = useState(0);
  const [picked, setPicked] = useState([]);
  const [score, setScore] = useState(0);
  const [state, setState] = useState(null);
  const f = rounds[r];
  const target = useMemo(() => (f ? tokenize(f.f) : []), [f]);
  const bag = useMemo(() => shuffle(target.map((t, i) => ({ t, i }))), [target]);
  if (!f) return null;
  function check() {
    const ok = picked.map(i => target[i]).join(' ') === target.join(' ');
    setState(ok ? 'ok' : 'bad'); if (ok) setScore(s => s + 12);
  }
  function next() {
    setState(null); setPicked([]);
    if (r + 1 < rounds.length) setR(r + 1); else onFinish(score);
  }
  return (
    <div className="stack">
      <p className="muted">{r + 1}/{rounds.length}. Formulani bo‘laklardan to‘g‘ri tartibda yig‘ing.</p>
      <h2>{f.name}</h2>
      {f.v && <p className="small muted">{f.v}</p>}
      <div className="tokens" aria-label="Siz yig‘gan formula">
        {picked.map((i, k) => <button key={k} className="token" onClick={() => !state && setPicked(p => p.filter((_, j) => j !== k))}>{target[i]}</button>)}
        {!picked.length && <span className="muted small">Pastdagi bo‘laklarni bosing</span>}
      </div>
      <div className="tokens" style={{ borderStyle: 'solid' }}>
        {bag.map(({ t, i }) => <button key={i} className={'token' + (picked.includes(i) ? ' used' : '')} onClick={() => !state && setPicked(p => [...p, i])}>{t}</button>)}
      </div>
      {state && <p className={state === 'ok' ? 'tag green' : 'tag red'} style={{ fontSize: 15, padding: 10 }}>{state === 'ok' ? 'To‘g‘ri!' : 'To‘g‘ri ko‘rinishi:'} <span className="math" style={{ fontSize: 20 }}>{f.f}</span></p>}
      {!state ? <button className="btn block" disabled={picked.length !== target.length} onClick={check}>Tekshirish</button>
        : <button className="btn block" onClick={next}>{r + 1 < rounds.length ? 'Keyingisi' : 'Yakunlash'}</button>}
    </div>
  );
}

/* ---------- 3. Birliklar poygasi (60 soniya) ---------- */
export function UnitRace({ onFinish }) {
  const [t, setT] = useState(60);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [q, setQ] = useState(null);
  const [flash, setFlash] = useState(null);
  const newQ = () => {
    const [name, unit] = UNITS[Math.floor(Math.random() * UNITS.length)];
    const opts = shuffle([unit, ...shuffle(UNITS.filter(u => u[1] !== unit)).slice(0, 3).map(u => u[1])]);
    setQ({ name, unit, opts });
  };
  useEffect(newQ, []);
  useEffect(() => { if (t <= 0) { onFinish(Math.min(60, score)); return; } const id = setTimeout(() => setT(x => x - 1), 1000); return () => clearTimeout(id); }, [t]); // eslint-disable-line
  if (!q) return null;
  const pick = o => {
    if (t <= 0) return;
    if (o === q.unit) { setScore(s => s + 3 + Math.min(streak, 5)); setStreak(s => s + 1); setFlash('ok'); }
    else { setStreak(0); setFlash('bad'); }
    setTimeout(() => setFlash(null), 250); newQ();
  };
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}><span className={'chip timer' + (t < 10 ? ' low' : '')}>⏱ {t} s</span><span className="chip">Ochko: {score}</span><span className="chip">🔥 {streak}</span></div>
      <div className="sheet" style={{ textAlign: 'center', borderColor: flash === 'ok' ? 'var(--green)' : flash === 'bad' ? 'var(--red)' : undefined }}>
        <p className="muted small">SI dagi birligi qaysi?</p>
        <h2 style={{ fontSize: 28, marginTop: 6 }}>{q.name}</h2>
      </div>
      <div className="grid2">{q.opts.map(o => <button key={o} className="btn ghost" onClick={() => pick(o)} disabled={t <= 0}>{o}</button>)}</div>
    </div>
  );
}
