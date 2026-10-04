import { useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../auth';
import { Button, Spinner } from './ui';
import type { Role } from '../types';

const ROLE_NAME: Record<Role, string> = { buyer: 'xaridor', seller: 'sotuvchi', courier: 'kuryer', admin: 'admin' };

export function AuthScreen({ emoji, title, lead, withShop }: { emoji: string; title: string; lead: string; withShop?: boolean }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [f, setF] = useState({ email: '', password: '', fullName: '', phone: '', shopName: '' });
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setInfo(null); setBusy(true);
    let r: string | null;
    if (mode === 'in') r = await signIn(f.email, f.password);
    else {
      if (f.fullName.trim().length < 2) { setErr('Ismingizni kiriting'); setBusy(false); return; }
      if (withShop && f.shopName.trim().length < 2) { setErr('Oshxona nomini kiriting'); setBusy(false); return; }
      r = await signUp(f);
    }
    setBusy(false);
    if (r === 'confirm') setInfo('Emailingizga tasdiqlash xati yuborildi. Havolani bosing va keyin kiring.');
    else if (r) setErr(r);
  }

  return (
    <div className="u-app">
      <motion.form className="u-auth" onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="u-auth-logo" aria-hidden="true">{emoji}</div>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
        {err && <div className="u-error" role="alert">{err}</div>}
        {info && <div className="u-info" role="status">{info}</div>}
        {mode === 'up' && (
          <>
            <label className="u-field"><span>Ismingiz</span><input className="u-input" autoComplete="name" value={f.fullName} onChange={set('fullName')} required /></label>
            {withShop && <label className="u-field"><span>Oshxona nomi</span><input className="u-input" value={f.shopName} onChange={set('shopName')} placeholder="Masalan: Malika oshxonasi" required /></label>}
            <label className="u-field"><span>Telefon</span><input className="u-input" type="tel" autoComplete="tel" inputMode="tel" placeholder="+998 90 123 45 67" value={f.phone} onChange={set('phone')} required /></label>
          </>
        )}
        <label className="u-field"><span>Email</span><input className="u-input" type="email" autoComplete="email" value={f.email} onChange={set('email')} required /></label>
        <label className="u-field"><span>Parol</span><input className="u-input" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={6} value={f.password} onChange={set('password')} required /></label>
        <Button block loading={busy} type="submit">{mode === 'in' ? 'Kirish' : 'Ro\'yxatdan o\'tish'}</Button>
        <div className="u-auth-switch">
          {mode === 'in' ? 'Hisobingiz yo\'qmi? ' : 'Hisobingiz bormi? '}
          <button type="button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(null); setInfo(null); }}>
            {mode === 'in' ? 'Ro\'yxatdan o\'ting' : 'Kiring'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

/** Kirmagan bo'lsa AuthScreen, noto'g'ri rol bo'lsa tushuntirish, aks holda ilova. */
export function AuthGate({ emoji, title, lead, withShop, children }: { emoji: string; title: string; lead: string; withShop?: boolean; children: ReactNode }) {
  const { loading, session, profile, wrongRole, signOut } = useAuth();
  if (loading) return <div className="u-app"><Spinner /></div>;
  if (!session) return <AuthScreen emoji={emoji} title={title} lead={lead} withShop={withShop} />;
  if (!profile) {
    return (
      <div className="u-app"><div className="u-auth">
        <div className="u-auth-logo" aria-hidden="true">🚫</div>
        <h1>Bu ilova sizning hisobingiz uchun emas</h1>
        <p className="lead">
          {wrongRole && wrongRole !== 'none'
            ? `Bu hisob "${ROLE_NAME[wrongRole]}" sifatida ro'yxatdan o'tgan. O'sha rolga mos ilovadan foydalaning yoki boshqa email bilan kiring.`
            : 'Bu hisob "Uy ovqatlari bozori" tizimida ro\'yxatdan o\'tmagan. Boshqa email bilan kiring.'}
        </p>
        <Button block variant="ghost" onClick={() => void signOut()}>Chiqish</Button>
      </div></div>
    );
  }
  return <>{children}</>;
}
