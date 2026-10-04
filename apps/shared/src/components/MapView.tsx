import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapMarker { id: string; lat: number; lng: number; kind: 'me' | 'shop' | 'home'; label?: string }

const icon = (kind: MapMarker['kind']) =>
  L.divIcon({
    className: '',
    iconSize: kind === 'me' ? [22, 22] : [38, 38],
    iconAnchor: kind === 'me' ? [11, 11] : [19, 38],
    html: kind === 'me' ? '<div class="u-me"></div>'
      : `<div class="u-pin ${kind === 'home' ? 'home' : ''}"><span>${kind === 'home' ? '🏠' : '🍲'}</span></div>`,
  });

/** OpenStreetMap ustidagi xarita: kuryer joylashuvi (ko'k nuqta), sotuvchi va manzil belgilari, yo'nalish chizig'i. */
export function MapView({ markers, route, className = '', fit = true }: { markers: MapMarker[]; route?: [number, number][]; className?: string; fit?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([41.3111, 69.2797], 13); // Toshkent
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    L.control.zoom({ position: 'topright' }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    setTimeout(() => m.invalidateSize(), 120);
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    markers.forEach((k) => {
      const mk = L.marker([k.lat, k.lng], { icon: icon(k.kind) }).addTo(g);
      if (k.label) mk.bindTooltip(k.label, { direction: 'top', offset: [0, k.kind === 'me' ? -10 : -36] });
    });
    if (route && route.length > 1) L.polyline(route, { color: '#ff6a13', weight: 5, opacity: 0.85, dashArray: '2 10', lineCap: 'round' }).addTo(g);
    if (fit && markers.length && !fitted.current) {
      fitted.current = true;
      const b = L.latLngBounds(markers.map((k) => [k.lat, k.lng] as [number, number]));
      if (markers.length === 1) m.setView(b.getCenter(), 15); else m.fitBounds(b, { padding: [50, 50], maxZoom: 16 });
    }
  }, [markers, route, fit]);

  return <div ref={el} className={`u-map ${className}`} />;
}
