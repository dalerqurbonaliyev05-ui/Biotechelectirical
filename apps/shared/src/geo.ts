import { Capacitor, registerPlugin } from '@capacitor/core';
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
export interface GeoError { code?: string; message?: string }

export async function watchPosition(cb: (p: LatLng) => void, onError?: (e: GeoError) => void): Promise<() => void> {
  try {
    await Geolocation.requestPermissions().catch(() => undefined);
  } catch { /* noop */ }
  const id = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 20000 }, (pos, err) => {
    if (err) { onError?.(err as GeoError); return; }
    if (pos) cb({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  });
  return () => { void Geolocation.clearWatch({ id }); };
}

// ---- Fon rejimidagi joylashuv (Android foreground service) ----
// Native plagin faqat kuryer ilovasida o'rnatiladi (@capacitor-community/background-geolocation);
// boshqa ilovalarda va brauzerda oddiy watchPosition'ga qaytadi.
interface BgLocation { latitude: number; longitude: number; time?: number | null }
interface BgPlugin {
  addWatcher(
    opts: { backgroundMessage?: string; backgroundTitle?: string; requestPermissions?: boolean; stale?: boolean; distanceFilter?: number },
    cb: (location?: BgLocation, error?: GeoError) => void,
  ): Promise<string>;
  removeWatcher(opts: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
}
const BackgroundGeolocation = registerPlugin<BgPlugin>('BackgroundGeolocation');

export const isNativeApp = () => Capacitor.isNativePlatform();

/**
 * Ilova yopiq/fonda bo'lsa ham joylashuvni yetkazadi: Android'da bildirishnomali foreground service ishga tushadi
 * (tizim talabi). to'xtatish funksiyasini qaytaradi: tugatganda ALBATTA chaqiring (batareya).
 */
export async function watchBackground(
  cb: (p: LatLng) => void,
  onError: ((e: GeoError) => void) | undefined,
  text: { title: string; message: string },
): Promise<() => void> {
  if (!isNativeApp()) return watchPosition(cb, onError);
  const id = await BackgroundGeolocation.addWatcher(
    { backgroundTitle: text.title, backgroundMessage: text.message, requestPermissions: true, stale: false, distanceFilter: 20 },
    (loc, err) => {
      if (err) { onError?.(err); return; }
      if (loc) cb({ lat: loc.latitude, lng: loc.longitude });
    },
  );
  return () => { void BackgroundGeolocation.removeWatcher({ id }); };
}

export function openLocationSettings(): void {
  if (isNativeApp()) void BackgroundGeolocation.openSettings();
}
