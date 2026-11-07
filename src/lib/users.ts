import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NewUser } from '@/lib/validators';

// Membuat akun Auth + profil + data peran. Jika salah satu langkah gagal, akun Auth dibatalkan.
export async function createAccount(admin: SupabaseClient, v: NewUser): Promise<{ id: string } | { error: string }> {
  const { data, error } = await admin.auth.admin.createUser({ email: v.email, password: v.password, email_confirm: true });
  if (error || !data.user) return { error: /already|registered|exists/i.test(error?.message ?? '') ? 'Email sudah terdaftar.' : 'Gagal membuat akun.' };
  const id = data.user.id;
  const fail = async (error: string) => { await admin.auth.admin.deleteUser(id); return { error }; };

  const p = await admin.from('profiles').insert({ id, role: v.role, full_name: v.full_name, username: v.username ?? null, phone: v.phone ?? null });
  if (p.error) return fail(p.error.code === '23505' ? 'Username sudah dipakai.' : 'Gagal menyimpan profil.');

  let err: { code?: string } | null = null;
  if (v.role === 'murid') {
    err = (await admin.from('students').insert({ profile_id: id, nis: v.nis!, class_id: v.class_id ?? null })).error;
  } else if (v.role === 'guru_piket') {
    err = (await admin.from('teachers').insert({ profile_id: id, nip: v.nip ?? null })).error;
  } else if (v.role === 'orang_tua') {
    err = (await admin.from('parents').insert({ profile_id: id, phone: v.phone ?? null })).error;
    if (!err && v.student_ids?.length) {
      err = (await admin.from('parent_student').insert(v.student_ids.map((s) => ({ parent_id: id, student_id: s })))).error;
    }
  }
  if (err) return fail(err.code === '23505' ? 'NIS/NIP sudah dipakai.' : 'Gagal menyimpan data peran.');
  return { id };
}
