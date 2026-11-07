'use client';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

type Point = { lat: number; lng: number; color: string; label: string };
type School = { lat: number; lng: number; radius_m: number };

// Peta satu titik: lokasi absen terakhir (bukan pelacakan terus-menerus)
export function LastLocationMap({ point, school }: { point: Point; school: School }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let map: import('leaflet').Map | undefined;
    (async () => {
      const L = await import('leaflet');
      if (cancelled || !el.current) return;
      map = L.map(el.current).setView([point.lat, point.lng], 17);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
      L.circle([school.lat, school.lng], { radius: school.radius_m, color: '#4f46e5', fillOpacity: 0.08 }).addTo(map);
      const pop = document.createElement('div');
      pop.textContent = point.label;
      L.circleMarker([point.lat, point.lng], { radius: 9, color: '#fff', weight: 2, fillColor: point.color, fillOpacity: 1 }).bindPopup(pop).addTo(map);
    })();
    return () => { cancelled = true; map?.remove(); };
  }, [point.lat, point.lng, point.color, point.label, school.lat, school.lng, school.radius_m]);
  return <div ref={el} className="z-0 h-56 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800" aria-label="Peta lokasi absen terakhir" />;
}
