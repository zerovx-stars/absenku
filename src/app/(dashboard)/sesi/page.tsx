import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { wib } from '@/lib/status';
import { CreateSessionForm } from './create-session-form';

type S = { id: string; title: string; status: string; starts_at: string; classes: { name: string } | { name: string }[] | null };
const className = (c: S['classes']) => (Array.isArray(c) ? c[0]?.name : c?.name) ?? '-';

export default async function SesiPage() {
  const me = await getMe();
  if (!me || (me.role !== 'admin' && me.role !== 'guru_piket')) redirect('/');
  const [{ data: classes }, { data: sessions }, { data: cfg }] = await Promise.all([
    me.supabase.from('classes').select('id,name').order('name'),
    me.supabase.from('attendance_sessions').select('id,title,status,starts_at,classes(name)').order('starts_at', { ascending: false }).limit(20),
    me.supabase.from('school_settings').select('late_tolerance_min').eq('id', 1).maybeSingle(),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Sesi Absensi</h1>
      <CreateSessionForm classes={classes ?? []} tolerance={cfg?.late_tolerance_min ?? 10} />
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Sesi terbaru</h2>
        {!sessions?.length ? <p className="mt-3 text-sm text-slate-500">Belum ada sesi.</p> : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {(sessions as S[]).map((s) => (
              <li key={s.id}>
                <Link href={`/sesi/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-indigo-600">
                  <span>{s.title} <span className="text-slate-500">· {className(s.classes)}</span></span>
                  <span className="text-xs text-slate-500">{wib(s.starts_at, { dateStyle: 'medium', timeStyle: 'short' })} · {s.status === 'open' ? 'Dibuka' : s.status === 'closed' ? 'Ditutup' : 'Draf'}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
