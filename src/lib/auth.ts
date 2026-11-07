import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isRole, type Role } from '@/lib/roles';

export async function getMe() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from('profiles').select('role,full_name').eq('id', user.id).maybeSingle();
  if (!p || !isRole(p.role)) return null; // nonaktif -> RLS mengembalikan null
  return { supabase, user, role: p.role as Role, fullName: p.full_name as string };
}

// Untuk Route Handler: pastikan login + role sesuai
export async function requireApi(roles: Role[]) {
  const me = await getMe();
  if (!me) return { error: NextResponse.json({ error: 'Belum login atau akun dinonaktifkan.' }, { status: 401 }) } as const;
  if (!roles.includes(me.role)) return { error: NextResponse.json({ error: 'Anda tidak punya akses.' }, { status: 403 }) } as const;
  return { me } as const;
}

// Rate limit lewat Postgres (serverless-friendly). true = masih diizinkan
export async function allow(key: string, limit: number, windowSec: number) {
  const { data } = await createAdminClient().rpc('hit_rate_limit', { p_key: key, p_limit: limit, p_window_sec: windowSec });
  return data !== false;
}
