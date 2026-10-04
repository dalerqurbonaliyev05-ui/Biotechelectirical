import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const show = useCallback((m) => { setMsg(m); }, []);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 2800); return () => clearTimeout(t); }, [msg]);
  return <ToastCtx.Provider value={show}>{children}{msg && <div className="toast" role="status">{msg}</div>}</ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
export const Icon = {
  home: () => <svg viewBox="0 0 24 24" {...P}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /><path d="M10 19.5v-5h4v5" /></svg>,
  tests: () => <svg viewBox="0 0 24 24" {...P}><rect x="4.5" y="3.5" width="15" height="17" rx="2" /><path d="M8 8.5h8M8 12.5h8M8 16.5h5" /></svg>,
  games: () => <svg viewBox="0 0 24 24" {...P}><path d="M9 3h6M10 3v6.5L4.8 18.2A1.8 1.8 0 0 0 6.4 21h11.2a1.8 1.8 0 0 0 1.6-2.8L14 9.5V3" /><path d="M7.5 15h9" /></svg>,
  rank: () => <svg viewBox="0 0 24 24" {...P}><path d="M8 21V11H3.5v10M15.5 21V14H20.5v7M8 21h7.5V5.5H8z" /></svg>,
  user: () => <svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1.2-3.7 4-5.5 7.5-5.5s6.3 1.8 7.5 5.5" /></svg>,
  back: () => <svg viewBox="0 0 24 24" {...P}><path d="M15 5l-7 7 7 7" /></svg>,
  close: () => <svg viewBox="0 0 24 24" {...P}><path d="M6 6l12 12M18 6 6 18" /></svg>,
  flag: () => <svg viewBox="0 0 24 24" {...P}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>,
  book: () => <svg viewBox="0 0 24 24" {...P}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20" /></svg>,
  moon: () => <svg viewBox="0 0 24 24" {...P}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>,
  sun: () => <svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  google: () => <svg viewBox="0 0 48 48" width="22" height="22"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>,
};

export function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <ellipse cx="16" cy="16" rx="13" ry="5" fill="none" stroke="var(--pen)" strokeWidth="2" />
      <ellipse cx="16" cy="16" rx="13" ry="5" fill="none" stroke="var(--pen)" strokeWidth="2" transform="rotate(60 16 16)" />
      <ellipse cx="16" cy="16" rx="13" ry="5" fill="none" stroke="var(--pen)" strokeWidth="2" transform="rotate(120 16 16)" />
      <circle cx="16" cy="16" r="3.2" fill="var(--red)" />
    </svg>
  );
}

export function Atom({ level = 1 }) {
  const e = Math.min(3, Math.max(1, Math.ceil(level / 3)));
  return (
    <svg className="atom" viewBox="0 0 104 104" aria-hidden="true">
      {[0, 60, 120].map((r, i) => (
        <g key={r} className={'spin s' + (i + 1)}>
          <ellipse className="orbit" cx="52" cy="52" rx="46" ry="16" transform={`rotate(${r} 52 52)`} />
          {i < e && <circle className="e" r="5" cx={52 + 46 * Math.cos(r * Math.PI / 180)} cy={52 + 46 * Math.sin(r * Math.PI / 180)} />}
        </g>
      ))}
      <circle className="nucleus" cx="52" cy="52" r="13" />
      <text x="52" y="57.5" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" fontFamily="var(--f-ui)">{level}</text>
    </svg>
  );
}

export function Modal({ onClose, children, label }) {
  useEffect(() => { const k = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={label} onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function Seg({ value, onChange, items }) {
  return (
    <div className="seg" role="group">
      {items.map(([v, l]) => <button key={String(v)} aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

export const Spinner = () => <div className="spinner" role="progressbar" aria-label="Yuklanmoqda" />;

export function Back({ onClick, title, right }) {
  return (
    <div className="topbar">
      <div className="row">
        <button className="iconbtn" onClick={onClick} aria-label="Orqaga"><Icon.back /></button>
        <h2>{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function useAsync(fn, deps = []) {
  const [st, set] = useState({ loading: true, data: null, error: null });
  const reload = useCallback(() => {
    set(s => ({ ...s, loading: true }));
    Promise.resolve().then(fn).then(data => set({ loading: false, data, error: null })).catch(error => set({ loading: false, data: null, error }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { ...st, reload };
}

export function plural(n, word) { return `${n} ta ${word}`; }
export const fmt = n => (n == null ? '—' : Number(n).toLocaleString('ru-RU').replace(/,/g, ' '));
