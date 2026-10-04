import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { errMsg, getPosition, haversineKm, onTableChange, supabase, useAuth, useToast, watchPosition,
  type Availability, type Courier, type CourierAssignment, type DeliveryStatus, type LatLng, type Order, type Profile } from '@uyovqat/shared';

export interface ActiveJob { assignment: CourierAssignment; order: Order; seller: Profile | null; buyer: Profile | null }

interface Ctx {
  courier: Courier | null;
  pos: LatLng | null;
  job: ActiveJob | null;
  loading: boolean;
  setAvailability(a: Availability): Promise<void>;
  advance(next: DeliveryStatus): Promise<void>;
  reload(): Promise<void>;
}
const C = createContext<Ctx | null>(null);
export const useCourier = () => { const c = useContext(C); if (!c) throw new Error('CourierProvider yo\'q'); return c; };

const PUSH_EVERY_MS = 10_000;
const PUSH_MIN_KM = 0.03;

export function CourierProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const toast = useToast();
  const uid = session!.user.id;
  const [courier, setCourier] = useState<Courier | null>(null);
  const [pos, setPos] = useState<LatLng | null>(null);
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [loading, setLoading] = useState(true);
  const lastPush = useRef<{ at: number; p: LatLng } | null>(null);
  const hadJob = useRef<string | null>(null);

  const reload = useCallback(async () => {
    const [c, a] = await Promise.all([
      supabase.from('couriers').select('*').eq('id', uid).maybeSingle(),
      supabase.from('courier_assignments').select('*, orders(*)').eq('courier_id', uid).neq('delivery_status', 'delivered').order('assigned_at', { ascending: false }).limit(1),
    ]);
    setCourier((c.data as Courier | null) ?? null);
    const row = ((a.data as (CourierAssignment & { orders: Order | Order[] })[] | null) ?? [])[0];
    if (!row) { setJob(null); hadJob.current = null; setLoading(false); return; }
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    const [s, b] = await Promise.all([
      supabase.from('uy_profiles').select('*').eq('id', order.seller_id).maybeSingle(),
      supabase.from('uy_profiles').select('*').eq('id', order.buyer_id).maybeSingle(),
    ]);
    setJob({ assignment: row, order, seller: s.data as Profile | null, buyer: b.data as Profile | null });
    if (hadJob.current !== row.id) { if (hadJob.current === null) toast('🛵 Sizga yangi buyurtma biriktirildi!', 'success'); hadJob.current = row.id; }
    setLoading(false);
  }, [uid, toast]);

  useEffect(() => {
    void reload();
    const o1 = onTableChange('courier_assignments', () => void reload(), `courier_id=eq.${uid}`);
    const o2 = onTableChange('orders', () => void reload());   // RLS: faqat o'ziga biriktirilganlar keladi
    return () => { o1(); o2(); };
  }, [reload, uid]);

  // Joylashuvni kuzatish va bazaga (throttle bilan) yuborish.
  const push = useCallback(async (p: LatLng, force = false) => {
    const last = lastPush.current;
    if (!force && last && Date.now() - last.at < PUSH_EVERY_MS) return;
    if (!force && last && haversineKm([last.p.lat, last.p.lng], [p.lat, p.lng]) < PUSH_MIN_KM) return;
    lastPush.current = { at: Date.now(), p };
    await supabase.from('couriers').update({ lat: p.lat, lng: p.lng }).eq('id', uid);
  }, [uid]);

  useEffect(() => {
    let stop: (() => void) | undefined; let dead = false;
    watchPosition((p) => { setPos(p); void push(p); }, () => undefined).then((s) => { if (dead) s(); else stop = s; }).catch(() => undefined);
    return () => { dead = true; stop?.(); };
  }, [push]);

  const setAvailability = useCallback(async (a: Availability) => {
    try {
      let p = pos;
      if (a === 'free') {
        // Bo'sh bo'lish uchun joylashuv shart: eng yaqin kuryer shu bo'yicha tanlanadi.
        p = p ?? (await getPosition().catch(() => null));
        if (!p) { toast('Joylashuv aniqlanmadi. Ruxsat bering va qayta urinib ko\'ring.', 'error'); return; }
        setPos(p);
      }
      const patch = a === 'free' && p ? { availability: a, lat: p.lat, lng: p.lng } : { availability: a };
      const { error } = await supabase.from('couriers').update(patch).eq('id', uid);
      if (error) throw error;
      await reload();
    } catch (e) { toast(errMsg(e), 'error'); }
  }, [pos, uid, reload, toast]);

  const advance = useCallback(async (next: DeliveryStatus) => {
    if (!job) return;
    const { error } = await supabase.rpc('uy_courier_set_delivery', { p_order: job.order.id, p_status: next });
    if (error) { toast(errMsg(error), 'error'); return; }
    if (next === 'delivered') toast('Yetkazildi! Rahmat 👏', 'success');
    await reload();
  }, [job, reload, toast]);

  const value = useMemo(() => ({ courier, pos, job, loading, setAvailability, advance, reload }), [courier, pos, job, loading, setAvailability, advance, reload]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
