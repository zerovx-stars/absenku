'use client';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Circle, CircleMarker, Map as LMap } from 'leaflet';
import { toast } from 'sonner';
import { Button, Input, Label } from '@/components/ui/primitives';
import { createClient } from '@/lib/supabase/client';
import type { SchoolSettings } from '@/types';

export function SettingsForm({ initial }: { initial: SchoolSettings }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const circle = useRef<Circle | null>(null);
  const marker = useRef<CircleMarker | null>(null);
  const [ready, setReady] = useState(false);

  // Peta interaktif: klik untuk memindahkan titik sekolah
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      if (cancelled || !el.current) return;
      const map = L.map(el.current).setView([initial.lat, initial.lng], 17);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
      circle.current = L.circle([initial.lat, initial.lng], { radius: initial.radius_m, color: '#4f46e5', fillOpacity: 0.12 }).addTo(map);
      marker.current = L.circleMarker([initial.lat, initial.lng], { radius: 7, color: '#fff', weight: 2, fillColor: '#4f46e5', fillOpacity: 1 }).addTo(map);
      map.on('click', (e) => setS((p) => ({ ...p, lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) })));
      mapRef.current = map; setReady(true);
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [initial.lat, initial.lng, initial.radius_m]);

  useEffect(() => {
    if (!ready || !Number.isFinite(s.lat) || !Number.isFinite(s.lng)) return;
    circle.current?.setLatLng([s.lat, s.lng]); marker.current?.setLatLng([s.lat, s.lng]);
    if (s.radius_m > 0) circle.current?.setRadius(s.radius_m);
  }, [s.lat, s.lng, s.radius_m, ready]);

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 1024 * 1024) { toast.error('Logo harus gambar maksimal 1 MB.'); return; }
    const sb = createClient();
    const path = `logo-${Date.now()}.${file.name.split('.').pop()?.toLowerCase() ?? 'png'}`;
    const { error } = await sb.storage.from('school-assets').upload(path, file, { upsert: true });
    if (error) { toast.error('Gagal mengunggah logo.'); return; }
    setS((p) => ({ ...p, logo_url: sb.storage.from('school-assets').getPublicUrl(path).data.publicUrl }));
    toast.success('Logo diunggah. Klik Simpan untuk menerapkan.');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (![s.lat, s.lng, s.radius_m, s.late_tolerance_min].every(Number.isFinite) || s.radius_m <= 0 || s.name.trim().length < 3) { toast.error('Periksa kembali isian: nama, koordinat, dan radius harus valid.'); return; }
    setBusy(true);
    const { error } = await createClient().from('school_settings').update({
      name: s.name.trim(), logo_url: s.logo_url, lat: s.lat, lng: s.lng, radius_m: Math.round(s.radius_m),
      geofence_mode: s.geofence_mode, start_time: s.start_time, late_tolerance_min: Math.round(s.late_tolerance_min),
    }).eq('id', 1);
    setBusy(false);
    if (error) { toast.error('Gagal menyimpan pengaturan.'); return; }
    toast.success('Pengaturan disimpan.'); router.refresh();
  }
  const num = (k: 'lat' | 'lng' | 'radius_m' | 'late_tolerance_min') => (e: React.ChangeEvent<HTMLInputElement>) => setS((p) => ({ ...p, [k]: e.target.value === '' ? NaN : Number(e.target.value) }));

  return (
    <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div><Label htmlFor="name">Nama sekolah</Label><Input id="name" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></div>
        <div><Label htmlFor="logo">Logo</Label><Input id="logo" type="file" accept="image/*" onChange={uploadLogo} />
          {s.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logo_url} alt="Logo sekolah" className="mt-2 h-12 w-12 rounded object-cover" />
          ) : null}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="lat">Latitude</Label><Input id="lat" type="number" step="any" value={Number.isFinite(s.lat) ? s.lat : ''} onChange={num('lat')} /></div>
          <div><Label htmlFor="lng">Longitude</Label><Input id="lng" type="number" step="any" value={Number.isFinite(s.lng) ? s.lng : ''} onChange={num('lng')} /></div>
          <div><Label htmlFor="radius">Radius geofence (m)</Label><Input id="radius" type="number" min={10} value={Number.isFinite(s.radius_m) ? s.radius_m : ''} onChange={num('radius_m')} /></div>
          <div><Label htmlFor="mode">Di luar radius</Label>
            <select id="mode" value={s.geofence_mode} onChange={(e) => setS({ ...s, geofence_mode: e.target.value as SchoolSettings['geofence_mode'] })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
              <option value="flag">Tandai Di Luar Area</option><option value="reject">Tolak absen</option></select></div>
          <div><Label htmlFor="start">Jam masuk</Label><Input id="start" type="time" value={s.start_time} onChange={(e) => setS({ ...s, start_time: e.target.value })} /></div>
          <div><Label htmlFor="tol">Toleransi terlambat (menit)</Label><Input id="tol" type="number" min={0} value={Number.isFinite(s.late_tolerance_min) ? s.late_tolerance_min : ''} onChange={num('late_tolerance_min')} /></div>
        </div>
        <Button type="submit" loading={busy}>Simpan pengaturan</Button>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-slate-500">Klik peta untuk menentukan titik sekolah. Lingkaran menunjukkan radius geofence.</p>
        <div ref={el} className="z-0 h-96 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800" aria-label="Peta titik sekolah" />
      </div>
    </form>
  );
}
