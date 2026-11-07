import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { Card } from '@/components/layout/greeting';
import { LeaveForm } from './leave-form';

const LABEL: Record<string, string> = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
const TONE: Record<string, string> = { pending: 'bg-amber-500', approved: 'bg-green-600', rejected: 'bg-red-600' };

export default async function IzinPage() {
  const me = await getMe();
  if (!me || me.role !== 'murid') redirect('/');
  const { data } = await me.supabase.from('leave_requests').select('id,type,leave_date,reason,status').eq('student_id', me.user.id).order('created_at', { ascending: false }).limit(20);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Izin / Sakit</h1>
      <LeaveForm userId={me.user.id} />
      <Card title="Pengajuan saya">
        {!data?.length ? <p className="text-sm text-slate-500">Belum ada pengajuan.</p> : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {data.map((l: { id: string; type: string; leave_date: string; reason: string; status: string }) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0"><b className="capitalize">{l.type}</b> · {l.leave_date}<span className="block truncate text-slate-500">{l.reason}</span></span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs text-white ${TONE[l.status]}`}>{LABEL[l.status]}</span></li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
