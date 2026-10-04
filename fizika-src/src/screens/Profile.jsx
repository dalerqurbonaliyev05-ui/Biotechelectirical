import React, { useState } from 'react';
import { api } from '../lib/api.js';
import { Icon, Modal, Seg, Spinner, useAsync, useToast, fmt } from '../components/ui.jsx';
import { levelOf, MODE_TITLES } from '../data/meta.js';
import { schoolGrade } from './Results.jsx';

export default function Profile({ me, refresh, onEdit, onSignOut, initialTab, theme, setTheme }) {
  const toast = useToast();
  const [tab, setTab] = useState(initialTab || 'badges');
  const [cert, setCert] = useState(false);
  const rw = useAsync(() => api.rewards(), []);
  const hist = useAsync(() => (tab === 'history' ? api.history(30) : Promise.resolve([])), [tab]);
  const lv = levelOf(me.xp);
  const owned = new Set(me.rewards || []);
  const st = me.stats || {};
  const acc = st.answered ? Math.round((100 * st.correct) / st.answered) : 0;
  const rewards = (rw.data || []).filter(r => r.audience === 'all' || !r.audience || r.audience === me.role_type);

  async function buy(r) {
    try { await api.claimReward(r.id); toast(`${r.title} sizniki!`); await refresh(); } catch (e) { toast(e.message); }
  }
  async function useAvatar(icon) { try { await api.setAvatar(icon); await refresh(); toast('Avatar o‘zgardi'); } catch (e) { toast(e.message); } }

  return (
    <div className="page">
      <div className="topbar">
        <h1>Profil</h1>
        <button className="iconbtn" aria-label="Mavzuni almashtirish" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Icon.sun /> : <Icon.moon />}</button>
      </div>
      <div className="sheet">
        <div className="row">
          <span style={{ fontSize: 46 }} aria-hidden="true">{me.avatar}</span>
          <div className="grow">
            <h2>{me.full_name}</h2>
            <p className="muted small">{me.role_type === 'student' ? `${me.grade}-sinf o‘quvchisi` : 'Abituriyent'} · {me.region}{me.school ? ` · ${me.school}` : ''}</p>
          </div>
          <button className="btn ghost small" onClick={onEdit}>Tahrirlash</button>
        </div>
        <div className="xpbar" style={{ marginTop: 14 }}><i style={{ width: `${lv.pct * 100}%` }} /></div>
        <p className="small muted" style={{ marginTop: 6 }}>{lv.n}-daraja «{lv.name}» · {fmt(me.xp)} XP · keyingisiga {fmt(lv.next - me.xp)} XP</p>
      </div>
      <div className="stats section" style={{ marginTop: 14 }}>
        <div className="stat"><b>{st.tests || 0}</b><span>test yechildi</span></div>
        <div className="stat"><b>{acc}%</b><span>aniqlik</span></div>
        <div className="stat"><b>{me.best_streak || 0}</b><span>eng uzun seriya</span></div>
      </div>

      <div className="section">
        <Seg value={tab} onChange={setTab} items={[['badges', 'Nishonlar'], ['shop', `Sovg‘alar · 🪙${me.coins}`], ['history', 'Tarix']]} />
      </div>

      {tab === 'badges' && (rw.loading ? <Spinner /> : (
        <div className="badges" style={{ marginTop: 14 }}>
          {rewards.filter(r => r.kind === 'badge').map(r => (
            <div key={r.id} className={'badge' + (owned.has(r.id) ? ' on' : '')} title={r.description}>
              <div className="bi">{r.icon}</div><div className="bt">{r.title}</div><div className="bd">{r.description}</div>
            </div>
          ))}
        </div>
      ))}

      {tab === 'shop' && (
        <div className="stack" style={{ marginTop: 14 }}>
          <p className="muted small">Tangalar har bir to‘g‘ri javob, xatosiz test va kunlik test uchun beriladi.</p>
          {rewards.filter(r => r.kind !== 'badge').map(r => {
            const have = owned.has(r.id);
            return (
              <div key={r.id} className="topic" style={{ cursor: 'default' }}>
                <span className="ti" style={{ fontStyle: 'normal', fontSize: 24 }}>{r.icon}</span>
                <span><span className="tn">{r.title}</span><br /><span className="tc">{r.description}</span></span>
                {have ? (
                  r.kind === 'avatar' ? <button className="btn ghost small" disabled={me.avatar === r.icon} onClick={() => useAvatar(r.icon)}>{me.avatar === r.icon ? 'Tanlangan' : 'Tanlash'}</button>
                    : r.kind === 'gift' ? <button className="btn ghost small" onClick={() => setCert(true)}>Ochish</button> : <span className="tag green">Sizda</span>
                ) : <button className="btn small" disabled={me.coins < r.cost_coins} onClick={() => buy(r)}>🪙 {r.cost_coins}</button>}
              </div>
            );
          })}
          {me.avatar !== '⚛️' && <button className="btn ghost small" onClick={() => useAvatar('⚛️')}>Standart avatarga qaytish ⚛️</button>}
        </div>
      )}

      {tab === 'history' && (hist.loading ? <Spinner /> : (
        <div className="stack tight" style={{ marginTop: 14 }}>
          {(hist.data || []).map(a => (
            <div key={a.id} className="topic" style={{ cursor: 'default' }}>
              <span className="ti hand" style={{ fontStyle: 'normal', color: 'var(--red)', fontSize: 28 }}>{schoolGrade(+a.score)}</span>
              <span><span className="tn">{a.title || MODE_TITLES[a.mode]}</span><br /><span className="tc">{new Date(a.started_at).toLocaleString('uz-UZ')} · {a.correct}/{a.total}{a.meta?.milliy_ball != null ? ` · ${a.meta.milliy_ball} ball` : ''}</span></span>
              <span className="tc">+{a.xp_earned} XP</span>
            </div>
          ))}
          {!hist.data?.length && <div className="empty"><p className="muted">Hali test yechilmagan. Bosh sahifadan kunlik testni boshlang.</p></div>}
        </div>
      ))}

      <hr className="rule" />
      <div className="stack">
        {me.is_admin && <a className="btn ghost block" href="admin.html">Admin panelni ochish</a>}
        <button className="btn ghost block" onClick={onSignOut}>Hisobdan chiqish</button>
      </div>

      {cert && (
        <Modal onClose={() => setCert(false)} label="Faxriy yorliq">
          <div className="cert">
            <p style={{ fontSize: 14, letterSpacing: 2 }}>FIZIKA ILOVASI</p>
            <h2 style={{ fontFamily: 'var(--f-math)', fontSize: 34, margin: '10px 0' }}>Faxriy yorliq</h2>
            <p>bilan taqdirlanadi</p>
            <p style={{ fontSize: 28, fontStyle: 'italic', margin: '14px 0' }}>{me.full_name}</p>
            <p>{me.role_type === 'student' ? `${me.grade}-sinf o‘quvchisi` : 'abituriyent'}, {me.region}</p>
            <p style={{ marginTop: 12 }}>Fizika fanini o‘rganishdagi tirishqoqligi va {fmt(me.xp)} XP natijasi uchun.</p>
            <p style={{ marginTop: 18, fontSize: 13 }}>{new Date().toLocaleDateString('uz-UZ')}</p>
          </div>
          <button className="btn block" style={{ marginTop: 14 }} onClick={() => window.print()}>Chop etish yoki PDF saqlash</button>
        </Modal>
      )}
    </div>
  );
}
