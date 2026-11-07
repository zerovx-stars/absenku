'use client';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Input, Label } from '@/components/ui/primitives';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/status';
import type { ReportRow } from '@/types';

type Props = { classes: { id: string; name: string }[]; students: { id: string; name: string; class_id: string | null }[]; schoolName: string };
const sel = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900';
const wibDay = (offsetDays = 0) => new Date(Date.now() + offsetDays * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
const HEAD = ['Tanggal', 'Sesi', 'Kelas', 'NIS', 'Nama', 'Status', 'Jam scan', 'Jarak (m)', 'Catatan'];
const toArray = (r: ReportRow) => [r.tanggal, r.sesi, r.kelas, r.nis, r.nama, STATUS_LABEL[r.status] ?? r.status, r.waktu, r.jarak_m ?? '', r.catatan];

export function ReportView({ classes, students, schoolName }: Props) {
  const [f, setF] = useState({ from: wibDay(-6), to: wibDay(), class_id: '', student_id: '', status: '' });
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const studentOpts = useMemo(() => students.filter((s) => !f.class_id || s.class_id === f.class_id), [students, f.class_id]);
  const summary = useMemo(() => {
    const c: Record<string, number> = {};
    (rows ?? []).forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [rows]);
  const preset = (from: string, to = wibDay()) => setF((p) => ({ ...p, from, to }));
  const monthStart = () => `${wibDay().slice(0, 8)}01`;

  async function load(e?: React.FormEvent) {
    e?.preventDefault(); setError(null); setBusy(true);
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]);
    try {
      const res = await fetch(`/api/reports?${qs}`, { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error ?? 'Gagal memuat laporan.'); setRows(null); } else setRows(body.rows);
    } catch { setError('Tidak dapat terhubung ke server.'); }
    setBusy(false);
  }
  const name = `laporan-absensi-${f.from}_${f.to}`;

  async function toExcel() {
    if (!rows?.length) return;
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([HEAD, ...rows.map(toArray)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kehadiran');
    XLSX.writeFile(wb, `${name}.xlsx`);
  }
  async function toPdf() {
    if (!rows?.length) return;
    try {
      const { default: JsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new JsPDF({ orientation: 'landscape' });
      doc.setFontSize(13); doc.text(`Laporan Kehadiran - ${schoolName}`, 14, 14);
      doc.setFontSize(9); doc.text(`Periode ${f.from} s.d. ${f.to} (WIB)`, 14, 20);
      autoTable(doc, { head: [HEAD], body: rows.map((r) => toArray(r).map(String)), startY: 25, styles: { fontSize: 7.5 }, headStyles: { fillColor: [79, 70, 229] } });
      doc.save(`${name}.pdf`);
    } catch { toast.error('Gagal membuat PDF.'); }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Laporan Kehadiran</h1>
      <form onSubmit={load} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 print:hidden">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="self-center text-slate-500">Cepat:</span>
          <button type="button" className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800" onClick={() => preset(wibDay())}>Harian</button>
          <button type="button" className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800" onClick={() => preset(wibDay(-6))}>Mingguan</button>
          <button type="button" className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800" onClick={() => preset(monthStart())}>Bulanan</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div><Label htmlFor="from">Dari</Label><Input id="from" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} required /></div>
          <div><Label htmlFor="to">Sampai</Label><Input id="to" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} required /></div>
          <div><Label htmlFor="cls">Kelas</Label><select id="cls" className={sel} value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value, student_id: '' })}><option value="">Semua kelas</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><Label htmlFor="stu">Murid</Label><select id="stu" className={sel} value={f.student_id} onChange={(e) => setF({ ...f, student_id: e.target.value })}><option value="">Semua murid</option>{studentOpts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><Label htmlFor="st">Status</Label><select id="st" className={sel} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Semua status</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <Button type="submit" loading={busy}>Tampilkan</Button>
      </form>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {rows ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="font-semibold">{schoolName}: {f.from} s.d. {f.to}</h2>
              <p className="mt-1 flex flex-wrap gap-1.5 text-xs">{Object.entries(summary).map(([k, n]) => <span key={k} className="rounded-full px-2 py-0.5 text-white" style={{ background: STATUS_COLOR[k] }}>{STATUS_LABEL[k]} {n}</span>)}</p></div>
            <div className="flex gap-2 print:hidden">
              <Button variant="ghost" className="border border-slate-300" onClick={toExcel} disabled={!rows.length}>Excel</Button>
              <Button variant="ghost" className="border border-slate-300" onClick={toPdf} disabled={!rows.length}>PDF</Button>
              <Button variant="ghost" className="border border-slate-300" onClick={() => window.print()} disabled={!rows.length}>Cetak</Button>
            </div>
          </div>
          {rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Tidak ada data untuk filter ini.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800"><tr>{HEAD.map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
                <tbody>{rows.slice(0, 500).map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800">{toArray(r).map((c, j) => <td key={j} className="p-2">{j === 5 ? <span className="rounded-full px-2 py-0.5 text-white" style={{ background: STATUS_COLOR[r.status] }}>{c}</span> : String(c)}</td>)}</tr>
                ))}</tbody>
              </table>
              {rows.length > 500 ? <p className="mt-2 text-xs text-slate-500">Menampilkan 500 dari {rows.length} baris. Ekspor Excel/PDF memuat seluruh data.</p> : null}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
