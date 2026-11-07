import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import type { SchoolSettings } from '@/types';
import { SettingsForm } from './settings-form';

export default async function PengaturanPage() {
  const me = await getMe();
  if (!me || me.role !== 'admin') redirect('/');
  const { data } = await me.supabase.from('school_settings').select('name,logo_url,lat,lng,radius_m,geofence_mode,start_time,late_tolerance_min').eq('id', 1).single();
  const s = data as SchoolSettings;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pengaturan Sekolah</h1>
      <SettingsForm initial={{ ...s, start_time: String(s.start_time).slice(0, 5) }} />
    </div>
  );
}
