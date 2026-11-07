import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { dayWib, isPresent, one } from '@/lib/dates';
import { STATUS_COLOR, STATUS_LABEL, wib } from '@/lib/status';
import { Card, Greeting } from '@/components/layout/greeting';
import { LastLocationMap } from '@/components/map/last-location-map';

type Row = {
  student_id: string; status: string; scanned_at: string | null; lat: number | null; lng: number | null; distance_m: number | null;
  attendance_sessions: { starts_at: string; title: string } | { starts_at: string; title: string }[] | null;
};

export default async function OrangTuaPage() {
  const me = await getMe();
  if (!me || me.role !== 'orang_tua') redirect('/');
  const sb = me.supabase;
  const { data: links } = await sb.from('parent_student').select('student_id');
  const ids = (links ?? []).map((l: { student_id: string }) => l.student_id);
  const [{ data: kids }, { data: atts }, { data: school }] = await Promise.all([
    ids.length ? sb.from('profiles').select('id,full_name').in('id', ids) : Promise.resolve({ data: [] }),
    ids.length ? sb.from('attendances').select('student_id,status,scanned_at,lat,lng,distance_m,attendance_sessions(starts_at,title)')
      .in('student_id', ids).gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString()).order('created_at', { ascending: false }).limit(400) : Promise.resolve({ data: [] }),
    sb.from('school_settings').select('lat,lng,radius_m').eq('id', 1).maybeSingle(),
  ]);
  const rows = (atts ?? []) as Row[];

  return (
    <div className="space-y-4">
      <Greeting name={me.fullName} subtitle="Pantau kehadiran anak Anda." />
      {!kids?.length ? <Card><p className="text-sm text-slate-500">Belum ada anak yang terhubung ke akun Anda. Hubungi admin sekolah.</p></Card> : null}
      {(kids ?? []).map((k: { id: string; full_name: string }) => {
        const mine = rows.filter((r) => r.student_id === k.id);
        const pct = mine.length ? Math.round((100 * mine.filter((r) => isPresent(r.status)).length) / mine.length) : null;
        const last = mine.find((r) => r.lat != null && r.lng != null);
        return (
          <Card key={k.id} title={k.full_name}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Kehadiran 30 hari</p>
                <p className="text-3xl font-semibold">{pct === null ? '-' : `${pct}%`}</p>
                {mine.length === 0 ? <p className="mt-3 text-sm text-slate-500">Belum ada riwayat.</p> : (
                  <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">{mine.slice(0, 6).map((r, i) => {
                    const s = one(r.attendance_sessions);
                    return (
                      <li key={i} className="flex items-center justify-between py-1.5"><span>{s?.title ?? 'Sesi'} <span className="text-slate-400">· {dayWib(s?.starts_at ?? r.scanned_at ?? new Date())}</span></span>
                        <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ background: STATUS_COLOR[r.status] }}>{STATUS_LABEL[r.status]}</span></li>
                    );
                  })}</ul>
                )}
              </div>
              <div>
                {last && school ? (
                  <>
                    <LastLocationMap school={school} point={{ lat: last.lat!, lng: last.lng!, color: STATUS_COLOR[last.status], label: `${k.full_name} · ${STATUS_LABEL[last.status]} · ${wib(last.scanned_at)} WIB` }} />
                    <p className="mt-1 text-xs text-slate-500">Lokasi absen terakhir ({wib(last.scanned_at, { dateStyle: 'medium', timeStyle: 'short' })} WIB), tercatat hanya saat absen.</p>
                  </>
                ) : <p className="text-sm text-slate-500">Belum ada lokasi absen untuk ditampilkan.</p>}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
