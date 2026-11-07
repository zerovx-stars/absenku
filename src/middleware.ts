import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ROLES, ROLE_HOME, isRole } from '@/lib/roles';
import { REMEMBER_COOKIE, sessionOptions } from '@/lib/supabase/shared';

const PUBLIC = ['/login', '/lupa-password', '/reset-password', '/auth/callback', '/api/auth'];
const isPublic = (p: string) => PUBLIC.some((x) => p === x || p.startsWith(x + '/'));

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const remember = req.cookies.get(REMEMBER_COOKIE)?.value !== '0';
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(list: { name: string; value: string; options: CookieOptions }[]) {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, sessionOptions(options, remember)));
      },
    },
  });

  // getUser() memvalidasi token ke server Auth dan me-refresh sesi otomatis
  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  const redirect = (to: string, qs: Record<string, string> = {}) => {
    const url = req.nextUrl.clone();
    url.pathname = to; url.search = '';
    Object.entries(qs).forEach(([k, v]) => url.searchParams.set(k, v));
    const r = NextResponse.redirect(url);
    res.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!user) {
    if (isPublic(path)) return res;
    if (path.startsWith('/api/')) return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
    return redirect('/login', path === '/' ? {} : { next: path });
  }
  if (isPublic(path) && path !== '/login') return res;

  // RLS hanya mengembalikan profil milik akun yang aktif; null = nonaktif/tidak ada
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !isRole(profile.role)) {
    await supabase.auth.signOut({ scope: 'local' });
    if (path.startsWith('/api/')) return NextResponse.json({ error: 'Akun dinonaktifkan.' }, { status: 403 });
    return redirect('/login', { error: 'nonaktif' });
  }
  const role = profile.role;
  if (path === '/login' || path === '/') return redirect(ROLE_HOME[role]);

  // Cegah akses halaman role lain
  const owner = ROLES.find((r) => path === ROLE_HOME[r] || path.startsWith(ROLE_HOME[r] + '/'));
  if (owner && owner !== role) return redirect(ROLE_HOME[role]);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
