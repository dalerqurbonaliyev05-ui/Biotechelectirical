import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import './admin.css';
import { api, isDemo, asset } from '../lib/api.js';
import { Icon, Logo, Modal, Spinner, ToastProvider, useAsync, useToast, fmt } from '../components/ui.jsx';
import Question from '../components/Question.jsx';
import { SOURCE_TITLES, REGIONS } from '../data/meta.js';
import { answerText } from '../lib/grading.js';

const TABS = [['stats', 'Statistika'], ['questions', 'Savollar'], ['seed', 'Bazani yuklash'], ['reports', 'Xatolik xabarlari'], ['users', 'Foydalanuvchilar'], ['rewards', 'Sovg‘alar'], ['ann', 'E’lonlar']];

function Bars({ data, label }) {
  const e = Object.entries(data || {}).sort((a, b) => (isNaN(a[0]) ? b[1] - a[1] : a[0] - b[0]));
  const max = Math.max(1, ...e.map(x => x[1]));
  return (
    <div className="stack tight">
      {e.map(([k, v]) => (
        <div key={k} className="abar"><span>{label ? label(k) : k}</span><div className="bar"><i style={{ width: `${(100 * v) / max}%` }} /></div><b>{v}</b></div>
      ))}
      {!e.length && <p className="muted small">Ma’lumot yo‘q</p>}
    </div>
  );
}

function Stats() {
  const s = useAsync(() => api.admin.stats(), []);
  if (s.loading) return <Spinner />;
  if (s.error) return <p className="err">{s.error.message}</p>;
  const d = s.data;
  return (
    <div className="stack">
      <div className="kpis">
        {[['Foydalanuvchilar', d.users], ['O‘quvchilar', d.students], ['Abituriyentlar', d.abiturients], ['Bugun faol', d.active_today],
          ['Savollar', d.questions], ['Tekshirilmagan', d.unverified], ['Yechilgan testlar', d.attempts], ['Yangi xabarlar', d.reports_new]].map(([l, v]) => (
          <div className="stat" key={l}><b>{fmt(v)}</b><span>{l}</span></div>
        ))}
      </div>
      <div className="grid2">
        <div className="sheet"><h3>Sinflar bo‘yicha</h3><div style={{ marginTop: 10 }}><Bars data={d.by_grade} label={k => k + '-sinf'} /></div></div>
        <div className="sheet"><h3>So‘nggi 7 kun testlari</h3><div style={{ marginTop: 10 }}><Bars data={d.attempts_7d} /></div></div>
      </div>
      <div className="sheet"><h3>Viloyatlar bo‘yicha</h3><div style={{ marginTop: 10 }}><Bars data={d.by_region} /></div></div>
      <div className="sheet"><h3>Eng qiyin savollar</h3>
        <table className="t" style={{ marginTop: 8 }}><thead><tr><th>#</th><th>Savol</th><th>Javoblar</th><th>To‘g‘ri</th></tr></thead>
          <tbody>{(d.hardest || []).map(h => <tr key={h.id}><td>{h.id}</td><td>{h.stem}</td><td>{h.n}</td><td>{h.pct}%</td></tr>)}</tbody></table>
        {!d.hardest?.length && <p className="muted small">Hali yetarli javoblar yo‘q.</p>}
      </div>
    </div>
  );
}

const EMPTY = { qtype: 'mc', stem: '', options: { A: '', B: '', C: '', D: '' }, answer: 'A', topic: 'kinematika', grades: [], audience: ['student', 'abiturient'], difficulty: 2, verified: true, explanation: '' };

