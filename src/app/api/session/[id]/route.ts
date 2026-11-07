import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApi } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sessionActionSchema } from '@/lib/validators';
import { externalNotifyEnabled, notifyAttendance } from '@/lib/notify';

const err = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = await requireApi(['admin', 'guru_piket']);
  if ('error' in a) return a.error;
  if (!z.string().uuid().safeParse(params.id).success) return err('ID sesi tidak valid.', 400);
  const body = sessionActionSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return err('Aksi tidak valid.', 400);

  const admin = createAdminClient();
  const { data: s } = await admin.from('attendance_sessions').select('id,class_id,status,starts_at').eq('id', params.id).maybeSingle();
  if (!s) return err('Sesi tidak ditemukan.', 404);
  const { data: ok } = await a.me.supabase.rpc('teacher_manages_class', { p_class: s.class_id });
  if (!ok) return err('Anda tidak berwenang mengelola sesi ini.', 403);

  if (body.data.action === 'open') {
    await admin.from('attendance_sessions').update({ status: 'open', closed_at: null }).eq('id', s.id);
    return NextResponse.json({ ok: true });
  }

  if (s.status !== 'closed') {
    await admin.from('attendance_sessions').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', s.id);
    // Murid yang belum scan: Izin/Sakit bila ada pengajuan disetujui di tanggal itu, selain itu Alfa
    const day = new Date(s.starts_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const [{ data: students }, { data: done }, { data: leaves }] = await Promise.all([
      admin.from('students').select('profile_id').eq('class_id', s.class_id),
      admin.from('attendances').select('student_id').eq('session_id', s.id),
      admin.from('leave_requests').select('student_id,type').eq('status', 'approved').eq('leave_date', day),
    ]);
    const present = new Set((done ?? []).map((r: { student_id: string }) => r.student_id));
    const leaveBy = new Map((leaves ?? []).map((l: { student_id: string; type: string }) => [l.student_id, l.type]));
    const rows = (students ?? []).filter((st: { profile_id: string }) => !present.has(st.profile_id))
      .map((st: { profile_id: string }) => ({ session_id: s.id, student_id: st.profile_id, status: leaveBy.get(st.profile_id) ?? 'alfa', changed_by: a.me.user.id }));
    if (rows.length) await admin.from('attendances').upsert(rows, { onConflict: 'session_id,student_id', ignoreDuplicates: true });
    await admin.from('qr_tokens').delete().eq('session_id', s.id); // cabut semua QR
    if (externalNotifyEnabled()) await Promise.allSettled(rows.filter((r: { status: string }) => r.status === 'alfa').slice(0, 100).map((r: { student_id: string }) => notifyAttendance(r.student_id, 'alfa')));
    await admin.from('audit_logs').insert({ actor_id: a.me.user.id, action: 'session.close', entity: 'attendance_sessions', entity_id: s.id, meta: { auto_marked: rows.length } });
  }
  return NextResponse.json({ ok: true });
}
