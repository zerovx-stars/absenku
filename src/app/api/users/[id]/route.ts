import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApi } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateUserSchema } from '@/lib/validators';

const err = (error: string, status: number) => NextResponse.json({ error }, { status });

// Edit nama/kelas/anak, aktif-nonaktif, dan reset password oleh admin
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = await requireApi(['admin']);
  if ('error' in a) return a.error;
  if (!z.string().uuid().safeParse(params.id).success) return err('ID tidak valid.', 400);
  const parsed = updateUserSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Data tidak valid.', 400);
  const v = parsed.data;
  const admin = createAdminClient();
  const { data: p } = await admin.from('profiles').select('id,role').eq('id', params.id).maybeSingle();
  if (!p) return err('Pengguna tidak ditemukan.', 404);

  if (v.is_active !== undefined) {
    if (params.id === a.me.user.id && !v.is_active) return err('Anda tidak dapat menonaktifkan akun sendiri.', 400);
    await admin.from('profiles').update({ is_active: v.is_active }).eq('id', params.id);
    // Ban menghentikan refresh token; middleware + RLS langsung menolak sesi yang masih aktif
    await admin.auth.admin.updateUserById(params.id, { ban_duration: v.is_active ? 'none' : '876000h' });
  }
  if (v.password) {
    const { error } = await admin.auth.admin.updateUserById(params.id, { password: v.password });
    if (error) return err('Gagal mereset password.', 500);
  }
  if (v.full_name) await admin.from('profiles').update({ full_name: v.full_name }).eq('id', params.id);
  if (v.class_id !== undefined && p.role === 'murid') await admin.from('students').update({ class_id: v.class_id }).eq('profile_id', params.id);
  if (v.student_ids && p.role === 'orang_tua') {
    await admin.from('parent_student').delete().eq('parent_id', params.id);
    if (v.student_ids.length) await admin.from('parent_student').insert(v.student_ids.map((s) => ({ parent_id: params.id, student_id: s })));
  }
  await admin.from('audit_logs').insert({
    actor_id: a.me.user.id, action: v.password ? 'user.reset_password' : v.is_active !== undefined ? (v.is_active ? 'user.activate' : 'user.deactivate') : 'user.update',
    entity: 'profiles', entity_id: params.id,
  });
  return NextResponse.json({ ok: true });
}