function QEditor({ q, topics, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(() => JSON.parse(JSON.stringify(q || EMPTY)));
  const [answerJson, setAnswerJson] = useState(() => (typeof f.answer === 'string' ? f.answer : JSON.stringify(f.answer)));
  const set = (k, v) => setF(o => ({ ...o, [k]: v }));
  async function save() {
    let answer = answerJson.trim();
    if (f.qtype !== 'mc') { try { answer = JSON.parse(answerJson); } catch { return toast('Javob JSON formatida bo‘lishi kerak'); } }
    try { const r = await api.admin.saveQuestion({ ...f, answer }); toast('Saqlandi'); onSaved(r); } catch (e) { toast(e.message); }
  }
  return (
    <Modal onClose={onClose} label="Savolni tahrirlash">
      <div className="stack">
        <h2>{f.id ? `Savol #${f.id}` : 'Yangi savol'}</h2>
        <div className="grid2">
          <div className="field"><label>Turi</label><select className="input" value={f.qtype} onChange={e => set('qtype', e.target.value)}>
            <option value="mc">Variantli (A–D)</option><option value="open">Ochiq (javobni yozadi)</option><option value="open2">Ochiq a) b)</option><option value="matching">Moslashtirish</option></select></div>
          <div className="field"><label>Mavzu</label><select className="input" value={f.topic || ''} onChange={e => set('topic', e.target.value)}>{topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
        </div>
        <div className="field"><label>Savol matni</label><textarea className="input" value={f.stem} onChange={e => set('stem', e.target.value)} /></div>
        {(f.qtype === 'mc' || f.qtype === 'matching') && (
          <div className="grid2">{Object.keys(f.options || {}).map(k => (
            <div className="field" key={k}><label>{k})</label><input className="input" value={f.options[k]} onChange={e => set('options', { ...f.options, [k]: e.target.value })} /></div>
          ))}</div>
        )}
        <div className="field"><label>To‘g‘ri javob {f.qtype === 'mc' ? '(harf)' : '(JSON: {"parts":[{"text":"12","num":12}]})'}</label>
          <input className="input" value={answerJson} onChange={e => setAnswerJson(e.target.value)} /></div>
        <div className="field"><label>Izoh / yechim (ixtiyoriy)</label><textarea className="input" value={f.explanation || ''} onChange={e => set('explanation', e.target.value)} /></div>
        <div className="grid2">
          <div className="field"><label>Sinflar (vergul bilan)</label><input className="input" value={(f.grades || []).join(',')} onChange={e => set('grades', e.target.value.split(',').map(x => +x.trim()).filter(Boolean))} /></div>
          <div className="field"><label>Qiyinlik (1–5)</label><input className="input" type="number" min="1" max="5" value={f.difficulty} onChange={e => set('difficulty', +e.target.value)} /></div>
        </div>
        <div className="row wrap">
          <label className="row small"><input type="checkbox" checked={(f.audience || []).includes('student')} onChange={e => set('audience', e.target.checked ? [...new Set([...(f.audience || []), 'student'])] : f.audience.filter(a => a !== 'student'))} /> O‘quvchilar</label>
          <label className="row small"><input type="checkbox" checked={(f.audience || []).includes('abiturient')} onChange={e => set('audience', e.target.checked ? [...new Set([...(f.audience || []), 'abiturient'])] : f.audience.filter(a => a !== 'abiturient'))} /> Abituriyentlar</label>
          <label className="row small"><input type="checkbox" checked={!!f.verified} onChange={e => set('verified', e.target.checked)} /> Tekshirilgan</label>
          <label className="row small"><input type="checkbox" checked={f.active !== false} onChange={e => set('active', e.target.checked)} /> Faol</label>
        </div>
        <div className="field"><label>Rasm manzili (ixtiyoriy, masalan fig/rasm.png yoki to‘liq URL)</label><input className="input" value={f.figure || ''} onChange={e => set('figure', e.target.value || null)} /></div>
        {f.full_image && <div className="qimg"><img src={asset(f.full_image)} alt="" /></div>}
        <div className="row"><button className="btn grow" onClick={save}>Saqlash</button><button className="btn ghost" onClick={onClose}>Yopish</button></div>
      </div>
    </Modal>
  );
}

