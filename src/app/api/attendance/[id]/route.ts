import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApi } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyAttendance } from '@/lib/notify';
import { attendancePatchSchema } from '@/lib/validators';

const err = (error: string, status: number) => NextResponse.json({ error }, { status });

// Koreksi status absensi secara manual (wajib alasan, tercatat di audit log)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = await requireApi(['admin', 'guru_piket']);
  if ('error' in a) return a.error;
  if (!z.string().uuid().safeParse(params.id).success) return err('ID tidak valid.', 400);
  const body = attendancePatchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return err(body.error.issues[0]?.message ?? 'Data tidak valid.', 400);

  const admin = createAdminClient();
  const { data: row } = await admin.from('attendances').select('id,status,student_id,attendance_sessions(class_id)').eq('id', params.id).maybeSingle();
  if (!row) return err('Data absensi tidak ditemukan.', 404);
  const sess = Array.isArray(row.attendance_sessions) ? row.attendance_sessions[0] : row.attendance_sessions;
  const { data: ok } = await a.me.supabase.rpc('teacher_manages_class', { p_class: sess?.class_id });
  if (!ok) return err('Anda tidak berwenang mengubah data ini.', 403);

  await admin.from('attendances').update({ status: body.data.status, note: body.data.note, changed_by: a.me.user.id }).eq('id', row.id);
  await admin.from('audit_logs').insert({
    actor_id: a.me.user.id, action: 'attendance.update', entity: 'attendances', entity_id: row.id,
    meta: { from: row.status, to: body.data.status, note: body.data.note },
  });
  await notifyAttendance(row.student_id, body.data.status);
  return NextResponse.json({ ok: true });
}
