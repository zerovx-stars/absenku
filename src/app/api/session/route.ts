import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSessionSchema } from '@/lib/validators';

export async function POST(req: Request) {
  const a = await requireApi(['admin', 'guru_piket']);
  if ('error' in a) return a.error;
  const parsed = createSessionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });

  // Insert lewat klien user: RLS memastikan guru hanya membuat sesi di kelas terkait
  const { data, error } = await a.me.supabase.from('attendance_sessions')
    .insert({ ...parsed.data, opened_by: a.me.user.id, status: 'open' }).select('id').single();
  if (error || !data) return NextResponse.json({ error: 'Anda tidak berwenang membuat sesi untuk kelas ini.' }, { status: 403 });
  await createAdminClient().from('audit_logs').insert({ actor_id: a.me.user.id, action: 'session.create', entity: 'attendance_sessions', entity_id: data.id });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
