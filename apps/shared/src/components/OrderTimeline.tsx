import { motion } from 'framer-motion';
import { Icon } from './Icon';
import { STATUS_HEADLINE, TIMELINE_STEPS, timelineIndex } from '../status';
import { timeHM } from '../format';
import type { OrderStatus, StatusLogRow } from '../types';

/** Yandex Eats uslubidagi animatsiyali bosqichli progress: qabul qilindi → tayyorlanmoqda → yo'lda → yetkazildi. */
export function OrderTimeline({ status, log, sub }: { status: OrderStatus; log?: StatusLogRow[]; sub?: string }) {
  const idx = timelineIndex(status);
  const failed = status === 'rejected' || status === 'cancelled';
  // Progress to'ldirilishi: har bosqich 1/3 qadam; "new" holatida ozgina (kutish).
  const pct = failed ? 0 : idx < 0 ? 4 : (idx / (TIMELINE_STEPS.length - 1)) * 100;
  const at = (s: OrderStatus) => log?.find((l) => l.status === s)?.created_at;

  return (
    <div className="u-tl" role="group" aria-label="Buyurtma holati">
      <div className="u-tl-head">{STATUS_HEADLINE[status]}</div>
      {sub && <div className="u-tl-sub">{sub}</div>}
      {!failed && (
        <>
          <div className="u-tl-track">
            <motion.div className="u-tl-fill" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
            {idx >= 0 && idx < 3 && (
              <motion.span className="u-tl-bike" initial={{ left: 0 }} animate={{ left: `${pct}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
                <motion.span style={{ display: 'inline-block' }} animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.9 }}>🛵</motion.span>
              </motion.span>
            )}
            <div className="u-tl-dots">
              {TIMELINE_STEPS.map((s, i) => (
                <motion.span key={s.key} className={`u-tl-dot ${i < idx || (i === idx && status === 'delivered') ? 'done' : i === idx ? 'current' : ''}`}
                  style={{ left: `${(i / (TIMELINE_STEPS.length - 1)) * 100}%` }}
                  animate={{ scale: i === idx ? [1, 1.12, 1] : 1 }} transition={{ duration: 1.4, repeat: i === idx && status !== 'delivered' ? Infinity : 0 }}>
                  {(i < idx || (i === idx && status === 'delivered')) ? <Icon name="check" size={15} /> : <span style={{ fontSize: 11, fontWeight: 800 }}>{i + 1}</span>}
                </motion.span>
              ))}
            </div>
          </div>
          <div className="u-tl-labels">
            {TIMELINE_STEPS.map((s, i) => {
              const t = at(s.key as OrderStatus);
              return (
                <div key={s.key} className={i < idx ? 'done' : i === idx ? 'current' : ''}>
                  {s.label}
                  {t && <small>{timeHM(t)}</small>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