function Questions() {
  const toast = useToast();
  const cat = useAsync(() => api.catalog(), []);
  const [flt, setFlt] = useState({ search: '', topic: '', source: '', verified: '', qtype: '', page: 0 });
  const list = useAsync(() => api.admin.listQuestions({ ...flt, topic: flt.topic || undefined, source: flt.source || undefined, qtype: flt.qtype || undefined }), [JSON.stringify(flt)]);
  const [edit, setEdit] = useState(null);
  const [view, setView] = useState(null);
  const topics = cat.data?.topics || [];
  const set = (k, v) => setFlt(o => ({ ...o, [k]: v, page: k === 'page' ? v : 0 }));
  async function verify(q, v) { try { await api.admin.saveQuestion({ id: q.id, verified: v }); list.reload(); } catch (e) { toast(e.message); } }
  const [armed, setArmed] = useState(null);
  async function del(q) {
    if (armed !== q.id) { setArmed(q.id); toast('O‘chirish uchun yana bir marta bosing'); return; }
    setArmed(null);
    try { await api.admin.deleteQuestion(q.id); list.reload(); toast('O‘chirildi'); } catch (e) { toast(e.message); }
  }
  const pages = Math.ceil((list.data?.total || 0) / 30);
  return (
    <div className="stack">
      <div className="filters">
        <input className="input" placeholder="Matn yoki # bo‘yicha qidirish" value={flt.search} onChange={e => set('search', e.target.value)} />
        <select className="input" value={flt.topic} onChange={e => set('topic', e.target.value)}><option value="">Barcha mavzular</option>{topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
        <select className="input" value={flt.source} onChange={e => set('source', e.target.value)}><option value="">Barcha manbalar</option>{Object.entries(SOURCE_TITLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input" value={flt.qtype} onChange={e => set('qtype', e.target.value)}><option value="">Barcha turlar</option><option value="mc">Variantli</option><option value="open">Ochiq</option><option value="open2">Ochiq a/b</option><option value="matching">Moslashtirish</option></select>
        <select className="input" value={flt.verified} onChange={e => set('verified', e.target.value)}><option value="">Hammasi</option><option value="no">Tekshirilmagan</option><option value="yes">Tekshirilgan</option></select>
        <button className="btn" onClick={() => setEdit(EMPTY)}>+ Yangi savol</button>
      </div>
      {list.loading ? <Spinner /> : list.error ? <p className="err">{list.error.message}</p> : (
        <>
          <p className="small muted">Topildi: {fmt(list.data.total)}</p>
          <table className="t sheet flat" style={{ padding: 0 }}>
            <thead><tr><th>#</th><th>Savol</th><th>Javob</th><th>Mavzu</th><th>Manba</th><th></th></tr></thead>
            <tbody>{list.data.rows.map(q => (
              <tr key={q.id}>
                <td>{q.id}<br /><span className="tag">{q.qtype}</span> <span className="tag y">{q.difficulty}</span></td>
                <td style={{ maxWidth: 460 }}><button className="linkish" onClick={() => setView(q)}>{(q.stem || '').slice(0, 180)}{q.full_image || q.figure ? ' 🖼' : ''}</button></td>
                <td><b>{answerText(q).slice(0, 40)}</b></td>
                <td className="small">{q.topic}<br />{(q.grades || []).join(', ')}</td>
                <td className="small">{SOURCE_TITLES[q.source] || q.source}<br />{q.verified ? <span className="tag green">tekshirilgan</span> : <span className="tag red">tekshirilmagan</span>}</td>
                <td><div className="row wrap" style={{ gap: 6 }}>
                  <button className="btn small ghost" onClick={() => setEdit(q)}>Tahrirlash</button>
                  {!q.verified ? <button className="btn small green" onClick={() => verify(q, true)}>Tasdiqlash</button> : <button className="btn small ghost" onClick={() => verify(q, false)}>Bekor</button>}
                  <button className="btn small red" onClick={() => del(q)}>{armed === q.id ? 'Tasdiqlash' : 'O‘chirish'}</button>
                </div></td>
              </tr>))}</tbody>
          </table>
          <div className="row"><button className="btn ghost small" disabled={flt.page === 0} onClick={() => set('page', flt.page - 1)}>Oldingi</button>
            <span className="small">{flt.page + 1} / {pages || 1}</span>
            <button className="btn ghost small" disabled={flt.page + 1 >= pages} onClick={() => set('page', flt.page + 1)}>Keyingi</button></div>
        </>
      )}
      {edit && <QEditor q={edit} topics={topics} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); list.reload(); }} />}
      {view && <Modal onClose={() => setView(null)} label="Savol"><Question q={view} reveal={{ answer: view.answer }} locked value={view.qtype === 'mc' ? view.answer : null} />{view.explanation && <p className="math" style={{ marginTop: 10 }}>{view.explanation}</p>}<p className="small muted" style={{ marginTop: 10 }}>{view.source_ref}</p></Modal>}
    </div>
  );
}

