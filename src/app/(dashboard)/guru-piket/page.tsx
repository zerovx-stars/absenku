import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { one, todayWib, wibDayRange } from '@/lib/dates';
import { STATUS_COLOR, STATUS_LABEL, wib } from '@/lib/status';
import { Card, Greeting } from '@/components/layout/greeting';

type S = { id: string; title: string; status: string; starts_at: string; ends_at: string; classes: { name: string } | { name: string }[] | null };

export default async function GuruPiketPage() {
  const me = await getMe();
  if (!me || me.role !== 'guru_piket') redirect('/');
  const { from, to } = wibDayRange(todayWib());
  const { data } = await me.supabase.from('attendance_sessions').select('id,title,status,starts_at,ends_at,classes(name)')
    .gte('starts_at', from).lte('starts_at', to).order('starts_at');
  const sessions = (data ?? []) as S[];
  const ids = sessions.map((s) => s.id);
  const { data: atts } = ids.length ? await me.supabase.from('attendances').select('session_id,status').in('session_id', ids) : { data: [] };
  const counts: Record<string, Record<string, number>> = {};
  (atts ?? []).forEach((a: { session_id: string; status: string }) => {
    counts[a.session_id] ??= {};
    counts[a.session_id][a.status] = (counts[a.session_id][a.status] ?? 0) + 1;
  });
  return (
    <div className="space-y-4">
      <Greeting name={me.fullName} subtitle="Pantau kehadiran hari ini dan kelola sesi absensi." />
      <Card title="Sesi hari ini">
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada sesi hari ini. <Link href="/sesi" className="text-indigo-600 hover:underline">Buka sesi baru</Link></p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link href={`/sesi/${s.id}`} className="block rounded-xl border border-slate-200 p-3 hover:border-indigo-400 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{s.title} · {one(s.classes)?.name ?? '-'}</span>
                    <span className="text-xs text-slate-500">{wib(s.starts_at)}–{wib(s.ends_at)} · {s.status === 'open' ? 'Dibuka' : 'Ditutup'}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {Object.keys(counts[s.id] ?? {}).length === 0 ? <span className="text-slate-400">Belum ada yang absen</span> : Object.entries(counts[s.id]).map(([st, n]) => (
                      <span key={st} className="rounded-full px-2 py-0.5 text-white" style={{ background: STATUS_COLOR[st] }}>{STATUS_LABEL[st]} {n}</span>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Link href="/sesi" className="inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">Kelola sesi absensi</Link>
    </div>
  );
}
