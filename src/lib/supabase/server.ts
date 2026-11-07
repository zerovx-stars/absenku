import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { REMEMBER_COOKIE, sessionOptions } from './shared';

export function createClient(opts?: { remember?: boolean }) {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list: { name: string; value: string; options: CookieOptions }[]) {
        // Server Component tidak boleh menulis cookie; middleware yang me-refresh sesi
        try {
          const remember = opts?.remember ?? store.get(REMEMBER_COOKIE)?.value !== '0';
          list.forEach(({ name, value, options }) => store.set(name, value, sessionOptions(options, remember)));
        } catch {}
      },
    },
  });
}
