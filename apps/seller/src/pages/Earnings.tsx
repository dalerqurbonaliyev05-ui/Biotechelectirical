import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Empty, Header, Page, Skeletons, dayTime, money, supabase, type BonusRule, type SellerBonus, type SellerEarning } from '@uyovqat/shared';

export default function Earnings() {
  const [earn, setEarn] = useState<SellerEarning[] | null>(null);
  const [bonuses, setBonuses] = useState<SellerBonus[]>([]);
  const [rules, setRules] = useState<BonusRule[]>([]);

  useEffect(() => {
    void supabase.from('seller_earnings').select('*').order('created_at', { ascending: false }).limit(500).then(({ data }) => setEarn((data as SellerEarning[]) ?? []));
    void supabase.from('seller_bonuses').select('*').order('created_at', { ascending: false }).then(({ data }) => setBonuses((data as SellerBonus[]) ?? []));
    void supabase.from('bonus_rules').select('*').eq('is_active', true).then(({ data }) => setRules((data as BonusRule[]) ?? []));
  }, []);

  if (earn === null) return <Page><Header title="Daromad" /><Skeletons n={2} /></Page>;
  const total = earn.reduce((a, e) => a + Number(e.net), 0);
  const bonusTotal = bonuses.reduce((a, b) => a + Number(b.amount), 0);
  const count = earn.length;

  return (
    <Page>
      <Header title="Daromad" />
      <div className="u-card" style={{ background: 'var(--brand)', color: '#fff', boxShadow: 'var(--shadow-brand)' }}>
        <div style={{ opacity: 0.85, fontWeight: 700 }}>Jami daromad (bonus bilan)</div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em' }}>{money(total + bonusTotal)}</div>
        <div style={{ opacity: 0.9, fontWeight: 600, marginTop: 4 }}>{count} ta yetkazilgan buyurtma · bonus {money(bonusTotal)}</div>
      </div>

      {rules.map((r) => {
        const done = count % r.every_n_orders;
        const left = r.every_n_orders - done;
        const base = earn.slice(0, r.every_n_orders).reduce((a, e) => a + Number(e.net), 0);
        const hint = r.bonus_type === 'percent' ? `${r.bonus_value}% bonus` : `${money(r.bonus_value)} bonus`;
        void base;
        return (
          <div key={r.id} className="u-card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>🎯 {r.name}</div>
            <div className="u-muted" style={{ fontWeight: 600, margin: '2px 0 12px' }}>
              Har {r.every_n_orders} ta buyurtmadan keyin {hint}. Yana <b style={{ color: 'var(--text)' }}>{left} ta</b> buyurtma qoldi.
            </div>
            <div className="u-progress" role="progressbar" aria-valuemin={0} aria-valuemax={r.every_n_orders} aria-valuenow={done}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${(done / r.every_n_orders) * 100}%` }} transition={{ duration: 0.8 }} />
            </div>
            <div className="u-row" style={{ justifyContent: 'space-between', marginTop: 6, fontWeight: 700, fontSize: 13 }}>
              <span>{done} ta</span><span className="u-muted">{r.every_n_orders} ta</span>
            </div>
          </div>
        );
      })}

      <h2 className="u-section-title">Tarix</h2>
      {earn.length === 0 && bonuses.length === 0 ? (
        <Empty icon="💰" title="Hali daromad yo'q" text="Birinchi yetkazilgan buyurtmadan keyin shu yerda ko'rinadi." />
      ) : (
        <div className="u-list">
          {bonuses.map((b) => (
            <div key={b.id} className="u-item"><div className="u-item-thumb">🎁</div>
              <div className="u-item-main"><div className="u-item-title">Bonus · {b.milestone}-buyurtma</div><div className="u-item-sub">{dayTime(b.created_at)}</div></div>
              <b style={{ color: 'var(--success)' }}>+{money(b.amount)}</b></div>
          ))}
          {earn.map((e) => (
            <div key={e.id} className="u-item"><div className="u-item-thumb">🧾</div>
              <div className="u-item-main"><div className="u-item-title">Buyurtma #{e.order_id.slice(0, 6).toUpperCase()}</div>
                <div className="u-item-sub">{dayTime(e.created_at)} · komissiya {money(e.commission)}</div></div>
              <b style={{ color: 'var(--success)' }}>+{money(e.net)}</b></div>
          ))}
        </div>
      )}
    </Page>
  );
}
