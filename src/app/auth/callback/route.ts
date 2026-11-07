import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Menukar kode dari email reset password menjadi sesi
export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/reset-password';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/reset-password';
  if (code) {
    const { error } = await createClient().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, base));
  }
  return NextResponse.redirect(new URL('/login?error=tautan', base));
}
