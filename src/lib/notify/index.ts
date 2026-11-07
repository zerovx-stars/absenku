import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { STATUS_LABEL } from '@/lib/status';
import { sendEmail } from './email';
import { sendWhatsApp } from './whatsapp';

export const externalNotifyEnabled = () => Boolean(process.env.RESEND_API_KEY || process.env.WA_WEBHOOK_URL);

// Kirim email/WhatsApp ke semua orang tua murid. Kegagalan tidak pernah menggagalkan absen.
export async function notifyParents(studentId: string, title: string, body: string) {
  if (!externalNotifyEnabled()) return;
  const admin = createAdminClient();
  const { data: links } = await admin.from('parent_student').select('parent_id').eq('student_id', studentId);
  await Promise.allSettled((links ?? []).map(async (l: { parent_id: string }) => {
    const [{ data: u }, { data: p }] = await Promise.all([
      admin.auth.admin.getUserById(l.parent_id),
      admin.from('parents').select('phone').eq('profile_id', l.parent_id).maybeSingle(),
    ]);
    await Promise.allSettled([
      u?.user?.email ? sendEmail(u.user.email, title, body) : null,
      p?.phone ? sendWhatsApp(p.phone, `${title}\n${body}`) : null,
    ]);
  }));
}

export async function notifyAttendance(studentId: string, status: string) {
  if (!externalNotifyEnabled()) return;
  const { data: p } = await createAdminClient().from('profiles').select('full_name').eq('id', studentId).maybeSingle();
  const label = STATUS_LABEL[status] ?? status;
  await notifyParents(studentId, `Kehadiran: ${label}`, `${p?.full_name ?? 'Anak Anda'} tercatat ${label.toLowerCase()}.`);
}
