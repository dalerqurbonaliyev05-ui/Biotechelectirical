import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Empty, Header, Page, Skeletons, STATUS_LABEL, dayTime, isActiveOrder, money, onTableChange, statusTone, supabase, useAuth,
  type Order } from '@uyovqat/shared';

type Row = Order & { order_items: { name: string; portions: number }[] };

export default function Orders() {
  const nav = useNavigate();
  const { session } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState<'active' | 'past'>('active');

  const load = useCallback(async () => {
    const { data } = await supabase.from('orders').select('*, order_items(name, portions)').order('created_at', { ascending: false }).limit(100);
    setRows((data as Row[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
    if (!session) return;
    return onTableChange('orders', () => void load(), `buyer_id=eq.${session.user.id}`);
  }, [load, session]);

  const list = (rows ?? []).filter((o) => (tab === 'active') === isActiveOrder(o.status));

  return (
    <Page>
      <Header title="Buyurtmalar" />
      <div className="u-seg" style={{ marginBottom: 16 }}>
        <button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Faol</button>
        <button className={tab === 'past' ? 'active' : ''} onClick={() => setTab('past')}>Tarix</button>
      </div>
      {rows === null ? <Skeletons n={2} /> : list.length === 0 ? (
        <Empty icon={tab === 'active' ? '🧾' : '📜'} title={tab === 'active' ? 'Faol buyurtma yo\'q' : 'Tarix bo\'sh'} text="Yangi buyurtma bergach, holati shu yerda real vaqtda ko'rinadi." />
      ) : (
        <div className="u-list">
          {list.map((o) => (
            <button key={o.id} className="u-item" onClick={() => nav(`/orders/${o.id}`)}>
              <div className="u-item-main">
                <div className="u-row" style={{ justifyContent: 'space-between' }}>
                  <span className={`u-badge ${statusTone(o.status) === 'plain' ? '' : statusTone(o.status)}`}>{STATUS_LABEL[o.status]}</span>
                  <span className="u-muted" style={{ fontSize: 13, fontWeight: 600 }}>{dayTime(o.created_at)}</span>
                </div>
                <div className="u-item-title" style={{ marginTop: 8, whiteSpace: 'normal' }}>
                  {o.order_items.map((i) => `${i.name} (${i.portions} kishi)`).join(', ')}
                </div>
                <div className="u-item-sub" style={{ marginTop: 2 }}>Tayyor: {dayTime(o.ready_at)} · <b style={{ color: 'var(--text)' }}>{money(o.total)}</b></div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Page>
  );
}