function Seed() {
  const toast = useToast();
  const st = useAsync(() => api.admin.seedStatus(), []);
  const [prog, setProg] = useState(null);
  const [file, setFile] = useState(null);
  async function seed() {
    setProg({ done: 0, total: 1 });
    try { const r = await api.admin.seed((done, total) => setProg({ done, total })); toast(r.note || `Yuklandi: ${r.count} ta savol`); st.reload(); } catch (e) { toast(e.message); }
    setProg(null);
  }
  async function importFile() {
    try {
      const txt = await file.text();
      let rows;
      if (file.name.endsWith('.csv')) {
        const lines = txt.split(/\r?\n/).filter(Boolean); const head = lines.shift().split(';');
        rows = lines.map(l => { const c = l.split(';'); const o = Object.fromEntries(head.map((h, i) => [h.trim(), c[i]?.trim()]));
          return { ext_id: o.ext_id || undefined, qtype: 'mc', stem: o.stem, options: { A: o.A, B: o.B, C: o.C, D: o.D }, answer: (o.answer || 'A').toUpperCase(), topic: o.topic, grades: (o.grades || '').split(',').map(Number).filter(Boolean), audience: (o.audience || 'student,abiturient').split(','), difficulty: +o.difficulty || 2, explanation: o.explanation || null, verified: true, source: 'admin' }; });
      } else { const j = JSON.parse(txt); rows = Array.isArray(j) ? j : j.questions; }
      const n = await api.admin.importRows(rows);
      toast(`Import qilindi: ${n} ta`); st.reload();
    } catch (e) { toast('Xato: ' + e.message); }
  }
  return (
    <div className="stack">
      <div className="sheet stack">
        <h3>Boshlang‘ich savollar bazasi</h3>
        <p className="muted">Kitoblardan tayyorlangan baza: milliy sertifikat to‘plami (6 ta haqiqiy imtihon bilan), 6–11-sinf darsliklari testlari, M. Usmonov to‘plamlari va darsliklar asosida tuzilgan savollar. Qayta yuklash xavfsiz — mavjud savollar yangilanadi, takrorlanmaydi.</p>
        {st.data && <p>Hozir bazada: <b>{fmt(st.data.questions)}</b> savol, <b>{st.data.topics}</b> mavzu, <b>{st.data.rewards}</b> sovg‘a/nishon.</p>}
        {prog ? <div><div className="xpbar"><i style={{ width: `${(100 * prog.done) / prog.total}%` }} /></div><p className="small muted">{prog.done} / {prog.total}</p></div>
          : <button className="btn" onClick={seed}>Bazani yuklash / yangilash</button>}
      </div>
      <div className="sheet stack">
        <h3>O‘z testlaringizni import qilish</h3>
        <p className="muted small">JSON (bank.json formati) yoki CSV (nuqta-vergul bilan): <code>stem;A;B;C;D;answer;topic;grades;difficulty;explanation</code></p>
        <input type="file" accept=".json,.csv" onChange={e => setFile(e.target.files[0])} />
        <button className="btn" disabled={!file} onClick={importFile}>Import qilish</button>
      </div>
    </div>
  );
}

function Reports() {
  const toast = useToast();
  const r = useAsync(() => api.admin.listReports(), []);
  const [view, setView] = useState(null);
  if (r.loading) return <Spinner />;
  async function setSt(x, s) { try { await api.admin.updateReport(x.id, s); r.reload(); } catch (e) { toast(e.message); } }
  return (
    <div className="stack">
      {(r.data || []).map(x => (
        <div key={x.id} className="sheet flat stack tight">
          <div className="row"><span className={'tag ' + (x.status === 'new' ? 'red' : 'green')}>{x.status === 'new' ? 'yangi' : x.status === 'fixed' ? 'tuzatildi' : 'rad etildi'}</span><span className="small muted">Savol #{x.question_id} · {new Date(x.created_at).toLocaleString('uz-UZ')}</span></div>
          <p>{x.message}</p>
          <div className="row wrap"><button className="btn small ghost" onClick={() => setView(x.question)}>Savolni ko‘rish</button>
            <button className="btn small green" onClick={() => setSt(x, 'fixed')}>Tuzatildi</button><button className="btn small ghost" onClick={() => setSt(x, 'rejected')}>Rad etish</button></div>
        </div>
      ))}
      {!r.data?.length && <p className="muted">Xabarlar yo‘q.</p>}
      {view && <Modal onClose={() => setView(null)} label="Savol"><Question q={view} reveal={{ answer: view.answer }} locked value={view.qtype === 'mc' ? view.answer : null} /></Modal>}
    </div>
  );
}

