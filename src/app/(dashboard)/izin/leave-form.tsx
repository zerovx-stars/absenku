'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Alert, Button, Input, Label } from '@/components/ui/primitives';
import { createClient } from '@/lib/supabase/client';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

export function LeaveForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [type, setType] = useState<'izin' | 'sakit'>('sakit');
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (reason.trim().length < 5) { setError('Alasan minimal 5 karakter.'); return; }
    if (file && (file.size > 3 * 1024 * 1024 || !/^(image\/|application\/pdf)/.test(file.type))) { setError('Bukti harus gambar atau PDF maksimal 3 MB.'); return; }
    setBusy(true);
    const sb = createClient();
    let proof_path: string | null = null;
    if (file) { // folder = id murid agar sesuai kebijakan Storage
      proof_path = `${userId}/${crypto.randomUUID()}.${file.name.split('.').pop()?.toLowerCase() ?? 'bin'}`;
      const up = await sb.storage.from('leave-proofs').upload(proof_path, file);
      if (up.error) { setBusy(false); setError('Gagal mengunggah bukti. Coba lagi.'); return; }
    }
    const { error } = await sb.from('leave_requests').insert({ student_id: userId, type, leave_date: date, reason: reason.trim(), proof_path, status: 'pending' });
    setBusy(false);
    if (error) { setError('Gagal mengirim pengajuan.'); return; }
    toast.success('Pengajuan terkirim, menunggu persetujuan guru.'); setReason(''); setFile(null); router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
      {error ? <div className="sm:col-span-2"><Alert>{error}</Alert></div> : null}
      <div><Label htmlFor="type">Jenis</Label><select id="type" value={type} onChange={(e) => setType(e.target.value as 'izin' | 'sakit')} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="sakit">Sakit</option><option value="izin">Izin</option></select></div>
      <div><Label htmlFor="date">Tanggal</Label><Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
      <div className="sm:col-span-2"><Label htmlFor="reason">Alasan</Label><Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required /></div>
      <div className="sm:col-span-2"><Label htmlFor="proof">Bukti (surat dokter/foto, opsional)</Label><Input id="proof" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
      <div className="sm:col-span-2"><Button type="submit" loading={busy}>Kirim pengajuan</Button></div>
    </form>
  );
}
