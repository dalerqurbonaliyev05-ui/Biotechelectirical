import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon, MapView, haversineKm, kmLabel, onTableChange, supabase, useInterval, type Courier, type MapMarker, type Order, type Profile } from '@uyovqat/shared';

const SPEED_KMH = 20;   // shahar ichida skuter/velosiped uchun taxminiy tezlik
const STALE_MS = 2 * 60_000;

/**
 * Kuryer yo'lga chiqqach (olib ketgan) xaridorga uning joylashuvini xaritada ko'rsatadi.
 * Joylashuvni bazadan faqat shu paytda o'qish mumkin (RLS: uy_can_track_courier), realtime + zaxira so'rov.
 */
export function CourierTracker({ order, courier }: { order: Order; courier: Profile }) {
  const [loc, setLoc] = useState<Pick<Courier, 'lat' | 'lng' | 'location_updated_at'> | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const fetchLoc = useCallback(async () => {
    const { data } = await supabase.from('couriers').select('lat, lng, location_updated_at').eq('id', courier.id).maybeSingle();
    if (data) setLoc(data as Pick<Courier, 'lat' | 'lng' | 'location_updated_at'>);
  }, [courier.id]);

  useEffect(() => {
    void fetchLoc();
    return onTableChange('couriers', (p) => {
      const n = p.new as Partial<Courier>;
      if (n && n.lat !== undefined) setLoc({ lat: n.lat ?? null, lng: n.lng ?? null, location_updated_at: n.location_updated_at ?? null });
    }, `id=eq.${courier.id}`);
  }, [courier.id, fetchLoc]);

  // Realtime uzilib qolsa ham xarita yangilanib turadi.
  useInterval(() => { void fetchLoc(); setNow(Date.now()); }, 15_000);

  const home: [number, number] | null = order.delivery_lat != null && order.delivery_lng != null ? [order.delivery_lat, order.delivery_lng] : null;
  const there: [number, number] | null = loc?.lat != null && loc.lng != null ? [loc.lat, loc.lng] : null;

  const markers = useMemo<MapMarker[]>(() => {
    const m: MapMarker[] = [];
    if (there) m.push({ id: 'courier', lat: there[0], lng: there[1], kind: 'courier', label: courier.full_name });
    if (home) m.push({ id: 'home', lat: home[0], lng: home[1], kind: 'home', label: 'Manzilingiz' });
    return m;
  }, [there?.[0], there?.[1], home?.[0], home?.[1], courier.full_name]);   // eslint-disable-line react-hooks/exhaustive-deps

  const km = there && home ? haversineKm(there, home) : null;
  const mins = km != null ? Math.max(1, Math.round((km / SPEED_KMH) * 60)) : null;
  const ageMs = loc?.location_updated_at ? now - new Date(loc.location_updated_at).getTime() : null;
  const stale = ageMs != null && ageMs > STALE_MS;

  return (
    <div className="u-card" style={{ padding: 12 }}>
      <div className="u-row" style={{ justifyContent: 'space-between', padding: '4px 4px 10px' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>🛵 {courier.full_name} yo'lda</div>
          <div className="u-muted" style={{ fontWeight: 600, fontSize: 13 }}>
            {km != null ? <>Sizgacha {kmLabel(km)} · taxminan <b style={{ color: 'var(--text)' }}>{mins} daq</b></> : there ? 'Kuryer xaritada' : 'Kuryer joylashuvi kutilmoqda…'}
          </div>
        </div>
        {courier.phone && <a className="u-iconbtn" href={`tel:${courier.phone}`} aria-label="Kuryerga qo'ng'iroq" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}><Icon name="phone" /></a>}
      </div>
      {markers.length > 0 ? <MapView markers={markers} route={there && home ? [there, home] : undefined} />
        : <div className="u-map" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)', fontWeight: 700 }}>Joylashuv hali ma'lum emas</div>}
      {stale && <div className="u-hint" style={{ padding: '8px 4px 0' }}>⚠️ Oxirgi yangilanish {Math.round((ageMs ?? 0) / 60000)} daqiqa oldin. Kuryerning aloqasi uzilgan bo'lishi mumkin.</div>}
    </div>
  );
}
