import React, { useMemo } from 'react';
import { Atom, Logo, fmt } from '../components/ui.jsx';
import { levelOf } from '../data/meta.js';
import { FORMULAS } from '../data/formulas.js';

const SYM = { olchash: 'l', modda: 'ρ', kinematika: 'v', dinamika: 'F', saqlanish: 'E', statika: 'M', gidro: 'p', tebranish: 'ν', molekulyar: 'n',
  termodinamika: 'Q', suyuq_qattiq: 'σ', elektrostatika: 'q', tok: 'I', muhit_tok: 'e⁻', magnit: 'B', induksiya: 'ℰ', ozgaruvchan_tok: '~',
  optika: 'D', tolqin_optika: 'λ', nisbiylik: 'c', kvant: 'hν', yadro: 'α' };
export const topicSym = id => SYM[id] || '∑';

export function TopBar({ me }) {
  return (
    <div className="topbar">
      <span className="brand"><Logo /> Fizika</span>
      <div className="chips">
        <span className="chip" title="Ketma-ket kunlar"><span className="ic">🔥</span>{me.streak || 0}</span>
        <span className="chip" title="Tangalar"><span className="ic">🪙</span>{fmt(me.coins)}</span>
      </div>
    </div>
  );
}

function Hero({ me }) {
  const lv = levelOf(me.xp);
  const first = (me.full_name || '').split(' ')[0];
  return (
    <div className="hero">
      <Atom level={lv.n} />
      <div className="stack tight">
        <h1>Salom, {first}!</h1>
        <p className="muted">{lv.n}-daraja · {lv.name}{me.role_type === 'student' ? ` · ${me.grade}-sinf` : ' · abituriyent'}</p>
        <div className="xpbar" aria-label="Keyingi darajagacha"><i style={{ width: `${lv.pct * 100}%` }} /></div>
        <p className="small muted">{fmt(me.xp)} / {fmt(lv.next)} XP — keyingi daraja: {levelOf(lv.next).name}</p>
      </div>
    </div>
  );
}

function Daily({ me, go }) {
  const done = me.stats?.daily_today;
  return (
    <div className="sheet section">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <h2>Kunlik test</h2>
          <p className="muted small">{me.role_type === 'abiturient' ? '20 savol: eng osonidan eng qiyinigacha. Hamma uchun bir xil — kim ko‘proq yechadi?' : 'Bugun uchun 20 savol, osondan qiyinga qarab.'}</p>
        </div>
        {done && <span className="tag green">Bajarildi</span>}
      </div>
      <div className="ladder" aria-hidden="true">
        {[1, 2, 3, 4, 5].map(d => <span key={d} className={done ? 'done' : ''} style={{ height: `${20 + d * 15}%` }}>{d}</span>)}
      </div>
      <p className="small muted" style={{ marginBottom: 12 }}>1 — oson, 5 — eng qiyin. Har bosqichda 4 tadan savol.</p>
      <button className="btn block" onClick={() => go('run', { mode: 'daily' })}>{done ? 'Yana bir bor yechish' : 'Kunlik testni boshlash'} (+30 XP)</button>
    </div>
  );
}

function FormulaOfDay({ me, go }) {
  const f = useMemo(() => {
    const pool = FORMULAS.filter(x => me.role_type === 'abiturient' || x.g <= (me.grade || 11));
    const d = Math.floor(Date.now() / 864e5);
    return pool[d % pool.length];
  }, [me]);
  return (
    <button className="tile wide" onClick={() => go('formulas')} style={{ marginTop: 12 }}>
      <span className="ts">Bugungi formula · {f.g}-sinf</span>
      <span className="tt">{f.name}</span>
      <span className="big"><span className="mark">{f.f}</span></span>
      {f.v && <span className="ts">{f.v}</span>}
    </button>
  );
}

