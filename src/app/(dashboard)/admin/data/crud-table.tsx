'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Input, Label } from '@/components/ui/primitives';
import { createClient } from '@/lib/supabase/client';

export type Field = { key: string; label: string; type: 'text' | 'number' | 'date' | 'time' | 'select' | 'checkbox'; options?: { value: string; label: string }[]; required?: boolean };
type Row = Record<string, unknown> & { id: string };
type Form = Record<string, string | boolean>;
const sel = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900';

// CRUD generik lewat klien Supabase; RLS memastikan hanya admin yang boleh menulis
export function CrudTable({ table, title, fields, rows }: { table: string; title: string; fields: Field[]; rows: Row[] }) {
  const router = useRouter();
  const blank = (): Form => Object.fromEntries(fields.map((f) => [f.key, f.type === 'checkbox' ? false : '']));
  const [editing, setEditing] = useState<string | null>(null); // 'new' atau id baris
  const [form, setForm] = useState<Form>(blank);
  const [busy, setBusy] = useState(false);

  const show = (r: Row, f: Field) => {
    const v = r[f.key];
    if (v == null || v === '') return '-';
    if (f.type === 'checkbox') return v ? 'Ya' : 'Tidak';
    if (f.type === 'select') return f.options?.find((o) => o.value === String(v))?.label ?? String(v);
    if (f.type === 'time') return String(v).slice(0, 5);
    return String(v);
  };
  const edit = (r: Row) => {
    setForm(Object.fromEntries(fields.map((f) => [f.key, f.type === 'checkbox' ? Boolean(r[f.key]) : f.type === 'time' ? String(r[f.key] ?? '').slice(0, 5) : String(r[f.key] ?? '')])));
    setEditing(r.id);
  };
  const message = (code?: string) => code === '23505' ? 'Data duplikat atau sudah ada (mis. hanya satu tahun ajaran boleh aktif).' : code === '23503' ? 'Data masih dipakai oleh data lain.' : 'Gagal menyimpan data.';

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const v = form[f.key];
      if (f.type === 'checkbox') { payload[f.key] = Boolean(v); continue; }
      if (v === '' && f.required) { toast.error(`${f.label} wajib diisi.`); return; }
      payload[f.key] = v === '' ? null : f.type === 'number' ? Number(v) : v;
    }
    setBusy(true);
    const sb = createClient();
    const { error } = editing === 'new' ? await sb.from(table).insert(payload) : await sb.from(table).update(payload).eq('id', editing!);
    setBusy(false);
    if (error) { toast.error(message(error.code)); return; }
    toast.success('Data disimpan.'); setEditing(null); setForm(blank()); router.refresh();
  }
  async function remove(r: Row) {
    if (!confirm('Hapus data ini?')) return;
    const { error } = await createClient().from(table).delete().eq('id', r.id);
    error ? toast.error(message(error.code)) : (toast.success('Data dihapus.'), router.refresh());
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{title}</h2>
        <Button variant="ghost" className="border border-slate-300" onClick={() => { setForm(blank()); setEditing(editing === 'new' ? null : 'new'); }}>{editing === 'new' ? 'Batal' : 'Tambah'}</Button></div>
      {editing ? (
        <form onSubmit={save} className="mb-4 grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key}>
              {f.type === 'checkbox'
                ? <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={Boolean(form[f.key])} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.checked }))} /> {f.label}</label>
                : <>
                  <Label htmlFor={`${table}-${f.key}`}>{f.label}</Label>
                  {f.type === 'select'
                    ? <select id={`${table}-${f.key}`} className={sel} value={String(form[f.key])} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}><option value="">{f.required ? 'Pilih…' : '-'}</option>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                    : <Input id={`${table}-${f.key}`} type={f.type} value={String(form[f.key])} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} />}
                </>}
            </div>
          ))}
          <div className="flex gap-2 sm:col-span-2"><Button type="submit" loading={busy}>Simpan</Button><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Batal</Button></div>
        </form>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800"><tr>{fields.map((f) => <th key={f.key} className="p-2">{f.label}</th>)}<th className="p-2 text-right">Aksi</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                {fields.map((f) => <td key={f.key} className="p-2">{show(r, f)}</td>)}
                <td className="space-x-2 p-2 text-right text-xs"><button className="text-indigo-600 hover:underline" onClick={() => edit(r)}>Ubah</button><button className="text-red-600 hover:underline" onClick={() => remove(r)}>Hapus</button></td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={fields.length + 1} className="p-4 text-center text-slate-500">Belum ada data.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
