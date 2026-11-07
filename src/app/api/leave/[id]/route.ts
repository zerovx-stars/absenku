import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApi } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { wibDayRange, dayWib } from '@/lib/dates';
import { leaveActionSchema } from '@/lib/validators';

const err = (error: string, status: number) => NextResponse.json({ error }, { status });

// Guru/admin menyetujui atau menolak pengajuan izin/sakit
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = await requireApi(['admin', 'guru_piket']);
  if ('error' in a) return a.error;
  if (!z.string().uuid().safeParse(params.id).success) return err('ID tidak valid.', 400);
  const body = leaveActionSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return err('Aksi tidak valid.', 400);

  const admin = createAdminClient();
  const { data: l } = await admin.from('leave_requests').select('id,student_id,type,leave_date,status').eq('id', params.id).maybeSingle();
  if (!l) return err('Pengajuan tidak ditemukan.', 404);
  if (l.status !== 'pending') return err('Pengajuan ini sudah diproses.', 409);
  const { data: st } = await admin.from('students').select('class_id').eq('profile_id', l.student_id).maybeSingle();
  const { data: ok } = st?.class_id ? await a.me.supabase.rpc('teacher_manages_class', { p_class: st.class_id }) : { data: false };
  if (!ok) return err('Anda tidak berwenang atas murid ini.', 403);

  const approved = body.data.action === 'approve';
  await admin.from('leave_requests').update({ status: approved ? 'approved' : 'rejected', reviewed_by: a.me.user.id, reviewed_at: new Date().toISOString() }).eq('id', l.id);

  if (approved && st?.class_id) {
    // Sesi hari itu yang sudah terlanjur Alfa diubah menjadi Izin/Sakit
    const { from, to } = wibDayRange(dayWib(`${l.leave_date}T12:00:00+07:00`));
    const { data: sessions } = await admin.from('attendance_sessions').select('id').eq('class_id', st.class_id).gte('starts_at', from).lte('starts_at', to);
    const ids = (sessions ?? []).map((s: { id: string }) => s.id);
    if (ids.length) {
      await admin.from('attendances').update({ status: l.type, note: 'Pengajuan disetujui guru', changed_by: a.me.user.id })
        .eq('student_id', l.student_id).eq('status', 'alfa').in('session_id', ids);
    }
  }
  await admin.from('notifications').insert({
    user_id: l.student_id, title: approved ? 'Pengajuan disetujui' : 'Pengajuan ditolak',
    body: `Pengajuan ${l.type} tanggal ${l.leave_date} ${approved ? 'disetujui' : 'ditolak'}.`, data: { leave_id: l.id },
  });
  await admin.from('audit_logs').insert({ actor_id: a.me.user.id, action: approved ? 'leave.approve' : 'leave.reject', entity: 'leave_requests', entity_id: l.id });
  return NextResponse.json({ ok: true });
}
