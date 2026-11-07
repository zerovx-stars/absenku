import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAccount } from '@/lib/users';
import { createUserSchema } from '@/lib/validators';

export async function POST(req: Request) {
  const a = await requireApi(['admin']);
  if ('error' in a) return a.error;
  const parsed = createUserSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  const admin = createAdminClient();
  const r = await createAccount(admin, parsed.data);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: 409 });
  await admin.from('audit_logs').insert({ actor_id: a.me.user.id, action: 'user.create', entity: 'profiles', entity_id: r.id, meta: { role: parsed.data.role } });
  return NextResponse.json({ id: r.id }, { status: 201 });
}
