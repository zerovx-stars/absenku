import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export type QrPayload = { sid: string; n: string; exp: number };

function secret(): string {
  const s = process.env.QR_TOKEN_SECRET;
  if (!s || s.length < 32) throw new Error('QR_TOKEN_SECRET harus diisi minimal 32 karakter.');
  return s;
}
const hmac = (payload: string) => createHmac('sha256', secret()).update(payload).digest();

// Token = base64url(payload).HMAC-SHA256; exp dalam detik (epoch)
export function signQrToken(sessionId: string, ttlSec: number) {
  const nonce = randomBytes(12).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = Buffer.from(JSON.stringify({ sid: sessionId, n: nonce, exp } satisfies QrPayload)).toString('base64url');
  return { token: `${payload}.${hmac(payload).toString('base64url')}`, nonce, exp };
}

export function verifyQrToken(token: string): QrPayload | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = hmac(payload);
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof p.sid === 'string' && typeof p.n === 'string' && typeof p.exp === 'number' ? (p as QrPayload) : null;
  } catch { return null; }
}
