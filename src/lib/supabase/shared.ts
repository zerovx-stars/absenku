import type { CookieOptions } from '@supabase/ssr';
export const REMEMBER_COOKIE = 'sb-remember';
// Tanpa "Ingat saya": cookie sesi dibuang saat browser ditutup (hapus maxAge/expires)
export function sessionOptions(options: CookieOptions, remember: boolean): CookieOptions {
  return remember ? options : { ...options, maxAge: undefined, expires: undefined };
}
