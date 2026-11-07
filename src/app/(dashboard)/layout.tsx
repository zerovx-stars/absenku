import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { isRole } from '@/lib/roles';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?error=sesi');
  const [{ data: profile }, { data: school }] = await Promise.all([
    supabase.from('profiles').select('full_name,role').eq('id', user.id).maybeSingle(),
    supabase.from('school_settings').select('name,logo_url').eq('id', 1).maybeSingle(),
  ]);
  if (!profile || !isRole(profile.role)) redirect('/login?error=nonaktif');
  return (
    <DashboardShell userId={user.id} profile={{ full_name: profile.full_name, role: profile.role }} school={{ name: school?.name ?? 'Absensi Sekolah', logo_url: school?.logo_url ?? null }}>
      {children}
    </DashboardShell>
  );
}
