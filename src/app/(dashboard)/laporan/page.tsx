import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { ReportView } from './report-view';

export default async function LaporanPage() {
  const me = await getMe();
  if (!me || (me.role !== 'admin' && me.role !== 'guru_piket')) redirect('/');
  const [{ data: classes }, { data: studs }, { data: cfg }] = await Promise.all([
    me.supabase.from('classes').select('id,name').order('name'),
    me.supabase.from('students').select('profile_id,class_id,profiles(full_name)').limit(2000),
    me.supabase.from('school_settings').select('name').eq('id', 1).maybeSingle(),
  ]);
  const students = (studs ?? []).map((s: { profile_id: string; class_id: string | null; profiles: { full_name: string } | { full_name: string }[] | null }) => ({
    id: s.profile_id, class_id: s.class_id, name: (Array.isArray(s.profiles) ? s.profiles[0] : s.profiles)?.full_name ?? '-',
  })).sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
  return <ReportView classes={classes ?? []} students={students} schoolName={cfg?.name ?? 'Sekolah'} />;
}
