import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { REMEMBER_COOKIE } from '@/lib/supabase/shared';
import { ROLE_HOME, isRole } from '@/lib/roles';
import { loginSchema } from '@/lib/validators';

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Data login tidak valid.', 400);
  const { identifier, password, remember } = parsed.data;

  const admin = createAdminClient();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { data: allowed } = await admin.rpc('hit_rate_limit', { p_key: `login:${ip}`, p_limit: 10, p_window_sec: 60 });
  if (allowed === false) return fail('Terlalu banyak percobaan. Coba lagi sebentar lagi.', 429);

  // Login dengan email atau username
  let email = identifier.toLowerCase();
  if (!email.includes('@')) {
    const { data: p } = await admin.from('profiles').select('id').eq('username', identifier).maybeSingle();
    const { data: u } = p ? await admin.auth.admin.getUserById(p.id) : { data: null };
    email = u?.user?.email ?? '';
  }
  if (!email) return fail('Email/username atau password salah.', 401);

  const supabase = createClient({ remember });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return fail('Email/username atau password salah.', 401);

  // Status aktif diperiksa setelah password benar (tidak membocorkan keberadaan akun)
  const { data: profile } = await admin.from('profiles').select('role,is_active').eq('id', data.user.id).maybeSingle();
  if (!profile || !profile.is_active || !isRole(profile.role)) {
    await supabase.auth.signOut({ scope: 'local' });
    return fail('Akun Anda dinonaktifkan. Hubungi admin sekolah.', 403);
  }
  cookies().set(REMEMBER_COOKIE, remember ? '1' : '0', { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
  return NextResponse.json({ redirect: ROLE_HOME[profile.role] });
}
