import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { wib } from '@/lib/status';
import { AttendanceChart } from '@/components/charts/attendance-chart';
import { Card, Greeting } from '@/components/layout/greeting';

const RANGES = { harian: { days: 14, bucket: 'day' }, mingguan: { days: 84, bucket: 'week' }, bulanan: { days: 365, bucket: 'month' } } as const;
type RangeKey = keyof typeof RANGES;
const ACTIONS: Record<string, string> = { 'session.create': 'Membuka sesi absensi', 'session.close': 'Menutup sesi absensi' };

type Daily = { day: string; hadir: number; terlambat: number; alfa: number; izin: number; sakit: number; di_luar_area: number };
type Rank = { class_name: string; total: number; pct: number | null };
type Issue = { student_id: string; full_name: string; class_name: string | null; late: number; alfa: number };

export default async function AdminPage({ searchParams }: { searchParams: { range?: string } }) {
  const me = await getMe();
  if (!me || me.role !== 'admin') redirect('/');
  const key: RangeKey = searchParams.range && searchParams.range in RANGES ? (searchParams.range as RangeKey) : 'harian';
  const r = RANGES[key];
  const sb = me.supabase;
  const count = (t: string) => sb.from(t).select('*', { count: 'exact', head: true });
  const [students, teachers, classes, daily, rank, issues, logs] = await Promise.all([
    count('students'), count('teachers'), count('classes'),
    sb.rpc('dashboard_daily', { p_days: r.days, p_bucket: r.bucket }),
    sb.rpc('dashboard_class_rank', { p_days: 30 }),
    sb.rpc('dashboard_top_issues', { p_days: 30 }),
    sb.from('audit_logs').select('id,action,created_at,actor_id').order('created_at', { ascending: false }).limit(8),
  ]);
  const actorIds = Array.from(new Set((logs.data ?? []).map((l: { actor_id: string | null }) => l.actor_id).filter(Boolean))) as string[];
  const { data: actors } = actorIds.length ? await sb.from('profiles').select('id,full_name').in('id', actorIds) : { data: [] };
  const actorName = new Map((actors ?? []).map((a: { id: string; full_name: string }) => [a.id, a.full_name]));

  const fmt = new Intl.DateTimeFormat('id-ID', key === 'bulanan' ? { month: 'short', year: '2-digit', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const chart = ((daily.data ?? []) as Daily[]).map((d) => ({ ...d, label: (key === 'mingguan' ? 'Mgg ' : '') + fmt.format(new Date(d.day)) }));
  const stats = [['Murid', students.count], ['Guru', teachers.count], ['Kelas', classes.count]] as const;

  return (
    <div className="space-y-4">
      <Greeting name={me.fullName} subtitle="Ringkasan kehadiran seluruh sekolah." />
      <div className="grid grid-cols-3 gap-3">
        {stats.map(([label, n]) => (
          <Card key={label}><p className="text-sm text-slate-500">Total {label}</p><p className="mt-1 text-3xl font-semibold">{n ?? 0}</p></Card>
        ))}
      </div>
      <Card title="Grafik kehadiran">
        <nav className="mb-3 flex gap-2 text-sm" aria-label="Rentang grafik">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <Link key={k} href={`/admin?range=${k}`} className={`rounded-full px-3 py-1 capitalize ${k === key ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{k}</Link>
          ))}
        </nav>
        <AttendanceChart data={chart} />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Ranking kelas (30 hari)">
          {!rank.data?.length ? <p className="text-sm text-slate-500">Belum ada data.</p> : (
            <ol className="space-y-2 text-sm">
              {(rank.data as Rank[]).map((c, i) => (
                <li key={c.class_name} className="flex items-center justify-between"><span>{i + 1}. {c.class_name}</span><span className="font-medium">{c.pct ?? 0}% <span className="text-xs text-slate-400">({c.total} catatan)</span></span></li>
              ))}
            </ol>
          )}
        </Card>
        <Card title="Sering terlambat / alfa (30 hari)">
          {!issues.data?.length ? <p className="text-sm text-slate-500">Belum ada data.</p> : (
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {(issues.data as Issue[]).map((s) => (
                <li key={s.student_id} className="flex items-center justify-between py-1.5"><span>{s.full_name} <span className="text-slate-400">· {s.class_name ?? '-'}</span></span><span className="text-xs">Terlambat {s.late} · Alfa {s.alfa}</span></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card title="Log aktivitas terbaru">
        {!logs.data?.length ? <p className="text-sm text-slate-500">Belum ada aktivitas.</p> : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {logs.data.map((l: { id: number; action: string; created_at: string; actor_id: string | null }) => (
              <li key={l.id} className="flex justify-between py-1.5"><span>{actorName.get(l.actor_id ?? '') ?? 'Sistem'} · {ACTIONS[l.action] ?? l.action}</span><span className="text-xs text-slate-400">{wib(l.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</span></li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
