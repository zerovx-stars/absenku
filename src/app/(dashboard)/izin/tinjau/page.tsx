import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card } from '@/components/layout/greeting';
import { ReviewButtons } from './review-buttons';

type L = { id: string; student_id: string; type: string; leave_date: string; reason: string; proof_path: string | null; status: string };

export default async function TinjauPage() {
  const me = await getMe();
  if (!me || (me.role !== 'admin' && me.role !== 'guru_piket')) redirect('/');
  // RLS: guru hanya melihat pengajuan murid di kelas terkait
  const { data } = await me.supabase.from('leave_requests').select('id,student_id,type,leave_date,reason,proof_path,status').order('created_at', { ascending: false }).limit(60);
  const list = (data ?? []) as L[];
  const ids = Array.from(new Set(list.map((l) => l.student_id)));
  const { data: names } = ids.length ? await me.supabase.from('profiles').select('id,full_name').in('id', ids) : { data: [] };
  const nameOf = new Map((names ?? []).map((n: { id: string; full_name: string }) => [n.id, n.full_name]));
  // Tautan bukti berlaku 10 menit; dibuat server setelah pengajuan lolos RLS
  const admin = createAdminClient();
  const proofs = new Map<string, string>();
  await Promise.all(list.filter((l) => l.proof_path).map(async (l) => {
    const { data: s } = await admin.storage.from('leave-proofs').createSignedUrl(l.proof_path!, 600);
    if (s?.signedUrl) proofs.set(l.id, s.signedUrl);
  }));
  const pending = list.filter((l) => l.status === 'pending');
  const done = list.filter((l) => l.status !== 'pending').slice(0, 20);
  const row = (l: L, actions: boolean) => (
    <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
      <div className="min-w-0"><b>{nameOf.get(l.student_id) ?? 'Murid'}</b> · <span className="capitalize">{l.type}</span> · {l.leave_date}
        <p className="text-slate-500">{l.reason}</p>
        {proofs.get(l.id) ? <a href={proofs.get(l.id)} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">Lihat bukti</a> : null}</div>
      {actions ? <ReviewButtons id={l.id} /> : <span className="text-xs text-slate-500">{l.status === 'approved' ? 'Disetujui' : 'Ditolak'}</span>}
    </li>
  );
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pengajuan Izin / Sakit</h1>
      <Card title={`Menunggu persetujuan (${pending.length})`}>
        {pending.length ? <ul className="divide-y divide-slate-100 dark:divide-slate-800">{pending.map((l) => row(l, true))}</ul> : <p className="text-sm text-slate-500">Tidak ada pengajuan yang menunggu.</p>}
      </Card>
      <Card title="Sudah diproses">
        {done.length ? <ul className="divide-y divide-slate-100 dark:divide-slate-800">{done.map((l) => row(l, false))}</ul> : <p className="text-sm text-slate-500">Belum ada.</p>}
      </Card>
    </div>
  );
}
