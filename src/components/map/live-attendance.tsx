'use client';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LayerGroup, Map as LMap } from 'leaflet';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { STATUS_COLOR, STATUS_LABEL, wib } from '@/lib/status';

type Row = { id: string; student_id: string; status: string; scanned_at: string | null; lat: number | null; lng: number | null; distance_m: number | null };
type School = { lat: number; lng: number; radius_m: number };
const COLS = 'id,student_id,status,scanned_at,lat,lng,distance_m';

// Daftar kehadiran + peta realtime (Supabase Realtime) untuk satu sesi
export function LiveAttendance({ sessionId, school }: { sessionId: string; school: School }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leaflet = useRef<typeof import('leaflet') | null>(null);
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      if (cancelled || !el.current) return;
      const map = L.map(el.current).setView([school.lat, school.lng], 17);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
      L.circle([school.lat, school.lng], { radius: school.radius_m, color: '#4f46e5', fillOpacity: 0.08 }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      leaflet.current = L; mapRef.current = map; setReady(true);
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; layerRef.current = null; setReady(false); };
  }, [school.lat, school.lng, school.radius_m]);

  useEffect(() => {
    const sb = createClient();
    const loadNames = async (ids: string[]) => {
      if (!ids.length) return;
      const { data } = await sb.from('profiles').select('id,full_name').in('id', ids);
      if (data) setNames((n) => ({ ...n, ...Object.fromEntries(data.map((p: { id: string; full_name: string }) => [p.id, p.full_name])) }));
    };
    sb.from('attendances').select(COLS).eq('session_id', sessionId).then(({ data }) => {
      const list = (data ?? []) as Row[];
      setRows(Object.fromEntries(list.map((r) => [r.id, r])));
      loadNames(Array.from(new Set(list.map((r) => r.student_id))));
    });
    const ch = sb.channel(`att-${sessionId}`).on('postgres_changes',
      { event: '*', schema: 'public', table: 'attendances', filter: `session_id=eq.${sessionId}` },
      (payload) => {
        const r = payload.new as Row;
        if (!r?.id) return;
        setRows((p) => ({ ...p, [r.id]: r }));
        loadNames([r.student_id]);
      }).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [sessionId]);

  // Koreksi status manual oleh guru/admin: alasan wajib, tercatat di audit log
  async function changeStatus(r: Row, status: string) {
    if (status === r.status) return;
    const note = window.prompt(`Alasan mengubah status ${names[r.student_id] ?? 'murid'} menjadi ${STATUS_LABEL[status]}:`);
    if (!note || note.trim().length < 3) { toast.error('Perubahan dibatalkan: alasan wajib diisi.'); return; }
    const res = await fetch(`/api/attendance/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, note }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(body.error ?? 'Gagal mengubah status.'); return; }
    setRows((p) => ({ ...p, [r.id]: { ...r, status } }));
    toast.success('Status diperbarui.');
  }

  const list = useMemo(() => Object.values(rows).sort((a, b) => (b.scanned_at ?? '').localeCompare(a.scanned_at ?? '')), [rows]);

  useEffect(() => {
    const L = leaflet.current; const g = layerRef.current;
    if (!ready || !L || !g) return;
    g.clearLayers();
    list.forEach((r) => {
      if (r.lat == null || r.lng == null) return;
      const pop = document.createElement('div'); // textContent mencegah injeksi HTML
      pop.textContent = `${names[r.student_id] ?? 'Murid'} · ${STATUS_LABEL[r.status] ?? r.status} · ${wib(r.scanned_at)} WIB · ${Math.round(r.distance_m ?? 0)} m dari sekolah`;
      L.circleMarker([r.lat, r.lng], { radius: 8, color: '#fff', weight: 2, fillColor: STATUS_COLOR[r.status] ?? '#6b7280', fillOpacity: 1 }).bindPopup(pop).addTo(g);
    });
  }, [list, names, ready]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Kehadiran ({list.length})</h2>
        {list.length === 0 ? <p className="mt-3 text-sm text-slate-500">Belum ada murid yang absen.</p> : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {list.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate">{names[r.student_id] ?? 'Memuat…'}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                  {wib(r.scanned_at)}
                  <span className="rounded-full px-2 py-0.5 font-medium text-white" style={{ background: STATUS_COLOR[r.status] ?? '#6b7280' }}>{STATUS_LABEL[r.status] ?? r.status}</span>
                  <select aria-label="Ubah status" value={r.status} onChange={(e) => changeStatus(r, e.target.value)} className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-900">
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div ref={el} className="z-0 h-80 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 lg:h-full lg:min-h-80" aria-label="Peta lokasi absen" />
    </div>
  );
}
