import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, DELIVERY_LABEL, Empty, Header, Icon, OrderTimeline, Page, Spinner, Stars, dayTime, errMsg, isActiveOrder, kmLabel, money, onTableChange,
  supabase, useToast, type CourierAssignment, type Order, type OrderItem, type Profile, type Review, type StatusLogRow } from '@uyovqat/shared';

interface Bundle {
  order: Order; items: OrderItem[]; log: StatusLogRow[]; assignment: CourierAssignment | null;
  courier: Profile | null; seller: Profile | null; reviews: Review[];
}

export default function OrderPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [b, setB] = useState<Bundle | null | undefined>(undefined);

  const load = useCallback(async () => {
    const { data: o } = await supabase.from('orders').select('*').eq('id', id!).maybeSingle();
    if (!o) { setB(null); return; }
    const order = o as Order;
    const [items, log, asg, seller, reviews] = await Promise.all([
      supabase.from('order_items').select('*').eq('order_id', order.id),
      supabase.from('order_status_log').select('*').eq('order_id', order.id).order('created_at'),
      supabase.from('courier_assignments').select('*').eq('order_id', order.id).maybeSingle(),
      supabase.from('uy_profiles').select('*').eq('id', order.seller_id).maybeSingle(),
      supabase.from('reviews').select('*').eq('order_id', order.id),
    ]);
    const assignment = (asg.data as CourierAssignment | null) ?? null;
    const courier = assignment ? ((await supabase.from('uy_profiles').select('*').eq('id', assignment.courier_id).maybeSingle()).data as Profile | null) : null;
    setB({ order, items: (items.data as OrderItem[]) ?? [], log: (log.data as StatusLogRow[]) ?? [], assignment, courier, seller: seller.data as Profile | null, reviews: (reviews.data as Review[]) ?? [] });
  }, [id]);

  // Realtime: buyurtma yoki kuryer biriktirilishi o'zgarsa, holat darrov yangilanadi.
  useEffect(() => {
    void load();
    const off1 = onTableChange('orders', () => void load(), `id=eq.${id}`);
    const off2 = onTableChange('courier_assignments', () => void load(), `order_id=eq.${id}`);
    return () => { off1(); off2(); };
  }, [id, load]);

  async function cancel() {
    if (!window.confirm('Buyurtmani bekor qilasizmi?')) return;
    const { error } = await supabase.rpc('uy_cancel_order', { p_order: id });
    if (error) toast(errMsg(error), 'error'); else { toast('Buyurtma bekor qilindi'); void load(); }
  }

  if (b === undefined) return <Page><Spinner /></Page>;
  if (b === null) return <Page><Header title="Buyurtma" back="/orders" /><Empty icon="🔍" title="Buyurtma topilmadi" /></Page>;
  const { order, items, log, assignment, courier, seller, reviews } = b;
  const active = isActiveOrder(order.status);

  return (
    <Page>
      <Header title={`Buyurtma #${order.id.slice(0, 6).toUpperCase()}`} sub={dayTime(order.created_at)} back="/orders" />

      <div className="u-card">
        <OrderTimeline status={order.status} log={log}
          sub={active ? `Tayyor bo'lish vaqti: ${dayTime(order.ready_at)}` : undefined} />
        {assignment && active && order.status !== 'new' && (
          <div className="u-hint" style={{ marginTop: 10 }}>
            Kuryer: {DELIVERY_LABEL[assignment.delivery_status]}{assignment.distance_km != null ? ` · sotuvchigacha ${kmLabel(Number(assignment.distance_km))}` : ''}
          </div>
        )}
        {order.status === 'new' && <div style={{ marginTop: 14 }}><Button block variant="danger" onClick={cancel}>Buyurtmani bekor qilish</Button></div>}
      </div>

      <div className="u-card">
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Taomlar</div>
        {items.map((i) => <div key={i.id} className="u-kv"><span>{i.name} · {i.portions} kishi</span><b>{money(i.line_total)}</b></div>)}
        <div className="u-kv"><span>Yetkazish</span><b>{money(order.delivery_fee)}</b></div>
        {order.discount_amount > 0 && <div className="u-kv discount"><span>Promokod {order.promo_code}</span><b>−{money(order.discount_amount)}</b></div>}
        <div className="u-kv total"><span>Jami · {order.payment_method === 'cash' ? '💵 naqd' : '💳 karta'}</span><b>{money(order.total)}</b></div>
      </div>

      <div className="u-card">
        <div className="u-kv"><span><Icon name="pin" size={16} /> Manzil</span><b>{order.delivery_address}</b></div>
        {seller && <div className="u-kv"><span><Icon name="chef" size={16} /> Oshxona</span><b>{seller.shop_name || seller.full_name}</b></div>}
        {courier && (
          <div className="u-kv"><span><Icon name="bike" size={16} /> Kuryer</span>
            <b>{courier.full_name}{courier.phone && <> · <a href={`tel:${courier.phone}`} style={{ color: 'var(--brand-600)' }}>{courier.phone}</a></>}</b>
          </div>
        )}
        {seller?.phone && active && <div className="u-kv"><span><Icon name="phone" size={16} /> Oshxona tel.</span><b><a href={`tel:${seller.phone}`} style={{ color: 'var(--brand-600)' }}>{seller.phone}</a></b></div>}
      </div>

      {order.status === 'delivered' && <ReviewCard bundle={b} onDone={() => { toast('Rahmat! Bahoyingiz qabul qilindi', 'success'); void load(); }} />}
      {!active && <div style={{ marginTop: 16 }}><Button block variant="soft" onClick={() => nav('/')}>Yana buyurtma berish</Button></div>}
      {reviews.length > 0 && null}
    </Page>
  );
}

