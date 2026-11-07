import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  await createClient().auth.signOut({ scope: 'local' }); // hapus sesi + cookie
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? req.url), 303);
}
