import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { getMe } from '@/lib/auth';
import { wib } from '@/lib/status';
import { QrDisplay } from '@/components/qr/qr-display';
import { LiveAttendance } from '@/components/map/live-attendance';
import { SessionControls } from '../session-controls';

export default async function SesiDetailPage({ params }: { params: { id: string } }) {
  const me = await getMe();
  if (!me || (me.role !== 'admin' && me.role !== 'guru_piket')) redirect('/');
  if (!z.string().uuid().safeParse(params.id).success) notFound();
  const [{ data: s }, { data: cfg }] = await Promise.all([
    me.supabase.from('attendance_sessions').select('id,title,status,starts_at,ends_at,qr_interval_sec,late_tolerance_min,classes(name)').eq('id', params.id).maybeSingle(),
    me.supabase.from('school_settings').select('lat,lng,radius_m').eq('id', 1).maybeSingle(),
  ]);
  if (!s || !cfg) notFound();
  const cls = Array.isArray(s.classes) ? s.classes[0] : s.classes;
  const open = s.status === 'open' && new Date(s.ends_at) > new Date();
  return (
    <div className="space-y-4">
      <Link href="/sesi" className="text-sm text-indigo-600 hover:underline">← Semua sesi</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{s.title} · {cls?.name ?? '-'}</h1>
          <p className="text-sm text-slate-500">{wib(s.starts_at)}–{wib(s.ends_at)} WIB · toleransi {s.late_tolerance_min} menit · {open ? 'Dibuka' : 'Ditutup'}</p>
        </div>
        <SessionControls id={s.id} status={s.status} />
      </div>
      {open ? <div className="mx-auto max-w-xl"><QrDisplay sessionId={s.id} intervalSec={s.qr_interval_sec} /></div> : null}
      <LiveAttendance sessionId={s.id} school={cfg} />
    </div>
  );
}
