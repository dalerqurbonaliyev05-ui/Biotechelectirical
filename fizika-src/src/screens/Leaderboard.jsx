import React, { useState } from 'react';
import { api, isDemo } from '../lib/api.js';
import { Seg, Spinner, useAsync, fmt } from '../components/ui.jsx';
import { TopBar } from './Home.jsx';

export default function Leaderboard({ me }) {
  const [scope, setScope] = useState('uz');
  const [period, setPeriod] = useState('all');
  const [who, setWho] = useState(me.role_type === 'student' ? 'grade' : 'role');
  const args = { scope: scope === 'regions' ? 'uz' : scope, region: me.region, period, limit: 50,
    role: who === 'all' ? null : me.role_type, grade: who === 'grade' && me.role_type === 'student' ? me.grade : null };
  const lb = useAsync(() => (scope === 'regions' ? api.regionStats(who === 'all' ? null : me.role_type) : api.leaderboard(args)), [scope, period, who]);
  const rows = lb.data || [];
  const myRow = scope !== 'regions' ? rows.find(r => r.is_me) : null;

  return (
    <div className="page">
      <TopBar me={me} />
      <h1>Reyting</h1>
      <p className="muted" style={{ marginTop: 6 }}>XP — to‘g‘ri javoblar, kunlik testlar va o‘yinlardan yig‘iladi.</p>
      <div className="stack" style={{ marginTop: 16 }}>
        <Seg value={scope} onChange={setScope} items={[['uz', 'O‘zbekiston'], ['region', 'Viloyatim'], ['regions', 'Viloyatlar']]} />
        <div className="row wrap">
          {scope !== 'regions' && <Seg value={period} onChange={setPeriod} items={[['all', 'Umumiy'], ['week', 'Shu hafta']]} />}
          <Seg value={who} onChange={setWho} items={me.role_type === 'student'
            ? [['grade', `${me.grade}-sinflar`], ['role', 'O‘quvchilar'], ['all', 'Hamma']]
            : [['role', 'Abituriyentlar'], ['all', 'Hamma']]} />
        </div>
      </div>

      {myRow && (
        <div className="sheet section" style={{ marginTop: 16 }}>
          <p className="muted small">{scope === 'region' ? me.region : 'O‘zbekiston bo‘yicha'} sizning o‘rningiz</p>
          <p style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}><span className="hand" style={{ color: 'var(--red)', fontSize: 52 }}>{myRow.rank}</span>-o‘rin</p>
          <p className="small muted">{fmt(myRow.xp)} XP{period === 'week' ? ' shu haftada' : ''}</p>
        </div>
      )}

      <div className="section">
        {lb.loading ? <Spinner /> : lb.error ? <p className="err">{lb.error.message}</p> : scope === 'regions' ? (
          <div className="lb">
            {rows.map((r, i) => {
              const max = Math.max(...rows.map(x => +x.avg_xp || 0), 1);
              return (
                <div key={r.region} className={'lbrow' + (r.region === me.region ? ' me' : '')} style={{ gridTemplateColumns: '40px 1fr auto' }}>
                  <span className={'rk' + (i < 3 ? ' top' : '')}>{i + 1}</span>
                  <span className="grow"><span className="nm">{r.region}</span><div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${(100 * r.avg_xp) / max}%` }} /></div>
                    <span className="sub">{r.users} ta foydalanuvchi</span></span>
                  <span className="xp">{fmt(Math.round(r.avg_xp))}<span className="sub"> o‘rt. XP</span></span>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {rows.length >= 3 && (
              <div className="podium" aria-label="Eng yaxshi uchtalik">
                {[rows[1], rows[0], rows[2]].map((r, i) => (
                  <div key={r.user_id} className={i === 1 ? 'p1' : ''}>
                    <div className="pl">{r.rank}</div><div className="em">{r.avatar}</div><div className="n">{r.full_name}</div><div className="sub small muted">{fmt(r.xp)} XP</div>
                  </div>
                ))}
              </div>
            )}
            <div className="lb">
              {rows.map(r => (
                <div key={r.user_id} className={'lbrow' + (r.is_me ? ' me' : '')}>
                  <span className={'rk' + (r.rank <= 3 ? ' top' : '')}>{r.rank}</span>
                  <span className="av">{r.avatar}</span>
                  <span style={{ minWidth: 0 }}><div className="nm">{r.full_name}{r.is_me ? ' (siz)' : ''}</div>
                    <div className="sub">{r.region}{r.role_type === 'student' && r.grade ? ` · ${r.grade}-sinf` : r.role_type === 'abiturient' ? ' · abituriyent' : ''}</div></span>
                  <span className="xp">{fmt(r.xp)}</span>
                </div>
              ))}
              {!rows.length && <div className="empty"><p className="muted">Bu bo‘limda hali hech kim yo‘q. Birinchi bo‘ling — test yeching!</p></div>}
            </div>
          </>
        )}
        {isDemo && <p className="small muted" style={{ marginTop: 12 }}>Demo rejimda reytingda namuna foydalanuvchilar ko‘rsatiladi.</p>}
      </div>
    </div>
  );
}
