import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button, DELIVERY_LABEL, Icon, MapView, Switch, dayTime, haversineKm, kmLabel, money, type DeliveryStatus, type MapMarker } from '@uyovqat/shared';
import { useCourier } from '../courier';

const STEP: Record<DeliveryStatus, { next: DeliveryStatus; label: string } | null> = {
  assigned: { next: 'picked_up', label: 'Oldim' },
  picked_up: { next: 'on_the_way', label: 'Yo\'ldaman' },
  on_the_way: { next: 'delivered', label: 'Yetkazdim' },
  delivered: null,
};
const ORDER: DeliveryStatus[] = ['assigned', 'picked_up', 'on_the_way', 'delivered'];

export default function MapPage() {
  const { courier, pos, job, setAvailability, advance } = useCourier();
  const free = courier?.availability === 'free';

  const { markers, route } = useMemo(() => {
    const m: MapMarker[] = [];
    const r: [number, number][] = [];
    if (pos) { m.push({ id: 'me', lat: pos.lat, lng: pos.lng, kind: 'me', label: 'Siz' }); r.push([pos.lat, pos.lng]); }
    if (job) {
      const o = job.order;
      if (o.pickup_lat != null && o.pickup_lng != null) { m.push({ id: 'shop', lat: o.pickup_lat, lng: o.pickup_lng, kind: 'shop', label: job.seller?.shop_name ?? 'Oshxona' }); r.push([o.pickup_lat, o.pickup_lng]); }
      if (o.delivery_lat != null && o.delivery_lng != null) { m.push({ id: 'home', lat: o.delivery_lat, lng: o.delivery_lng, kind: 'home', label: 'Mijoz' }); r.push([o.delivery_lat, o.delivery_lng]); }
    }
    return { markers: m, route: r };
  }, [pos, job]);

  const distShop = pos && job?.order.pickup_lat != null ? haversineKm([pos.lat, pos.lng], [job.order.pickup_lat, job.order.pickup_lng!]) : null;
  const step = job ? STEP[job.assignment.delivery_status] : null;
  const idx = job ? ORDER.indexOf(job.assignment.delivery_status) : -1;
  const o = job?.order;

  return (
    <div style={{ position: 'relative' }}>
      <MapView className="full" markers={markers} route={job ? route : undefined} />

      <div style={{ position: 'absolute', zIndex: 500, left: 12, right: 12, top: 'calc(var(--safe-top) + 12px)' }}>
        <div className="u-card" style={{ display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-md)', padding: 12 }}>
          <span className={`u-badge ${free ? 'success' : ''}`} style={{ height: 34, width: 34, justifyContent: 'center', padding: 0, fontSize: 16 }}>{free ? '🟢' : '⚪'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800 }}>{job ? 'Buyurtma bajarilmoqda' : free ? 'Siz bo\'shsiz' : 'Siz bandsiz'}</div>
            <div className="u-muted" style={{ fontSize: 12.5, fontWeight: 600 }}>
              {job ? 'Yetkazgach avtomatik bo\'sh bo\'lasiz' : free ? 'Eng yaqin buyurtma sizga avtomatik beriladi' : 'Buyurtma olish uchun "bo\'sh" ni yoqing'}
            </div>
          </div>
          <Switch on={free || !!job} onChange={(v) => void setAvailability(v ? 'free' : 'busy')} label="Bo'sh / band" />
        </div>
      </div>

      {job && o && (
        <motion.div key={job.assignment.id} initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          style={{ position: 'absolute', zIndex: 500, left: 12, right: 12, bottom: 12 }}>
          <div className="u-card" style={{ boxShadow: 'var(--shadow-lg)' }}>
            <div className="u-row" style={{ justifyContent: 'space-between' }}>
              <span className="u-badge brand">{DELIVERY_LABEL[job.assignment.delivery_status]}</span>
              <span className="u-muted" style={{ fontWeight: 700, fontSize: 13 }}>{distShop != null ? `Oshxonagacha ${kmLabel(distShop)}` : ''}</span>
            </div>
            <div className="u-row" style={{ gap: 4, margin: '12px 0' }}>
              {ORDER.map((s, i) => <div key={s} style={{ flex: 1, height: 5, borderRadius: 3, background: i <= idx ? 'var(--brand)' : 'var(--line)', transition: 'background .4s' }} />)}
            </div>
            <div className="u-kv"><span>🍲 Olish</span><b>{job.seller?.shop_name ?? 'Oshxona'}{job.seller?.address ? ` · ${job.seller.address}` : ''}</b></div>
            <div className="u-kv"><span><Icon name="pin" size={16} /> Yetkazish</span><b>{o.delivery_address}</b></div>
            <div className="u-kv"><span>Tayyor bo'lish</span><b>{dayTime(o.ready_at)}</b></div>
            <div className="u-kv"><span>{o.payment_method === 'cash' ? '💵 Naqd olinadi' : '💳 Karta'}</span><b>{o.payment_method === 'cash' ? money(o.total) : 'to\'langan/terminal'}</b></div>
            <div className="u-row" style={{ marginTop: 12 }}>
              {job.buyer?.phone && <a className="u-btn soft" href={`tel:${job.buyer.phone}`} aria-label="Mijozga qo'ng'iroq"><Icon name="phone" size={20} /></a>}
              {step && <Button style={{ flex: 1 }} onClick={() => void advance(step.next)}>{step.label}</Button>}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
