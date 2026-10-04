import { Geolocation } from '@capacitor/geolocation';

export interface LatLng { lat: number; lng: number }

/** Joriy joylashuvni bir marta oladi (Android'da ruxsat so'raydi, brauzerda navigator.geolocation). */
export async function getPosition(): Promise<LatLng> {
  try {
    await Geolocation.requestPermissions().catch(() => undefined);
  } catch { /* brauzerda requestPermissions yo'q */ }
  const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
  return { lat: p.coords.latitude, lng: p.coords.longitude };
}

/** Joylashuvni kuzatadi; to'xtatish funksiyasini qaytaradi. */
export async function watchPosition(cb: (p: LatLng) => void, onError?: (e: unknown) => void): Promise<() => void> {
  try {
    await Geolocation.requestPermissions().catch(() => undefined);
  } catch { /* noop */ }
  const id = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 20000 }, (pos, err) => {
    if (err) { onError?.(err); return; }
    if (pos) cb({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  });
  return () => { void Geolocation.clearWatch({ id }); };
}
