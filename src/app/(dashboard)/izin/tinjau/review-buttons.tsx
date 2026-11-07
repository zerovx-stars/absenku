'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/primitives';

export function ReviewButtons({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act(action: 'approve' | 'reject') {
    setBusy(true);
    const res = await fetch(`/api/leave/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast.error(body.error ?? 'Aksi gagal.'); return; }
    toast.success(action === 'approve' ? 'Pengajuan disetujui.' : 'Pengajuan ditolak.'); router.refresh();
  }
  return (
    <div className="flex gap-2">
      <Button loading={busy} onClick={() => act('approve')}>Setujui</Button>
      <Button variant="ghost" className="border border-red-300 !text-red-600" disabled={busy} onClick={() => act('reject')}>Tolak</Button>
    </div>
  );
}