function Users() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const u = useAsync(() => api.admin.listUsers({ search: q }), [q]);
  async function upd(x, patch) { try { await api.admin.updateUser(x.id, patch); u.reload(); toast('Saqlandi'); } catch (e) { toast(e.message); } }
  return (
    <div className="stack">
      <input className="input" placeholder="Ism bo‘yicha qidirish" value={q} onChange={e => setQ(e.target.value)} />
      {u.loading ? <Spinner /> : (
        <table className="t sheet flat" style={{ padding: 0 }}>
          <thead><tr><th>Ism</th><th>Turi</th><th>Viloyat</th><th>Telefon</th><th>XP</th><th>Holat</th></tr></thead>
          <tbody>{(u.data || []).map(x => (
            <tr key={x.id}>
              <td>{x.avatar} {x.full_name}{x.demo ? ' (namuna)' : ''}</td>
              <td>{x.role_type === 'student' ? `${x.grade}-sinf` : 'abituriyent'}</td>
              <td className="small">{x.region}{x.school ? <><br />{x.school}</> : null}</td>
              <td className="small">{x.phone || '—'}</td>
              <td>{fmt(x.xp)}</td>
              <td>{!x.demo && <div className="stack tight">
                <button className="btn small ghost" onClick={() => upd(x, { is_admin: !x.is_admin })}>{x.is_admin ? 'Adminlikni olish' : 'Admin qilish'}</button>
                <button className={'btn small ' + (x.is_blocked ? 'green' : 'red')} onClick={() => upd(x, { is_blocked: !x.is_blocked })}>{x.is_blocked ? 'Blokdan chiqarish' : 'Bloklash'}</button>
              </div>}</td>
            </tr>))}</tbody>
        </table>
      )}
    </div>
  );
}

