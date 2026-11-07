'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Alert, Button, Input, Label } from '@/components/ui/primitives';

const pad = (n: number) => String(n).padStart(2, '0');
const local = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function CreateSessionForm({ classes, tolerance }: { classes: { id: string; name: string }[]; tolerance: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState(() => ({
    class_id: classes[0]?.id ?? '', title: '', starts_at: local(new Date()), ends_at: local(new Date(Date.now() + 90 * 60_000)),
    late_tolerance_min: tolerance, qr_interval_sec: 30,
  }));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      const res = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        ...f, starts_at: new Date(f.starts_at).toISOString(), ends_at: new Date(f.ends_at).toISOString(),
        late_tolerance_min: Number(f.late_tolerance_min), qr_interval_sec: Number(f.qr_interval_sec),
      }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error ?? 'Gagal membuat sesi.'); return; }
      toast.success('Sesi dibuka.');
      router.push(`/sesi/${body.id}`);
    } catch { setError('Tidak dapat terhubung ke server.'); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
      {error ? <div className="sm:col-span-2"><Alert>{error}</Alert></div> : null}
      <div><Label htmlFor="class_id">Kelas</Label>
        <select id="class_id" value={f.class_id} onChange={set('class_id')} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></div>
      <div><Label htmlFor="title">Judul / pelajaran</Label><Input id="title" value={f.title} onChange={set('title')} placeholder="Matematika" required /></div>
      <div><Label htmlFor="starts_at">Jam mulai</Label><Input id="starts_at" type="datetime-local" value={f.starts_at} onChange={set('starts_at')} required /></div>
      <div><Label htmlFor="ends_at">Jam selesai</Label><Input id="ends_at" type="datetime-local" value={f.ends_at} onChange={set('ends_at')} required /></div>
      <div><Label htmlFor="tol">Toleransi terlambat (menit)</Label><Input id="tol" type="number" min={0} max={120} value={f.late_tolerance_min} onChange={set('late_tolerance_min')} /></div>
      <div><Label htmlFor="iv">Ganti QR tiap (detik, 30–60)</Label><Input id="iv" type="number" min={30} max={60} value={f.qr_interval_sec} onChange={set('qr_interval_sec')} /></div>
      <div className="sm:col-span-2"><Button type="submit" loading={busy} disabled={!f.class_id}>Buka sesi absensi</Button></div>
    </form>
  );
}
