import { NextResponse } from 'next/server';
import { allow, requireApi } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyQrToken } from '@/lib/qr-token';
import { haversineM } from '@/lib/haversine';
import { notifyAttendance } from '@/lib/notify';
import { scanSchema } from '@/lib/validators';

const err = (error: string, status: number) => NextResponse.json({ error }, { status });
const MAX_ACCURACY_M = 100;

export async function POST(req: Request) {
  const a = await requireApi(['murid']);
  if ('error' in a) return a.error;
  const parsed = scanSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err('Data scan tidak valid.', 400);
  const { token, lat, lng, accuracy, device_id } = parsed.data;
  if (!(await allow(`scan:${a.me.user.id}`, 10, 60))) return err('Terlalu banyak percobaan scan. Tunggu sebentar.', 429);

  // 1) Token: tanda tangan, kedaluwarsa, dan masih tercatat di server
  const payload = verifyQrToken(token);
  const stale = 'QR tidak valid atau sudah kedaluwarsa. Scan QR terbaru di layar.';
  if (!payload || payload.exp < Math.floor(Date.now() / 1000)) return err(stale, 410);
  const admin = createAdminClient();
  const { data: tk } = await admin.from('qr_tokens').select('id,expires_at').eq('nonce', payload.n).eq('session_id', payload.sid).maybeSingle();
  if (!tk || new Date(tk.expires_at) < new Date()) return err(stale, 410);

  // 2) Sesi masih dibuka dan dalam jendela waktu
  const { data: s } = await admin.from('attendance_sessions').select('id,class_id,status,starts_at,ends_at,late_tolerance_min').eq('id', payload.sid).maybeSingle();
  const now = new Date();
  if (!s || s.status !== 'open' || now > new Date(s.ends_at)) return err('Sesi absensi sudah ditutup.', 409);
  if (now < new Date(s.starts_at)) return err('Sesi absensi belum dimulai.', 409);

  // 3) Murid terdaftar di kelas ini dan belum absen
  const { data: st } = await admin.from('students').select('class_id').eq('profile_id', a.me.user.id).maybeSingle();
  if (!st || st.class_id !== s.class_id) return err('Anda tidak terdaftar di kelas ini.', 403);
  const { data: dup } = await admin.from('attendances').select('id').eq('session_id', s.id).eq('student_id', a.me.user.id).maybeSingle();
  if (dup) return err('Anda sudah absen pada sesi ini.', 409);

  // 4) Anti titip absen: satu perangkat tidak boleh dipakai dua murid di sesi yang sama
  const { data: sameDevice } = await admin.from('attendances').select('id').eq('session_id', s.id).eq('device_id', device_id).neq('student_id', a.me.user.id).limit(1);
  if (sameDevice && sameDevice.length) return err('Perangkat ini sudah dipakai absen oleh murid lain pada sesi ini.', 409);

  // 5) Lokasi: akurasi GPS dan geofence (Haversine di server)
  if (accuracy > MAX_ACCURACY_M) return err(`Akurasi GPS terlalu rendah (±${Math.round(accuracy)} m). Pindah ke area terbuka lalu coba lagi.`, 422);
  const { data: cfg } = await admin.from('school_settings').select('lat,lng,radius_m,geofence_mode').eq('id', 1).single();
  if (!cfg) return err('Pengaturan sekolah belum lengkap.', 500);
  const distance = haversineM(lat, lng, cfg.lat, cfg.lng);
  const inArea = distance <= cfg.radius_m;
  if (!inArea && cfg.geofence_mode === 'reject') return err(`Anda berada ${Math.round(distance)} m dari sekolah (batas ${cfg.radius_m} m).`, 403);

  // 6) Status: di luar area (mode tandai) / terlambat / hadir
  const lateAt = new Date(new Date(s.starts_at).getTime() + s.late_tolerance_min * 60_000);
  const status = !inArea ? 'di_luar_area' : now > lateAt ? 'terlambat' : 'hadir';

  const { error } = await admin.from('attendances').insert({
    session_id: s.id, student_id: a.me.user.id, status, scanned_at: now.toISOString(),
    lat, lng, accuracy_m: accuracy, distance_m: distance, in_area: inArea, device_id,
    user_agent: (req.headers.get('user-agent') ?? '').slice(0, 300),
  });
  if (error) return error.code === '23505' ? err('Anda sudah absen pada sesi ini.', 409) : err('Gagal menyimpan absensi. Coba lagi.', 500);
  await notifyAttendance(a.me.user.id, status); // email/WhatsApp opsional ke orang tua
  return NextResponse.json({ status, distance_m: Math.round(distance), in_area: inArea, scanned_at: now.toISOString() });
}
