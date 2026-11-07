import 'server-only';
// Email via Resend. Aktif bila RESEND_API_KEY diisi.
export async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.RESEND_FROM ?? 'Absensi Sekolah <onboarding@resend.dev>', to: [to], subject, text }),
    signal: AbortSignal.timeout(4000),
  });
}
