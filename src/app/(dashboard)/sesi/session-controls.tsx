'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/primitives';

export function SessionControls({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act(action: 'open' | 'close') {
    if (action === 'close' && !confirm('Tutup sesi? Murid yang belum scan akan ditandai Alfa (atau Izin/Sakit bila disetujui).')) return;
    setBusy(true);
    const res = await fetch(`/api/session/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast.error(body.error ?? 'Aksi gagal.'); return; }
    toast.success(action === 'close' ? 'Sesi ditutup.' : 'Sesi dibuka kembali.');
    router.refresh();
  }
  return status === 'open'
    ? <Button variant="ghost" className="border border-red-300 !text-red-600" loading={busy} onClick={() => act('close')}>Tutup sesi</Button>
    : <Button variant="ghost" className="border border-slate-300" loading={busy} onClick={() => act('open')}>Buka kembali</Button>;
}
