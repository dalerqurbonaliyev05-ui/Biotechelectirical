export function money(n: number | string | null | undefined): string {
  const v = Math.round(Number(n ?? 0));
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' so\'m';
}

const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
const pad = (n: number) => String(n).padStart(2, '0');

export function timeHM(iso: string | Date): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Bugun, 18:30" / "Ertaga, 12:00" / "5 okt, 14:00" */
export function dayTime(iso: string | Date): string {
  const d = new Date(iso);
  const now = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(d) - start(now)) / 86400000);
  const day = diff === 0 ? 'Bugun' : diff === 1 ? 'Ertaga' : diff === -1 ? 'Kecha' : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return `${day}, ${timeHM(d)}`;
}

export function prepLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} daq`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h} soat ${m} daq` : `${h} soat`;
}

/** datetime-local maydoni uchun qiymat (mahalliy vaqt). */
export function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function kmLabel(km: number | null | undefined): string {
  if (km == null) return '';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/** Ikki nuqta orasidagi masofa, km (Haversine). */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