function ReviewCard({ bundle, onDone }: { bundle: Bundle; onDone: () => void }) {
  const toast = useToast();
  const { order, reviews, assignment, courier, seller } = bundle;
  const has = (k: 'seller' | 'courier') => reviews.find((r) => r.target_kind === k);
  const [sRate, setSRate] = useState(0), [cRate, setCRate] = useState(0);
  const [sText, setSText] = useState(''), [cText, setCText] = useState('');
  const [busy, setBusy] = useState(false);
  const needSeller = !has('seller'), needCourier = !!assignment && !has('courier');

  if (!needSeller && !needCourier) {
    return (
      <div className="u-card flat" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Sizning baholaringiz</div>
        {reviews.map((r) => <div key={r.id} className="u-row"><Stars value={r.rating} /><span className="u-muted">{r.target_kind === 'seller' ? 'Oshxona' : 'Kuryer'}</span></div>)}
      </div>
    );
  }

  async function submit() {
    const rows = [];
    if (needSeller && sRate) rows.push({ order_id: order.id, reviewer_id: order.buyer_id, target_kind: 'seller', rating: sRate, comment: sText.trim() || null });
    if (needCourier && cRate) rows.push({ order_id: order.id, reviewer_id: order.buyer_id, target_kind: 'courier', rating: cRate, comment: cText.trim() || null });
    if (!rows.length) { toast('Yulduzcha qo\'ying', 'error'); return; }
    setBusy(true);
    const { error } = await supabase.from('reviews').insert(rows);
    setBusy(false);
    if (error) toast(errMsg(error), 'error'); else onDone();
  }

  return (
    <div className="u-card" style={{ marginTop: 12 }}>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Baho bering</div>
      {needSeller && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>🍲 {seller?.shop_name || seller?.full_name || 'Oshxona'}</div>
          <Stars big value={sRate} onChange={setSRate} />
          <textarea className="u-textarea" style={{ marginTop: 8 }} placeholder="Taom qanday edi? (ixtiyoriy)" value={sText} onChange={(e) => setSText(e.target.value)} maxLength={500} />
        </div>
      )}
      {needCourier && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>🛵 Kuryer {courier?.full_name}</div>
          <Stars big value={cRate} onChange={setCRate} />
          <textarea className="u-textarea" style={{ marginTop: 8 }} placeholder="Yetkazish qanday o'tdi? (ixtiyoriy)" value={cText} onChange={(e) => setCText(e.target.value)} maxLength={500} />
        </div>
      )}
      <Button block loading={busy} onClick={submit}>Yuborish</Button>
    </div>
  );
}
