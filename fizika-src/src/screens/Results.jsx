import React, { useState } from 'react';
import Question from '../components/Question.jsx';
import { answerText } from '../lib/grading.js';

export function schoolGrade(pct) { return pct >= 86 ? 5 : pct >= 71 ? 4 : pct >= 56 ? 3 : 2; }
const NOTE = { 5: 'A’lo! Shunday davom eting', 4: 'Yaxshi, ozgina qoldi', 3: 'Qoniqarli. Xatolarni ko‘rib chiqing', 2: 'Mavzuni qaytadan o‘qib, yana urinib ko‘ring' };
export function certLevel(b) { return b >= 70 ? 'A+' : b >= 65 ? 'A' : b >= 60 ? 'B+' : b >= 55 ? 'B' : b >= 50 ? 'C+' : b >= 46 ? 'C' : 'Sertifikat darajasiga yetmadi'; }

export default function Results({ result, onExit, onRetry }) {
  const a = result.attempt;
  const pct = Math.round(+a.score || 0);
  const g = schoolGrade(pct);
  const [filter, setFilter] = useState('all');
  const ball = a.meta?.milliy_ball;
  const rev = (result.review || []).filter(r => filter === 'all' || (filter === 'bad' ? r.points < 0.999 : r.points >= 0.999));

  return (
    <div className="page">
      <div className="result-hero">
        <div className="grade-stamp" aria-label={`Baho: ${g}`}>
          <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M60 8 C 98 6, 116 40, 108 72 C 100 104, 50 116, 22 96 C -2 78, 8 30, 40 14 C 52 8, 70 8, 76 12" /></svg>
          <b>{g}</b>
        </div>
        <div className="stack tight">
          <h1 style={{ fontSize: 30 }}>{a.correct} / {a.total}</h1>
          <p className="margin-note">{NOTE[g]}</p>
          <p className="small muted">{a.title}</p>
        </div>
      </div>

      <div className="stats section" style={{ marginTop: 22 }}>
        <div className="stat"><b>{pct}%</b><span>Natija</span></div>
        <div className="stat"><b>+{a.xp_earned}</b><span>XP</span></div>
        <div className="stat"><b>+{a.coins_earned}</b><span>Tanga</span></div>
      </div>

      {ball != null && (
        <div className="sheet section">
          <h3>Milliy sertifikat bo‘yicha taxminiy natija</h3>
          <p style={{ fontSize: 34, fontWeight: 800, margin: '6px 0' }}>{ball} <span className="muted" style={{ fontSize: 18 }}>/ 75 ball</span></p>
          <p>Taxminiy daraja: <b className="mark">{certLevel(ball)}</b></p>
          <p className="small muted" style={{ marginTop: 8 }}>Haqiqiy imtihonda ballar Rasch modeli bo‘yicha hisoblanadi, shuning uchun bu natija faqat mo‘ljal uchun.</p>
        </div>
      )}

      {result.new_rewards?.length > 0 && (
        <div className="sheet section">
          <h3>Yangi nishon!</h3>
          <div className="badges" style={{ marginTop: 10 }}>
            {result.new_rewards.map(r => <div className="badge on" key={r.id}><div className="bi">{r.icon}</div><div className="bt">{r.title}</div><div className="bd">{r.description}</div></div>)}
          </div>
        </div>
      )}

      <div className="row section">
        <button className="btn grow" onClick={onRetry}>Yana yechish</button>
        <button className="btn ghost grow" onClick={onExit}>Bosh sahifa</button>
      </div>

      <div className="section">
        <div className="section-head"><h2>Javoblar tahlili</h2></div>
        <div className="seg" style={{ marginBottom: 12 }}>
          {[['all', 'Hammasi'], ['bad', 'Xatolar'], ['ok', 'To‘g‘rilari']].map(([v, l]) => <button key={v} aria-pressed={filter === v} onClick={() => setFilter(v)}>{l}</button>)}
        </div>
        <div className="stack">
          {rev.map((r, i) => (
            <div key={r.question.id} className={'rev ' + (r.points >= 0.999 ? 'ok' : r.points > 0 ? 'half' : 'bad')}>
              <p className="small muted" style={{ marginBottom: 6 }}>{(result.review.indexOf(r)) + 1}-savol · {r.points >= 0.999 ? 'to‘g‘ri' : r.points > 0 ? 'qisman' : r.given == null ? 'javob berilmagan' : 'xato'}</p>
              <Question q={r.question} value={r.given} locked compact reveal={{ answer: r.answer }} />
              {r.question.qtype === 'mc' && <p className="small" style={{ marginTop: 8 }}>To‘g‘ri javob: <b>{answerText({ ...r.question, answer: r.answer })}</b></p>}
              {r.explanation && <p className="math" style={{ marginTop: 6 }}>{r.explanation}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