function Rewards() {
  const toast = useToast();
  const r = useAsync(() => api.admin.listRewards(), []);
  const [edit, setEdit] = useState(null);
  async function save() {
    try { const row = { ...edit, rule: typeof edit.rule === 'string' ? JSON.parse(edit.rule || '{}') : edit.rule, cost_coins: +edit.cost_coins || 0 };
      await api.admin.saveReward(row); setEdit(null); r.reload(); toast('Saqlandi'); } catch (e) { toast(e.message); }
  }
  return (
    <div className="stack">
      <button className="btn" style={{ justifySelf: 'start' }} onClick={() => setEdit({ id: '', title: '', description: '', icon: '🏅', kind: 'badge', cost_coins: 0, audience: 'all', rule: '{"xp":1000}', sort: 99, active: true })}>+ Yangi nishon yoki sovg‘a</button>
      <table className="t sheet flat" style={{ padding: 0 }}>
        <thead><tr><th></th><th>Nomi</th><th>Turi</th><th>Shart / narx</th><th></th></tr></thead>
        <tbody>{(r.data || []).map(x => (
          <tr key={x.id}><td style={{ fontSize: 24 }}>{x.icon}</td><td><b>{x.title}</b><br /><span className="small muted">{x.description}</span></td><td>{x.kind}<br /><span className="small">{x.audience}</span></td>
            <td className="small">{x.cost_coins ? `🪙 ${x.cost_coins}` : JSON.stringify(x.rule)}</td>
            <td><button className="btn small ghost" onClick={() => setEdit({ ...x, rule: JSON.stringify(x.rule || {}) })}>Tahrirlash</button></td></tr>))}</tbody>
      </table>
      {edit && (
        <Modal onClose={() => setEdit(null)} label="Sovg‘a">
          <div className="stack">
            {[['id', 'ID (lotincha, masalan xp_1000)'], ['title', 'Nomi'], ['description', 'Tavsif'], ['icon', 'Belgi (emoji)'], ['cost_coins', 'Narxi (tanga, nishon uchun 0)'], ['rule', 'Shart JSON: {"xp":1000} | {"streak":7} | {"tests":10} | {"perfect":1} | {"games":5} | {"daily":7} | {"milliy":1}'], ['sort', 'Tartib']].map(([k, l]) => (
              <div className="field" key={k}><label>{l}</label><input className="input" value={edit[k] ?? ''} onChange={e => setEdit({ ...edit, [k]: e.target.value })} /></div>
            ))}
            <div className="grid2">
              <div className="field"><label>Turi</label><select className="input" value={edit.kind} onChange={e => setEdit({ ...edit, kind: e.target.value })}><option value="badge">Nishon (avtomatik)</option><option value="avatar">Avatar</option><option value="title">Unvon</option><option value="gift">Sovg‘a</option></select></div>
              <div className="field"><label>Kimlar uchun</label><select className="input" value={edit.audience} onChange={e => setEdit({ ...edit, audience: e.target.value })}><option value="all">Hamma</option><option value="student">O‘quvchilar</option><option value="abiturient">Abituriyentlar</option></select></div>
            </div>
            <button className="btn" onClick={save}>Saqlash</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Ann() {
  const toast = useToast();
  const a = useAsync(() => api.announcements(), []);
  const [f, setF] = useState({ title: '', body: '' });
  async function add() { try { await api.admin.saveAnnouncement({ ...f, audience: 'all' }); setF({ title: '', body: '' }); a.reload(); toast('E’lon qo‘shildi'); } catch (e) { toast(e.message); } }
  async function del(id) { try { await api.admin.deleteAnnouncement(id); a.reload(); } catch (e) { toast(e.message); } }
  return (
    <div className="stack">
      <div className="sheet stack"><h3>Yangi e’lon</h3><p className="small muted">Oxirgi e’lon ilovaning bosh sahifasida ko‘rinadi.</p>
        <input className="input" placeholder="Sarlavha" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
        <textarea className="input" placeholder="Matn (ixtiyoriy)" value={f.body} onChange={e => setF({ ...f, body: e.target.value })} />
        <button className="btn" disabled={!f.title} onClick={add}>E’lon qilish</button></div>
      {(a.data || []).map(x => <div key={x.id} className="sheet flat row"><div className="grow"><b>{x.title}</b><p className="small muted">{x.body}</p></div><button className="btn small red" onClick={() => del(x.id)}>O‘chirish</button></div>)}
    </div>
  );
}

function Admin() {
  const [st, setSt] = useState({ phase: 'loading' });
  const [tab, setTab] = useState('stats');
  useEffect(() => {
    (async () => {
      const s = await api.init();
      if (!s) return setSt({ phase: 'login' });
      const me = await api.me();
      if (!me?.is_admin) return setSt({ phase: 'denied', me });
      setSt({ phase: 'ok', me });
    })().catch(e => setSt({ phase: 'error', e }));
  }, []);
  if (st.phase === 'loading') return <Spinner />;
  if (st.phase !== 'ok') return (
    <div className="login"><div className="box sheet stack">
      <div className="brand"><Logo /> Fizika admin</div>
      {st.phase === 'login' && <><p>Admin panelga kirish uchun Google hisobingiz bilan kiring.</p><button className="gbtn" onClick={() => api.signInGoogle()}><Icon.google /> Google orqali kirish</button></>}
      {st.phase === 'denied' && <p>Bu hisob ({st.me?.full_name || 'profil to‘ldirilmagan'}) admin emas. Admin huquqini mavjud admin «Foydalanuvchilar» bo‘limida beradi.</p>}
      {st.phase === 'error' && <p className="err">{String(st.e?.message || st.e)}</p>}
      <a className="btn ghost" href="index.html">Ilovaga qaytish</a>
    </div></div>
  );
  return (
    <div className="admin">
      <aside>
        <span className="brand"><Logo /> Admin</span>
        {TABS.map(([id, l]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{l}</button>)}
        <a href="index.html" className="small" style={{ marginTop: 'auto', padding: 10 }}>← Ilovaga qaytish</a>
      </aside>
      <section>
        <div className="topbar"><h1 style={{ fontSize: 28 }}>{TABS.find(t => t[0] === tab)[1]}</h1>{isDemo && <span className="tag y">demo rejim</span>}</div>
        {tab === 'stats' && <Stats />}
        {tab === 'questions' && <Questions />}
        {tab === 'seed' && <Seed />}
        {tab === 'reports' && <Reports />}
        {tab === 'users' && <Users />}
        {tab === 'rewards' && <Rewards />}
        {tab === 'ann' && <Ann />}
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<ToastProvider><Admin /></ToastProvider>);