export default function Home({ me, catalog, go, announcements }) {
  const student = me.role_type === 'student';
  const topics = (catalog?.topics || []).map(t => (student ? { ...t, count: catalog?.tg?.[t.id + ':' + me.grade] || 0 } : t)).filter(t => !student || t.count > 0);
  return (
    <div className="page">
      <TopBar me={me} />
      <Hero me={me} />
      {announcements?.[0] && <div className="notice section" style={{ marginTop: 18 }}><b>{announcements[0].title}</b>{announcements[0].body ? ' — ' + announcements[0].body : ''}</div>}
      <Daily me={me} go={go} />

      {student ? (
        <>
          <div className="section">
            <div className="section-head"><h2>{me.grade}-sinf testlari</h2><button className="link" onClick={() => go('tests')}>Barcha testlar</button></div>
            <div className="grid2">
              <button className="tile pen" onClick={() => go('run', { mode: 'grade_test', size: 20, grade: me.grade })}><span className="big">20</span><span className="tt">savollik sinf testi</span><span className="ts">Darslik va to‘plamlardan aralash</span></button>
              <button className="tile" onClick={() => go('games')}><span className="big">⚗</span><span className="tt">Laboratoriya</span><span className="ts">Sxema yig‘ish, richag, linza, formulalar o‘yini</span></button>
              <button className="tile" onClick={() => go('milliy')}><span className="big">45</span><span className="tt">Milliy sertifikat</span><span className="ts">Haqiqiy imtihon savollari bilan tayyorlaning</span></button>
              <button className="tile" onClick={() => go('profile', { tab: 'shop' })}><span className="big">🎁</span><span className="tt">Sovg‘alar</span><span className="ts">Tangalarga avatar va unvonlar</span></button>
            </div>
            <FormulaOfDay me={me} go={go} />
          </div>
          <div className="section">
            <div className="section-head"><h2>Mavzular</h2></div>
            <div className="stack tight">
              {topics.map(t => (
                <button key={t.id} className="topic" onClick={() => go('run', { mode: 'grade_test', size: 15, grade: me.grade, topic: t.id })}>
                  <span className="ti">{topicSym(t.id)}</span>
                  <span><span className="tn">{t.title}</span><br /><span className="tc">{t.section}</span></span>
                  <span className="tc">{t.count} savol</span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="section">
            <div className="section-head"><h2>Variantlar</h2><button className="link" onClick={() => go('tests')}>Boshqa testlar</button></div>
            <div className="grid3">
              {[20, 30, 50].map(n => (
                <button key={n} className={'tile' + (n === 30 ? ' pen' : '')} onClick={() => go('run', { mode: 'abit_test', size: n })}>
                  <span className="big">{n}</span><span className="tt">talik</span><span className="ts">{n === 20 ? '≈ 30 daqiqa' : n === 30 ? '≈ 45 daqiqa' : '≈ 75 daqiqa'}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="section">
            <div className="grid2">
              <button className="tile" onClick={() => go('milliy')}><span className="big">45</span><span className="tt">Milliy sertifikat</span><span className="ts">6 ta haqiqiy imtihon + sinov varianti, 150 daqiqa</span></button>
              <button className="tile" onClick={() => go('run', { mode: 'open', size: 10 })}><span className="big">✎</span><span className="tt">Javobini o‘zi yozadigan</span><span className="ts">{fmt(catalog?.open_count)} ta masala</span></button>
            </div>
            <FormulaOfDay me={me} go={go} />
          </div>
          <div className="section">
            <div className="section-head"><h2>Mavzular bo‘yicha</h2></div>
            <div className="stack tight">
              {topics.filter(t => t.count > 0).map(t => (
                <button key={t.id} className="topic" onClick={() => go('run', { mode: 'topic', size: 20, topic: t.id })}>
                  <span className="ti">{topicSym(t.id)}</span>
                  <span><span className="tn">{t.title}</span><br /><span className="tc">{t.section}</span></span>
                  <span className="tc">{t.count} savol</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
