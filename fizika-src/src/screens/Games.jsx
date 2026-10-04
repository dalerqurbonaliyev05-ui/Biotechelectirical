import React, { useState } from 'react';
import { api } from '../lib/api.js';
import { Back, useToast } from '../components/ui.jsx';
import { TopBar } from './Home.jsx';
import { FormulaMemory, FormulaBuilder, UnitRace } from '../games/FormulaGames.jsx';
import CircuitLab from '../games/CircuitLab.jsx';
import { LeverLab, ProjectileLab, LensLab, ArchimedesLab, PendulumLab } from '../games/Labs.jsx';
import Generator from '../games/Generator.jsx';

export const GAMES = [
  { id: 'circuit', title: 'Sxema yig‘ish', sub: 'Elektr zanjirini yig‘ing: lampochka, ampermetr, voltmetr, rezistorlar', g: '8-sinf', sym: 'I', C: CircuitLab, kind: 'lab' },
  { id: 'lever', title: 'Richag muvozanati', sub: 'Yuklarni joylab, kuch momentlarini tenglang', g: '6-sinf', sym: 'M', C: LeverLab, kind: 'lab' },
  { id: 'archimedes', title: 'Suzadimi yoki cho‘kadimi?', sub: 'Arximed kuchi va zichlik', g: '6-sinf', sym: 'ρ', C: ArchimedesLab, kind: 'lab' },
  { id: 'projectile', title: 'Nishonga otish', sub: 'Burchak va tezlikni tanlab, nishonga tegizing', g: '7, 10-sinf', sym: 'α', C: ProjectileLab, kind: 'lab' },
  { id: 'lens', title: 'Linza tasviri', sub: 'Buyum joyiga qarab tasvir turini toping, nurlar chiziladi', g: '9-sinf', sym: 'F', C: LensLab, kind: 'lab' },
  { id: 'pendulum', title: 'Mayatnik sozlash', sub: 'Yer, Oy va Marsda kerakli davrni toping', g: '10-sinf', sym: 'T', C: PendulumLab, kind: 'lab' },
  { id: 'memory', title: 'Formula juftliklari', sub: 'Formulani nomi bilan juftlang', g: 'barcha sinflar', sym: '≡', C: FormulaMemory, kind: 'formula' },
  { id: 'builder', title: 'Formula yig‘ish', sub: 'Bo‘laklardan formulani to‘g‘ri tartibda tuzing', g: 'barcha sinflar', sym: '=', C: FormulaBuilder, kind: 'formula' },
  { id: 'units', title: 'Birliklar poygasi', sub: '60 soniyada SI birliklarini toping', g: 'barcha sinflar', sym: 'N', C: UnitRace, kind: 'formula' },
  { id: 'generator', title: 'Masala mashinasi', sub: 'Har safar yangi sonlar bilan hisoblash masalalari', g: '6–11-sinf', sym: 'Σ', C: Generator, kind: 'formula' },
];

export default function Games({ me, go, onPlayed }) {
  return (
    <div className="page">
      <TopBar me={me} />
      <h1>Laboratoriya</h1>
      <p className="muted" style={{ marginTop: 6 }}>Darslikdagi chizmalar va tajribalar asosida interaktiv o‘yinlar. O‘yinlardan kuniga 300 XP gacha olish mumkin.</p>
      <div className="section">
        <div className="section-head"><h2>Tajribalar</h2></div>
        <div className="grid2">
          {GAMES.filter(x => x.kind === 'lab').map(x => (
            <button key={x.id} className="tile" onClick={() => go('game', { id: x.id })}>
              <span className="big">{x.sym}</span><span className="tt">{x.title}</span><span className="ts">{x.sub}</span><span className="tag" style={{ justifySelf: 'start' }}>{x.g}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="section">
        <div className="section-head"><h2>Formulalar esda qolsin</h2><button className="link" onClick={() => go('formulas')}>Formulalar jadvali</button></div>
        <div className="grid2">
          {GAMES.filter(x => x.kind === 'formula').map(x => (
            <button key={x.id} className="tile" onClick={() => go('game', { id: x.id })}>
              <span className="big">{x.sym}</span><span className="tt">{x.title}</span><span className="ts">{x.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GameHost({ id, me, back, onPlayed }) {
  const toast = useToast();
  const game = GAMES.find(x => x.id === id);
  const [k, setK] = useState(0);
  const [done, setDone] = useState(null);
  if (!game) return null;
  async function finish(score) {
    try {
      const r = await api.recordGame(id, score);
      setDone({ score, ...r }); onPlayed?.();
      r.new_rewards?.forEach(nr => toast(`Yangi nishon: ${nr.icon} ${nr.title}`));
    } catch (e) { toast(e.message); setDone({ score, xp: 0 }); }
  }
  const C = game.C;
  return (
    <div className="page">
      <Back onClick={back} title={game.title} />
      {done ? (
        <div className="sheet empty">
          <p className="margin-note" style={{ fontSize: 34 }}>{done.score >= 40 ? 'Zo‘r natija!' : done.score >= 20 ? 'Yaxshi!' : 'Yana urinib ko‘ring'}</p>
          <p style={{ fontSize: 22, fontWeight: 800 }}>Ochko: {done.score} · +{done.xp} XP</p>
          {done.capped && <p className="small muted">Bugungi o‘yin XP limiti (300) ga yetdingiz — testlar orqali XP yig‘ishda davom eting.</p>}
          <div className="row"><button className="btn" onClick={() => { setDone(null); setK(k + 1); }}>Yana o‘ynash</button><button className="btn ghost" onClick={back}>O‘yinlar</button></div>
        </div>
      ) : <C key={k} grade={me.role_type === 'student' ? me.grade : 11} onFinish={finish} />}
    </div>
  );
}
