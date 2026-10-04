import React, { useMemo, useState } from 'react';
import { FORMULAS, CONSTANTS } from '../data/formulas.js';
import { Back } from '../components/ui.jsx';

export default function Formulas({ me, catalog, back }) {
  const [grade, setGrade] = useState(me.role_type === 'student' ? me.grade : 0);
  const [q, setQ] = useState('');
  const titles = Object.fromEntries((catalog?.topics || []).map(t => [t.id, t.title]));
  const list = useMemo(() => FORMULAS.filter(f => (!grade || f.g === grade) && (!q || (f.name + f.f + f.v).toLowerCase().includes(q.toLowerCase()))), [grade, q]);
  const groups = list.reduce((m, f) => { (m[f.t] = m[f.t] || []).push(f); return m; }, {});
  return (
    <div className="page">
      <Back onClick={back} title="Formulalar va doimiylar" />
      <p className="muted">Darsliklardagi asosiy formulalar sinflar bo‘yicha. Marker bilan belgilanganini yod oling.</p>
      <div className="gradepick" style={{ gridTemplateColumns: 'repeat(7, 1fr)', marginTop: 14 }}>
        <button aria-pressed={grade === 0} onClick={() => setGrade(0)} style={{ fontSize: 14 }}>Hammasi</button>
        {[6, 7, 8, 9, 10, 11].map(g => <button key={g} aria-pressed={grade === g} onClick={() => setGrade(g)}>{g}</button>)}
      </div>
      <input className="input" style={{ marginTop: 12 }} placeholder="Qidirish: masalan, bosim yoki T = 2π" value={q} onChange={e => setQ(e.target.value)} aria-label="Formulalarni qidirish" />
      {Object.entries(groups).map(([t, fs]) => (
        <div className="section" key={t}>
          <h3 style={{ marginBottom: 10 }}>{titles[t] || t}</h3>
          <div className="grid2">
            {fs.map(f => (
              <div className="fcard" key={f.id}>
                <span className="fn">{f.name}</span>
                <span className="ff"><span>{f.f}</span></span>
                <span className="fv">{[f.v, f.u && `birligi: ${f.u}`].filter(Boolean).join(' · ')}{!grade ? ` · ${f.g}-sinf` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {!list.length && <p className="muted section">Hech narsa topilmadi.</p>}
      <div className="section">
        <h3 style={{ marginBottom: 10 }}>Fizik doimiylar</h3>
        <table className="t sheet flat" style={{ padding: 0 }}>
          <tbody>{CONSTANTS.map(([n, v]) => <tr key={n}><td>{n}</td><td className="math" style={{ fontSize: 17 }}>{v}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
