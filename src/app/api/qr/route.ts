import { NextResponse } from 'next/server';
import { z } from 'zod';
import { allow, requireApi } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { signQrToken } from '@/lib/qr-token';

const err = (error: string, status: number) => NextResponse.json({ error }, { status });

// Menerbitkan token QR baru untuk layar proyektor (dipanggil tiap interval)
export async function GET(req: Request) {
  const a = await requireApi(['admin', 'guru_piket']);
  if ('error' in a) return a.error;
  const sid = new URL(req.url).searchParams.get('session_id') ?? '';
  if (!z.string().uuid().safeParse(sid).success) return err('ID sesi tidak valid.', 400);
  if (!(await allow(`qr:${a.me.user.id}`, 30, 60))) return err('Terlalu banyak permintaan QR.', 429);

  const admin = createAdminClient();
  const { data: s } = await admin.from('attendance_sessions').select('id,class_id,status,ends_at,qr_interval_sec').eq('id', sid).maybeSingle();
  if (!s) return err('Sesi tidak ditemukan.', 404);
  const { data: ok } = await a.me.supabase.rpc('teacher_manages_class', { p_class: s.class_id });
  if (!ok) return err('Anda tidak berwenang atas sesi ini.', 403);
  if (s.status !== 'open' || new Date(s.ends_at) < new Date()) return err('Sesi sudah ditutup atau melewati jam selesai.', 409);

  // TTL = interval + 10 detik tumpang tindih agar scan saat pergantian QR tetap sah
  const { token, nonce, exp } = signQrToken(s.id, s.qr_interval_sec + 10);
  await admin.from('qr_tokens').insert({ session_id: s.id, nonce, expires_at: new Date(exp * 1000).toISOString() });
  await admin.from('qr_tokens').delete().eq('session_id', s.id).lt('expires_at', new Date(Date.now() - 60_000).toISOString());
  return NextResponse.json({ token, interval: s.qr_interval_sec });
}
