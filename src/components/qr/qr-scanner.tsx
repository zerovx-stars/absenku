'use client';
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle2, MapPin, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/primitives';
import { STATUS_LABEL } from '@/lib/status';

type Result = { ok: true; status: string; distance_m: number } | { ok: false; message: string };
type Pos = { lat: number; lng: number; accuracy: number };

const GEO_ERRORS: Record<number, string> = {
  1: 'Izin lokasi ditolak. Aktifkan izin lokasi untuk browser ini lalu coba lagi.',
  2: 'Lokasi tidak tersedia. Nyalakan GPS dan coba lagi.',
  3: 'Waktu pengambilan lokasi habis. Pindah ke area terbuka dan coba lagi.',
};

function getPosition(): Promise<Pos> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Perangkat tidak mendukung GPS.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(new Error(GEO_ERRORS[e.code] ?? 'Gagal mengambil lokasi.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

// ID perangkat tersimpan di browser untuk deteksi titip absen
function deviceId(): string {
  try {
    let id = localStorage.getItem('absen_device_id');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('absen_device_id', id); }
    return id;
  } catch { return `anon-${navigator.userAgent.length}-${screen.width}x${screen.height}`.padEnd(8, '0'); }
}

export function QrScanner() {
  const scanner = useRef<Html5Qrcode | null>(null);
  const handled = useRef(false);
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'sending' | 'done'>('idle');
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => () => { scanner.current?.isScanning && scanner.current.stop().catch(() => {}); }, []);

  async function submit(token: string, posP: Promise<{ pos?: Pos; err?: Error }>) {
    setPhase('sending');
    const { pos, err } = await posP;
    if (!pos) { setResult({ ok: false, message: err?.message ?? 'Gagal mengambil lokasi.' }); setPhase('done'); return; }
    try {
      const res = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, ...pos, device_id: deviceId() }) });
      const body = await res.json().catch(() => ({}));
      setResult(res.ok ? { ok: true, status: body.status, distance_m: body.distance_m } : { ok: false, message: body.error ?? 'Absen gagal. Coba lagi.' });
    } catch {
      setResult({ ok: false, message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.' });
    }
    setPhase('done');
  }

  async function start() {
    setResult(null); handled.current = false;
    const posP = getPosition().then((pos) => ({ pos }), (err: Error) => ({ err })); // minta izin GPS lebih awal
    try {
      setPhase('scanning');
      const s = new Html5Qrcode('qr-reader');
      scanner.current = s;
      await s.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, async (text) => {
        if (handled.current) return;
        handled.current = true;
        await s.stop().catch(() => {});
        submit(text, posP);
      }, () => {});
    } catch {
      setResult({ ok: false, message: 'Kamera tidak dapat dibuka. Izinkan akses kamera (butuh HTTPS) lalu coba lagi.' });
      setPhase('done');
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div id="qr-reader" className={`overflow-hidden rounded-2xl bg-black ${phase === 'scanning' ? '' : 'hidden'}`} />
      {phase === 'idle' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
          <MapPin className="mx-auto h-8 w-8 text-indigo-600" aria-hidden />
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Arahkan kamera ke QR di layar kelas. Lokasi Anda dicatat hanya saat absen.</p>
          <Button className="mt-4 w-full" onClick={start}>Mulai scan</Button>
        </div>
      ) : null}
      {phase === 'scanning' ? <p className="text-center text-sm text-slate-500">Mengarahkan kamera belakang…</p> : null}
      {phase === 'sending' ? <p className="text-center text-sm text-slate-500" role="status">Memverifikasi absen dan lokasi…</p> : null}
      {phase === 'done' && result ? (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
          {result.ok ? <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" aria-hidden /> : <XCircle className="mx-auto h-10 w-10 text-red-600" aria-hidden />}
          <p className="mt-3 font-semibold">{result.ok ? `Absen tercatat: ${STATUS_LABEL[result.status] ?? result.status}` : 'Absen gagal'}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{result.ok ? `Jarak Anda ke sekolah ±${result.distance_m} m.` : result.message}</p>
          {!result.ok ? <Button className="mt-4 w-full" onClick={start}>Coba lagi</Button> : null}
        </div>
      ) : null}
    </div>
  );
}
