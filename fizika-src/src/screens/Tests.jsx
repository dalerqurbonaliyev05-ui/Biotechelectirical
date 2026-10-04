import React, { useState } from 'react';
import { Back, Seg, fmt } from '../components/ui.jsx';
import { TopBar, topicSym } from './Home.jsx';
import { EXAM_TITLES } from '../data/meta.js';

export function Tests({ me, catalog, go }) {
  const [grade, setGrade] = useState(me.grade || 11);
  const [size, setSize] = useState(20);
  const byGrade = catalog?.by_grade || {};
  const topics = (catalog?.topics || []).map(t => ({ ...t, count: catalog?.tg?.[t.id + ':' + grade] || 0 })).filter(t => t.count > 0);
  return (
    <div className="page">
      <TopBar me={me} />
      <h1>Testlar</h1>
      <p className="muted" style={{ marginTop: 6 }}>Jami {fmt(catalog?.total)} ta savol: darsliklar, milliy sertifikat va Usmonov to‘plamlari asosida.</p>

      <div className="section">
        <div className="section-head"><h2>Sinf bo‘yicha</h2></div>
        <div className="gradepick" role="group" aria-label="Sinf">
          {[6, 7, 8, 9, 10, 11].map(g => <button key={g} aria-pressed={grade === g} onClick={() => setGrade(g)}>{g}</button>)}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <Seg value={size} onChange={setSize} items={[[10, '10 ta'], [20, '20 ta'], [30, '30 ta']]} />
        </div>
        <button className="btn block" style={{ marginTop: 12 }} onClick={() => go('run', { mode: 'grade_test', size, grade })}>
          {grade}-sinf testini boshlash · {fmt(byGrade[grade])} savoldan
        </button>
        <div className="stack tight" style={{ marginTop: 14 }}>
          {topics.map(t => (
            <button key={t.id} className="topic" onClick={() => go('run', { mode: 'grade_test', size, grade, topic: t.id })}>
              <span className="ti">{topicSym(t.id)}</span><span className="tn">{t.title}</span><span className="tc">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h2>Abituriyent variantlari</h2></div>
        <p className="muted small" style={{ marginBottom: 10 }}>Oliy o‘quv yurtlariga kiruvchilar uchun aralash variantlar.</p>
        <div className="grid3">
          {[20, 30, 50].map(n => <button key={n} className="tile" onClick={() => go('run', { mode: 'abit_test', size: n })}><span className="big">{n}</span><span className="tt">talik variant</span></button>)}
        </div>
      </div>

      <div className="section">
        <div className="grid2">
          <button className="tile" onClick={() => go('run', { mode: 'daily' })}><span className="big">↗</span><span className="tt">Kunlik test</span><span className="ts">Osondan qiyinga, 20 savol</span></button>
          <button className="tile" onClick={() => go('run', { mode: 'open', size: 10, grade: me.role_type === 'student' ? me.grade : undefined })}><span className="big">✎</span><span className="tt">Javobini o‘zi yozadigan</span><span className="ts">Variantsiz, son bilan javob</span></button>
          <button className="tile wide pen" onClick={() => go('milliy')}><span className="tt">Milliy sertifikatga tayyorgarlik</span><span className="ts">45 topshiriq · 150 daqiqa · haqiqiy imtihon savollari</span></button>
        </div>
      </div>
    </div>
  );
}

export function Milliy({ me, catalog, go, back }) {
  const exams = catalog?.exams || [];
  return (
    <div className="page">
      <Back onClick={back} title="Milliy sertifikat" />
      <div className="sheet">
        <h3>Imtihon tuzilishi</h3>
        <table className="t" style={{ marginTop: 8 }}>
          <tbody>
            <tr><td><b>1–32</b></td><td>Yopiq test: 4 ta javobdan bittasini tanlash</td></tr>
            <tr><td><b>33–35</b></td><td>Moslashtirish: topshiriqlarni A–F javoblar bilan juftlash</td></tr>
            <tr><td><b>36–45</b></td><td>Ochiq topshiriq: a) va b) qismlarga javobni o‘zingiz yozasiz</td></tr>
            <tr><td><b>Vaqt</b></td><td>150 daqiqa. Javoblar oxirida tekshiriladi</td></tr>
          </tbody>
        </table>
        <p className="small muted" style={{ marginTop: 10 }}>Natija oxirida taxminiy ball (75 dan) va daraja (A+ … C) ko‘rsatiladi.</p>
      </div>

      <div className="section">
        <button className="btn block" onClick={() => go('run', { mode: 'milliy' })}>Sinov variantini boshlash (aralash 45 topshiriq)</button>
      </div>

      <div className="section">
        <div className="section-head"><h2>Haqiqiy imtihon savollari</h2></div>
        <div className="stack tight">
          {exams.map(e => (
            <button key={e} className="topic" onClick={() => go('run', { mode: 'milliy', exam_tag: e })}>
              <span className="ti">📜</span><span className="tn">{EXAM_TITLES[e] || e}</span><span className="tc">to‘liq variant</span>
            </button>
          ))}
          {!exams.length && <p className="muted">Hozircha imtihon savollari yuklanmagan.</p>}
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h2>Bo‘limlar bo‘yicha mashq</h2></div>
        <div className="stack tight">
          {(catalog?.topics || []).filter(t => t.count > 20).map(t => (
            <button key={t.id} className="topic" onClick={() => go('run', { mode: 'topic', size: 20, topic: t.id })}>
              <span className="ti">{topicSym(t.id)}</span><span className="tn">{t.title}</span><span className="tc">{t.count}</span>
            </button>
          ))}
        </div>
      </div>
      {me.role_type === 'student' && me.grade < 9 && <p className="notice section">Bu savollar asosan 9–11-sinf dasturi bo‘yicha. Hozircha o‘z sinfingiz testlaridan boshlash tavsiya etiladi.</p>}
    </div>
  );
}
