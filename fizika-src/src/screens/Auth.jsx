import React, { useEffect, useState } from 'react';
import { api, isDemo } from '../lib/api.js';
import { isNative } from '../lib/remote.js';
import { Icon, Logo, useToast } from '../components/ui.jsx';
import { REGIONS } from '../data/meta.js';

export function Login({ onSignedIn }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  async function go() {
    setBusy(true);
    try {
      const s = await api.signInGoogle(name);
      if (isDemo) onSignedIn(s);
      // Android: kirish tizim brauzerida davom etadi; foydalanuvchi uni yopib qaytsa, tugma yana faol bo'lsin
      if (isNative()) setTimeout(() => setBusy(false), 2500);
    } catch (e) { toast(e.message); setBusy(false); }
  }
  useEffect(() => {
    const onErr = e => { toast('Kirish amalga oshmadi: ' + e.detail); setBusy(false); };
    window.addEventListener('fizika-auth-error', onErr);
    return () => window.removeEventListener('fizika-auth-error', onErr);
  }, [toast]);
  return (
    <main className="login">
      <div className="box">
        <div className="brand"><Logo size={36} /> Fizika</div>
        <h1>Fizikadan har kuni bir qadam</h1>
        <p className="muted" style={{ fontSize: 18 }}>6–11-sinf darsliklari, milliy sertifikat savollari va laboratoriya o‘yinlari bitta ilovada.</p>
        <div className="sheet stack" style={{ marginTop: 6 }}>
          <p className="math" style={{ fontSize: 26, fontStyle: 'italic', textAlign: 'center' }}><span className="mark">F = m · a</span></p>
          <p className="small muted" style={{ textAlign: 'center' }}>Kirish faqat Google hisobi orqali. Keyin o‘quvchi yoki abituriyent ekaningizni tanlaysiz.</p>
          {isDemo && (
            <div className="field">
              <label htmlFor="dname">Ismingiz (demo rejim)</label>
              <input id="dname" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Masalan: Aziza Karimova" />
            </div>
          )}
          <button className="gbtn" onClick={go} disabled={busy}><Icon.google /> {isDemo ? 'Demo hisob bilan kirish' : 'Google orqali kirish'}</button>
          {isDemo && <p className="notice">Bu demo rejim: Supabase ulanmagan, natijalar faqat shu brauzerda saqlanadi.</p>}
        </div>
      </div>
    </main>
  );
}

export function Onboarding({ session, profile, onSaved, onCancel }) {
  const toast = useToast();
  const meta = session?.user?.user_metadata || {};
  const [f, setF] = useState({
    full_name: profile?.full_name || meta.full_name || meta.name || '', phone: profile?.phone || '', role_type: profile?.role_type || null,
    grade: profile?.grade || null, region: profile?.region || '', district: profile?.district || '', school: profile?.school || '',
    target_university: profile?.target_university || '', avatar: profile?.avatar || '⚛️',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF(o => ({ ...o, [k]: v }));
  async function save() {
    setErr('');
    if (!f.role_type) return setErr('O‘quvchi yoki abituriyent ekaningizni tanlang.');
    if (f.role_type === 'student' && !f.grade) return setErr('Maktab o‘quvchisi uchun sinfni belgilash majburiy.');
    if (!f.full_name.trim()) return setErr('Ism-familiyani kiriting.');
    if (!f.region) return setErr('Viloyatni tanlang — reyting shu bo‘yicha tuziladi.');
    if (f.phone && !/^\+?[\d\s()-]{9,17}$/.test(f.phone)) return setErr('Telefon raqami noto‘g‘ri ko‘rinishda. Masalan: +998 90 123 45 67');
    setBusy(true);
    try { onSaved(await api.saveProfile(f)); } catch (e) { setErr(e.message); toast(e.message); }
    setBusy(false);
  }
  return (
    <main className="login">
      <div className="box">
        <div className="brand"><Logo size={32} /> Fizika</div>
        <h1 style={{ fontSize: 32 }}>{profile ? 'Profilni tahrirlash' : 'Kim sifatida o‘qiysiz?'}</h1>
        <div className="choice" role="group" aria-label="Foydalanuvchi turi">
          <button aria-pressed={f.role_type === 'student'} onClick={() => set('role_type', 'student')}>
            <b>Maktab o‘quvchisi</b><span>6–11-sinf darsliklari, sinf testlari, darajalar va sovg‘alar</span>
          </button>
          <button aria-pressed={f.role_type === 'abiturient'} onClick={() => set('role_type', 'abiturient')}>
            <b>Abituriyent</b><span>Variantlar, kunlik testlar, milliy sertifikatga tayyorgarlik</span>
          </button>
        </div>
        {f.role_type === 'student' && (
          <div className="field">
            <span className="lbl">Sinfingiz <span className="req">*</span></span>
            <div className="gradepick">{[6, 7, 8, 9, 10, 11].map(g => <button key={g} aria-pressed={f.grade === g} onClick={() => set('grade', g)}>{g}</button>)}</div>
          </div>
        )}
        <div className="field"><label htmlFor="fn">Ism-familiya <span className="req">*</span></label>
          <input id="fn" className="input" value={f.full_name} onChange={e => set('full_name', e.target.value)} autoComplete="name" /></div>
        <div className="field"><label htmlFor="rg">Viloyat <span className="req">*</span></label>
          <select id="rg" className="input" value={f.region} onChange={e => set('region', e.target.value)}>
            <option value="">Tanlang</option>{REGIONS.map(r => <option key={r}>{r}</option>)}
          </select></div>
        <div className="grid2">
          <div className="field"><label htmlFor="ds">Tuman (ixtiyoriy)</label><input id="ds" className="input" value={f.district} onChange={e => set('district', e.target.value)} /></div>
          <div className="field"><label htmlFor="ph">Telefon (ixtiyoriy)</label><input id="ph" className="input" inputMode="tel" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+998" autoComplete="tel" /></div>
        </div>
        {f.role_type === 'student' && <div className="field"><label htmlFor="sc">Maktab (ixtiyoriy)</label><input id="sc" className="input" value={f.school} onChange={e => set('school', e.target.value)} placeholder="Masalan: 27-maktab" /></div>}
        {f.role_type === 'abiturient' && <div className="field"><label htmlFor="tu">Qaysi OTMga kirmoqchisiz? (ixtiyoriy)</label><input id="tu" className="input" value={f.target_university} onChange={e => set('target_university', e.target.value)} /></div>}
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn block" onClick={save} disabled={busy}>{profile ? 'O‘zgarishlarni saqlash' : 'Saqlash va boshlash'}</button>
        {onCancel && <button className="btn ghost block" onClick={onCancel}>Bekor qilish</button>}
      </div>
    </main>
  );
}
