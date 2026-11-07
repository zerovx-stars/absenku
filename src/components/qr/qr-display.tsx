'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Maximize2 } from 'lucide-react';

// QR dinamis: ganti otomatis tiap interval, ada hitung mundur dan mode layar penuh (proyektor)
export function QrDisplay({ sessionId, intervalSec }: { sessionId: string; intervalSec: number }) {
  const [img, setImg] = useState<string | null>(null);
  const [left, setLeft] = useState(intervalSec);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const next = useRef(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/qr?session_id=${sessionId}`, { cache: 'no-store' });
        const body = await res.json();
        if (!res.ok) { setError(body.error ?? 'Gagal memuat QR.'); next.current = Date.now() + 5000; return; }
        setError(null);
        setImg(await QRCode.toDataURL(body.token, { width: 520, margin: 2, errorCorrectionLevel: 'M' }));
        next.current = Date.now() + intervalSec * 1000;
      } catch {
        setError('Koneksi terputus. Mencoba lagi…');
        next.current = Date.now() + 5000;
      }
    };
    load();
    const t = setInterval(() => {
      const l = Math.max(0, Math.ceil((next.current - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) { next.current = Date.now() + intervalSec * 1000; load(); }
    }, 1000);
    return () => clearInterval(t);
  }, [sessionId, intervalSec]);

  return (
    <div ref={box} className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 [&:fullscreen]:justify-center [&:fullscreen]:bg-white">
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="QR absensi" className="aspect-square w-full max-w-[min(80vh,520px)] rounded-lg bg-white" />
      ) : (
        <div className="aspect-square w-full max-w-[520px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      )}
      <p className="text-sm text-slate-600 dark:text-slate-300 [:fullscreen_&]:text-slate-900">QR berganti dalam <strong>{left}</strong> detik</p>
      <button type="button" onClick={() => box.current?.requestFullscreen?.()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
        <Maximize2 className="h-4 w-4" aria-hidden /> Layar penuh
      </button>
    </div>
  );
}
