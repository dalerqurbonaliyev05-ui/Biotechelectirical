import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

/* ---------- Button ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'soft' | 'ghost' | 'danger' | 'success';
  block?: boolean; size?: 'md' | 'sm'; loading?: boolean;
};
export function Button({ variant = 'primary', block, size = 'md', loading, children, disabled, className = '', ...rest }: BtnProps) {
  return (
    <button className={`u-btn ${variant} ${block ? 'block' : ''} ${size === 'sm' ? 'sm' : ''} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? <span className="u-spin" /> : children}
    </button>
  );
}

/* ---------- Header / Page ---------- */
export function Header({ title, sub, back, right }: { title: string; sub?: string; back?: boolean | string; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="u-header">
      {back && (
        <button className="u-iconbtn" aria-label="Orqaga" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}>
          <Icon name="back" />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1>{title}</h1>
        {sub && <div className="u-sub">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function Page({ children, sticky, tabs = true }: { children: ReactNode; sticky?: boolean; tabs?: boolean }) {
  return (
    <motion.div className={`u-page ${sticky ? 'has-sticky' : ''} ${tabs ? '' : 'no-tabs'}`}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

/* ---------- Chips ---------- */
export interface ChipItem { id: string; label: string; icon?: string | null }
export function ChipRow({ items, value, onChange, sub }: { items: ChipItem[]; value: string | null; onChange: (id: string) => void; sub?: boolean }) {
  return (
    <div className={`u-chips ${sub ? 'sub' : ''}`} role="tablist">
      {items.map((c) => (
        <button key={c.id} role="tab" aria-selected={value === c.id} className={`u-chip ${value === c.id ? 'active' : ''}`} onClick={() => onChange(c.id)}>
          {c.icon && <span>{c.icon}</span>}{c.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Stepper ---------- */
export function Stepper({ value, onChange, min = 1, max = 500, step = 1 }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div className="u-stepper">
      <button aria-label="Kamaytirish" disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}><Icon name="minus" size={18} /></button>
      <output>{value}</output>
      <button aria-label="Ko'paytirish" disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}><Icon name="plus" size={18} /></button>
    </div>
  );
}

/* ---------- Stars ---------- */
export function Stars({ value, onChange, big }: { value: number; onChange?: (n: number) => void; big?: boolean }) {
  return (
    <span className={`u-stars ${big ? 'big' : ''}`} aria-label={`${value} yulduz`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = <Icon name="star" size={big ? 34 : 16} filled={n <= Math.round(value)} className={n <= Math.round(value) ? 'on' : ''} />;
        return onChange
          ? <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} yulduz`}>{star}</button>
          : <span key={n}>{star}</span>;
      })}
    </span>
  );
}

/* ---------- Sheet ---------- */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="u-sheet-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="u-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}>
            <div className="u-sheet-grab" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Sticky bottom button ---------- */
export function StickyBar({ show, label, sub, onClick, aboveTabs = true, disabled, loading }:
  { show: boolean; label: string; sub?: string; onClick: () => void; aboveTabs?: boolean; disabled?: boolean; loading?: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div className={`u-sticky ${aboveTabs ? 'above-tabs' : 'bottom'}`}
          initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}>
          <button className="u-btn primary" onClick={onClick} disabled={disabled || loading}>
            {loading ? <span className="u-spin" style={{ margin: '0 auto' }} /> : (<><span>{label}</span>{sub && <span className="sub">{sub}</span>}</>)}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Toast ---------- */
interface ToastItem { id: number; text: string; kind: 'info' | 'error' | 'success' }
const ToastCtx = createContext<(text: string, kind?: ToastItem['kind']) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const push = useCallback((text: string, kind: ToastItem['kind'] = 'info') => {
    const id = ++seq.current;
    setItems((x) => [...x, { id, text, kind }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="u-toasts" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} className={`u-toast ${t.kind}`} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Loading / Empty ---------- */
export function Spinner() { return <div className="u-center"><div className="u-spin" /></div>; }
export function Empty({ icon = '🍽️', title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="u-empty">
      <div className="ico">{icon}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}
export function Skeletons({ n = 4 }: { n?: number }) {
  return (
    <div className="u-grid">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i}><div className="u-skel" style={{ aspectRatio: '1/0.9', borderRadius: 24 }} /><div className="u-skel" style={{ height: 14, margin: '10px 4px 0', width: '70%' }} /></div>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} className={`u-switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />;
}

/* Kichik yordamchi: asinxron amalni bajarib, xatoni toast qiladi. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try { await fn(); if (ok) toast(ok, 'success'); return true; }
    catch (e) { toast((e as { message?: string }).message ?? 'Xatolik', 'error'); return false; }
    finally { setBusy(false); }
  }, [toast]);
  return { busy, run };
}

export function useInterval(fn: () => void, ms: number) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  useEffect(() => { const id = setInterval(() => ref.current(), ms); return () => clearInterval(id); }, [ms]);
}
