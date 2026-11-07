import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { dayWib, isPresent, one, todayWib } from '@/lib/dates';
import { STATUS_COLOR, STATUS_LABEL, wib } from '@/lib/status';
import { AttendanceCalendar, worst } from '@/components/layout/attendance-calendar';
import { Card, Greeting } from '@/components/layout/greeting';

type Row = { status: string; scanned_at: string | null; attendance_sessions: { starts_at: string; title: string } | { starts_at: string; title: string }[] | null };

export default async function MuridPage() {
  const me = await getMe();
  if (!me || me.role !== 'murid') redirect('/');
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const { data } = await me.supabase.from('attendances').select('status,scanned_at,attendance_sessions(starts_at,title)')
    .eq('student_id', me.user.id).gte('created_at', since).order('created_at', { ascending: false }).limit(300);
  const rows = ((data ?? []) as Row[]).map((r) => {
    const s = one(r.attendance_sessions);
    return { status: r.status, title: s?.title ?? 'Sesi', at: r.scanned_at, day: dayWib(s?.starts_at ?? r.scanned_at ?? new Date()) };
  });
  const today = todayWib();
  const [y, m] = today.split('-').map(Number);
  const last30 = rows.filter((r) => r.day >= dayWib(new Date(Date.now() - 30 * 864e5)));
  const pct = last30.length ? Math.round((100 * last30.filter((r) => isPresent(r.status)).length) / last30.length) : null;
  const byDay: Record<number, string> = {};
  rows.filter((r) => r.day.startsWith(`${y}-${String(m).padStart(2, '0')}`)).forEach((r) => {
    const d = Number(r.day.slice(8)); byDay[d] = worst(byDay[d], r.status);
  });
  const todayRows = rows.filter((r) => r.day === today);

  return (
    <div className="space-y-4">
      <Greeting name={me.fullName} subtitle="Absen mandiri dan lihat riwayat kehadiran Anda." />
      <Link href="/scan" className="flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-4 text-base font-semibold text-white hover:bg-indigo-700">Scan Absen</Link>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Status hari ini">
          {todayRows.length === 0 ? <p className="text-sm text-slate-500">Belum ada catatan absen hari ini.</p> : (
            <ul className="space-y-2 text-sm">{todayRows.map((r, i) => (
              <li key={i} className="flex items-center justify-between"><span>{r.title}</span>
                <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ background: STATUS_COLOR[r.status] }}>{STATUS_LABEL[r.status]}{r.at ? ` · ${wib(r.at)}` : ''}</span></li>
            ))}</ul>
          )}
        </Card>
        <Card title="Persentase kehadiran (30 hari)">
          <p className="text-4xl font-semibold">{pct === null ? '-' : `${pct}%`}</p>
          <p className="mt-1 text-xs text-slate-500">Hadir dan terlambat dihitung hadir.</p>
        </Card>
      </div>
      <Card title="Kalender kehadiran"><AttendanceCalendar year={y} month={m - 1} byDay={byDay} /></Card>
      <Card title="Riwayat terbaru">
        {rows.length === 0 ? <p className="text-sm text-slate-500">Belum ada riwayat.</p> : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">{rows.slice(0, 10).map((r, i) => (
            <li key={i} className="flex items-center justify-between py-2"><span>{r.title} <span className="text-slate-400">· {r.day}</span></span>
              <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ background: STATUS_COLOR[r.status] }}>{STATUS_LABEL[r.status]}</span></li>
          ))}</ul>
        )}
      </Card>
    </div>
  );
}
