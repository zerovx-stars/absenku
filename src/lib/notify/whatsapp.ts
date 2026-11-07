import 'server-only';
// WhatsApp lewat webhook gateway milik Anda: POST JSON {to, message}. Aktif bila WA_WEBHOOK_URL diisi.
export async function sendWhatsApp(to: string, message: string) {
  const url = process.env.WA_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(process.env.WA_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.WA_WEBHOOK_TOKEN}` } : {}) },
    body: JSON.stringify({ to, message }),
    signal: AbortSignal.timeout(4000),
  });
}
