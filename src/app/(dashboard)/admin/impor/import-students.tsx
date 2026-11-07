'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Input, Label } from '@/components/ui/primitives';

type Row = { full_name: string; email: string; nis: string; class_name?: string };
type Result = { row: number; email: string; ok: boolean; password?: string; error?: string };
const BATCH = 20;
const ALIAS: Record<string, keyof Row> = { nama: 'full_name', name: 'full_name', full_name: 'full_name', email: 'email', nis: 'nis', kelas: 'class_name', class: 'class_name', class_name: 'class_name' };

export function ImportStudents() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResults([]); setError(null); setRows([]);
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Ukuran file maksimal 2 MB.'); return; }
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      const parsed = raw.map((r) => {
        const o: Partial<Row> = {};
        for (const [k, v] of Object.entries(r)) { const key = ALIAS[k.trim().toLowerCase()]; if (key) o[key] = String(v).trim(); }
        return o as Row;
      }).filter((r) => r.full_name || r.email || r.nis);
      if (!parsed.length) { setError('Tidak ada baris data. Gunakan kolom: nama, email, nis, kelas.'); return; }
      if (parsed.length > 500) { setError('Maksimal 500 murid per impor.'); return; }
      setRows(parsed);
    } catch { setError('File tidak dapat dibaca. Gunakan format .xlsx, .xls, atau .csv.'); }
  }

  async function run() {
    setBusy(true); setResults([]);
    const all: Result[] = [];
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH).map((r) => ({ ...r, class_name: r.class_name || undefined }));
      const res = await fetch('/api/users/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offset: i, rows: chunk }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { // baris pada batch ini gagal divalidasi
        chunk.forEach((r, j) => all.push({ row: i + j + 2, email: r.email, ok: false, error: body.error ?? 'Data tidak valid.' }));
      } else all.push(...(body.results as Result[]));
      setResults([...all]);
    }
    setBusy(false);
    toast.success(`Selesai: ${all.filter((r) => r.ok).length} berhasil, ${all.filter((r) => !r.ok).length} gagal.`);
    router.refresh();
  }

  async function download(name: string, data: Record<string, unknown>[]) {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Data');
    XLSX.writeFile(wb, name);
  }
  const ok = results.filter((r) => r.ok);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-300">Kolom wajib: <b>nama</b>, <b>email</b>, <b>nis</b>. Kolom <b>kelas</b> opsional dan harus sama dengan nama kelas di Data Master. Password dibuat acak untuk tiap murid dan hanya ditampilkan sekali setelah impor.</p>
        <Button variant="ghost" className="mt-2 border border-slate-300" onClick={() => download('template-murid.xlsx', [{ nama: 'Budi Santoso', email: 'budi@contoh.sch.id', nis: '2026010', kelas: 'X IPA 1' }])}>Unduh template</Button>
        <div className="mt-4"><Label htmlFor="file">File Excel/CSV</Label><Input id="file" type="file" accept=".xlsx,.xls,.csv" onChange={onFile} /></div>
        {error ? <p role="alert" className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>
      {rows.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium">{rows.length} baris siap diimpor. Pratinjau 5 baris pertama:</p>
          <ul className="mt-2 text-sm text-slate-600 dark:text-slate-300">{rows.slice(0, 5).map((r, i) => <li key={i}>{r.full_name} · {r.email} · {r.nis} · {r.class_name || '-'}</li>)}</ul>
          <Button className="mt-3" loading={busy} onClick={run}>Mulai impor</Button>
        </div>
      ) : null}
      {results.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium">{ok.length} berhasil · {results.length - ok.length} gagal</p>
          {ok.length ? <Button variant="ghost" className="mt-2 border border-slate-300" onClick={() => download('akun-murid-baru.xlsx', ok.map((r) => ({ email: r.email, password: r.password })))}>Unduh daftar akun dan password</Button> : null}
          <ul className="mt-2 max-h-60 overflow-y-auto text-sm text-red-600">{results.filter((r) => !r.ok).map((r) => <li key={r.row}>Baris {r.row} ({r.email}): {r.error}</li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}
