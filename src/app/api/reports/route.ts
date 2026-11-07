import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/auth';
import { dayWib, one } from '@/lib/dates';
import { reportQuerySchema } from '@/lib/validators';

type Raw = {
  status: string; scanned_at: string | null; distance_m: number | null; note: string | null;
  attendance_sessions: { starts_at: string; title: string; classes: { name: string } | { name: string }[] | null } | { starts_at: string; title: string; classes: { name: string } | { name: string }[] | null }[];
  students: { nis: string; profiles: { full_name: string } | { full_name: string }[] | null } | { nis: string; profiles: { full_name: string } | { full_name: string }[] | null }[] | null;
};

// Laporan kehadiran. Memakai klien user, jadi RLS otomatis membatasi guru ke kelas terkait.
export async function GET(req: Request) {
  const a = await requireApi(['admin', 'guru_piket']);
  if ('error' in a) return a.error;
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = reportQuerySchema.safeParse(sp);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Filter tidak valid.' }, { status: 400 });
  const f = parsed.data;

  let q = a.me.supabase.from('attendances')
    .select('status,scanned_at,distance_m,note,attendance_sessions!inner(starts_at,title,class_id,classes(name)),students(nis,profiles(full_name))')
    .gte('attendance_sessions.starts_at', `${f.from}T00:00:00+07:00`)
    .lte('attendance_sessions.starts_at', `${f.to}T23:59:59.999+07:00`)
    .order('created_at', { ascending: false }).limit(5000);
  if (f.class_id) q = q.eq('attendance_sessions.class_id', f.class_id);
  if (f.student_id) q = q.eq('student_id', f.student_id);
  if (f.status) q = q.eq('status', f.status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: 'Gagal mengambil data laporan.' }, { status: 500 });

  const rows = ((data ?? []) as unknown as Raw[]).map((r) => {
    const s = one(r.attendance_sessions); const st = one(r.students);
    return {
      tanggal: dayWib(s!.starts_at), sesi: s!.title, kelas: one(s!.classes)?.name ?? '-', nis: st?.nis ?? '-',
      nama: one(st?.profiles)?.full_name ?? '-', status: r.status,
      waktu: r.scanned_at ? new Intl.DateTimeFormat('id-ID', { timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(r.scanned_at)) : '-',
      jarak_m: r.distance_m == null ? null : Math.round(r.distance_m), catatan: r.note ?? '',
    };
  }).sort((x, y) => y.tanggal.localeCompare(x.tanggal) || x.nama.localeCompare(y.nama));
  return NextResponse.json({ rows });
}
