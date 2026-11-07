import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import type { Role } from '@/lib/roles';
import { UsersManager } from './users-manager';

export default async function PenggunaPage() {
  const me = await getMe();
  if (!me || me.role !== 'admin') redirect('/');
  const [{ data: users }, { data: classes }, { data: students }] = await Promise.all([
    me.supabase.from('profiles').select('id,full_name,username,role,is_active').order('role').order('full_name').limit(1000),
    me.supabase.from('classes').select('id,name').order('name'),
    me.supabase.from('students').select('profile_id,class_id'),
  ]);
  const classOf = new Map((students ?? []).map((s: { profile_id: string; class_id: string | null }) => [s.profile_id, s.class_id]));
  const list = (users ?? []).map((u: { id: string; full_name: string; username: string | null; role: Role; is_active: boolean }) => ({ ...u, class_id: classOf.get(u.id) ?? null }));
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pengguna</h1>
      <UsersManager users={list} classes={classes ?? []} />
    </div>
  );
}
