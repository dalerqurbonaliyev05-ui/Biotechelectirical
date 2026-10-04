import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Empty, Header, Icon, Page, Skeletons, SELLER_STATUS_LABEL, dayTime, errMsg, isActiveOrder, money, onTableChange, statusTone,
  supabase, useAuth, useToast, DELIVERY_LABEL, type CourierAssignment, type Order, type OrderStatus, type Profile } from '@uyovqat/shared';

type Row = Order & { order_items: { name: string; portions: number }[]; courier_assignments?: CourierAssignment[] | CourierAssignment | null };
// order_id UNIQUE bo'lgani uchun PostgREST bitta obyekt qaytaradi; massiv bo'lsa ham ishlaydi.
const asgOf = (o: Row): CourierAssignment | undefined => {
  const a = o.courier_assignments;
  return Array.isArray(a) ? a[0] : a ?? undefined;
};

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  accepted: { to: 'preparing', label: 'Tayyorlashni boshlash' },
  preparing: { to: 'handed_to_courier', label: 'Kuryerga berdim' },
};

export default function Orders() {
  const toast = useToast();
  const { session, profile } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [couriers, setCouriers] = useState<Record<string, Profile>>({});
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [busy, setBusy] = useState<string | null>(null);
  const known = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('orders').select('*, order_items(name, portions), courier_assignments(*)').order('created_at', { ascending: false }).limit(100);
    const list = (data as Row[]) ?? [];
    setRows(list);
    const ids = [...new Set(list.map(asgOf).filter((a): a is CourierAssignment => !!a).map((a) => a.courier_id))];
    if (ids.length) {
      const { data: cs } = await supabase.from('uy_profiles').select('*').in('id', ids);
      setCouriers(Object.fromEntries(((cs as Profile[]) ?? []).map((c) => [c.id, c])));
    }
    // Yangi buyurtma kelsa xabar beramiz (birinchi yuklashdan keyin).
    const newIds = new Set(list.filter((o) => o.status === 'new').map((o) => o.id));
    if (known.current) for (const id of newIds) if (!known.current.has(id)) toast('🔔 Yangi buyurtma keldi!', 'success');
    known.current = newIds;
  }, [toast]);

  useEffect(() => {
    void load();
    if (!session) return;
    return onTableChange('orders', () => void load(), `seller_id=eq.${session.user.id}`);
  }, [load, session]);

  async function setStatus(o: Order, to: OrderStatus) {
    if (to === 'rejected' && !window.confirm('Buyurtmani rad etasizmi?')) return;
    setBusy(o.id);
    const { error } = await supabase.rpc('uy_seller_set_status', { p_order: o.id, p_status: to });
    setBusy(null);
    if (error) toast(errMsg(error), 'error'); else { toast(to === 'rejected' ? 'Rad etildi' : 'Holat yangilandi', 'success'); void load(); }
  }

  const list = (rows ?? []).filter((o) => (tab === 'active') === isActiveOrder(o.status));
  const noLoc = profile && (profile.lat == null || profile.lng == null);

  return (
    <Page>
      <Header title="Buyurtmalar" sub={profile?.shop_name ?? undefined} />
      {noLoc && (
        <Link to="/profile" className="u-card flat" style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--brand-50)', marginBottom: 14 }}>
          <Icon name="pin" /><span style={{ fontWeight: 700 }}>Oshxona joylashuvini belgilang: kuryer shu nuqtaga biriktiriladi →</span>
        </Link>
      )}
      <div className="u-seg" style={{ marginBottom: 16 }}>
        <button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Faol</button>
        <button className={tab === 'past' ? 'active' : ''} onClick={() => setTab('past')}>Tarix</button>
      </div>

      {rows === null ? <Skeletons n={2} /> : list.length === 0 ? (
        <Empty icon="🧑‍🍳" title={tab === 'active' ? 'Hozircha buyurtma yo\'q' : 'Tarix bo\'sh'} text="Yangi buyurtma kelganda shu yerda darrov ko'rinadi." />
      ) : (
        <div className="u-list">
          {list.map((o) => {
            const next = NEXT[o.status];
            const asg = asgOf(o);
            const courier = asg ? couriers[asg.courier_id] : undefined;
            return (
              <div key={o.id} className="u-card" style={{ margin: 0 }}>
                <div className="u-row" style={{ justifyContent: 'space-between' }}>
                  <span className={`u-badge ${statusTone(o.status) === 'plain' ? 'brand' : statusTone(o.status)}`}>{SELLER_STATUS_LABEL[o.status]}</span>
                  <span className="u-muted" style={{ fontSize: 13, fontWeight: 600 }}>#{o.id.slice(0, 6).toUpperCase()}</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  {o.order_items.map((i, k) => (
                    <div key={k} style={{ fontSize: 18, fontWeight: 800 }}>{i.name} <span style={{ color: 'var(--brand-600)' }}>· {i.portions} kishiga</span></div>
                  ))}
                </div>
                <div className="u-kv" style={{ marginTop: 8 }}><span><Icon name="clock" size={16} /> Tayyor bo'lsin</span><b>{dayTime(o.ready_at)}</b></div>
                <div className="u-kv"><span>To'lov</span><b>{o.payment_method === 'cash' ? '💵 Naqd' : '💳 Karta'}</b></div>
                <div className="u-kv"><span>Taomlar summasi</span><b>{money(o.subtotal)}</b></div>
                {o.note && <div className="u-hint">💬 {o.note}</div>}
                {asg && (
                  <div className="u-hint" style={{ color: 'var(--text-2)' }}>🛵 Kuryer: {courier?.full_name ?? '…'}{courier?.phone ? ` · ${courier.phone}` : ''} · {DELIVERY_LABEL[asg.delivery_status]}</div>
                )}
                {!asg && o.status !== 'new' && isActiveOrder(o.status) && <div className="u-hint">Bo'sh kuryer qidirilmoqda…</div>}

                {o.status === 'new' && (
                  <div className="u-row" style={{ marginTop: 14 }}>
                    <Button variant="danger" onClick={() => setStatus(o, 'rejected')} disabled={busy === o.id}>Rad etish</Button>
                    <Button className="grow" style={{ flex: 1 }} loading={busy === o.id} onClick={() => setStatus(o, 'accepted')}>Qabul qilish</Button>
                  </div>
                )}
                {next && <div style={{ marginTop: 14 }}><Button block loading={busy === o.id} onClick={() => setStatus(o, next.to)}>{next.label}</Button></div>}
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}
