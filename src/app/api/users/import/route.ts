import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAccount } from '@/lib/users';
import { importSchema } from '@/lib/validators';

export const maxDuration = 60;

// Impor murid massal (dikirim bertahap oleh klien, maks. 50 baris per permintaan)
export async function POST(req: Request) {
  const a = await requireApi(['admin']);
  if ('error' in a) return a.error;
  const parsed = importSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data impor tidak valid.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: classes } = await admin.from('classes').select('id,name');
  const classId = new Map((classes ?? []).map((c: { id: string; name: string }) => [c.name.toLowerCase(), c.id]));

  const results: { row: number; email: string; ok: boolean; password?: string; error?: string }[] = [];
  for (const [i, r] of parsed.data.rows.entries()) {
    const row = parsed.data.offset + i + 2; // nomor baris di file (baris 1 = header)
    const cid = r.class_name ? classId.get(r.class_name.toLowerCase()) : undefined;
    if (r.class_name && !cid) { results.push({ row, email: r.email, ok: false, error: `Kelas "${r.class_name}" tidak ditemukan.` }); continue; }
    const password = `${randomBytes(6).toString('base64url')}Aa9`;
    const res = await createAccount(admin, { email: r.email, full_name: r.full_name, nis: r.nis, class_id: cid, role: 'murid', password });
    results.push('error' in res ? { row, email: r.email, ok: false, error: res.error } : { row, email: r.email, ok: true, password });
  }
  await admin.from('audit_logs').insert({ actor_id: a.me.user.id, action: 'user.import', entity: 'profiles', meta: { ok: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length } });
  return NextResponse.json({ results });
}
