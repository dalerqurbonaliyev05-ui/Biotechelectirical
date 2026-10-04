import { useEffect, useState } from 'react';
import { Empty, Header, Page, Skeletons, dayTime, kmLabel, money, supabase, type CourierAssignment, type Order } from '@uyovqat/shared';

type Row = CourierAssignment & { orders: Order | Order[] };

export default function History() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    void supabase.from('courier_assignments').select('*, orders(*)').eq('delivery_status', 'delivered').order('delivered_at', { ascending: false }).limit(100)
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);
  return (
    <Page>
      <Header title="Tarix" sub={rows ? `${rows.length} ta yetkazish` : undefined} />
      {rows === null ? <Skeletons n={2} /> : rows.length === 0 ? <Empty icon="🛵" title="Hali yetkazish yo'q" text="Yetkazgan buyurtmalaringiz shu yerda saqlanadi." /> : (
        <div className="u-list">
          {rows.map((r) => {
            const o = Array.isArray(r.orders) ? r.orders[0] : r.orders;
            return (
              <div key={r.id} className="u-item"><div className="u-item-thumb">📦</div>
                <div className="u-item-main"><div className="u-item-title" style={{ whiteSpace: 'normal' }}>{o.delivery_address}</div>
                  <div className="u-item-sub">{r.delivered_at ? dayTime(r.delivered_at) : ''}{r.distance_km != null ? ` · ${kmLabel(Number(r.distance_km))}` : ''}</div></div>
                <b>{money(o.delivery_fee)}</b></div>
            );
          })}
        </div>
      )}
    </Page>
  );
}
