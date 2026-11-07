'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Alert, Button, Input, Label } from '@/components/ui/primitives';
import { ROLE_LABEL, type Role } from '@/lib/roles';

type U = { id: string; full_name: string; username: string | null; role: Role; is_active: boolean; class_id: string | null };
type C = { id: string; name: string };
const blank = { email: '', username: '', full_name: '', password: '', role: 'murid' as Role, nis: '', nip: '', phone: '', class_id: '', student_ids: [] as string[] };
const sel = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900';

export function UsersManager({ users, classes }: { users: U[]; classes: C[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const className = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);
  const students = users.filter((u) => u.role === 'murid');
  const shown = users.filter((u) => (!roleFilter || u.role === roleFilter) && `${u.full_name} ${u.username ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function call(url: string, method: string, body: unknown) {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: (data.error as string | undefined) ?? 'Permintaan gagal.' };
  }

  async function create(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    const body = Object.fromEntries(Object.entries(f).filter(([, v]) => (Array.isArray(v) ? v.length : v !== '')));
    const r = await call('/api/users', 'POST', body);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    toast.success('Akun dibuat.'); setF(blank); setOpen(false); router.refresh();
  }
  async function toggle(u: U) {
    if (!confirm(`${u.is_active ? 'Nonaktifkan' : 'Aktifkan'} akun ${u.full_name}?`)) return;
    const r = await call(`/api/users/${u.id}`, 'PATCH', { is_active: !u.is_active });
    r.ok ? (toast.success('Status akun diperbarui.'), router.refresh()) : toast.error(r.error);
  }
  async function reset(u: U) {
    const password = window.prompt(`Password baru untuk ${u.full_name} (min. 8 karakter, huruf dan angka):`);
    if (!password) return;
    const r = await call(`/api/users/${u.id}`, 'PATCH', { password });
    r.ok ? toast.success('Password direset.') : toast.error(r.error);
  }
  async function rename(u: U) {
    const full_name = window.prompt('Nama lengkap:', u.full_name);
    if (!full_name || full_name === u.full_name) return;
    const r = await call(`/api/users/${u.id}`, 'PATCH', { full_name });
    r.ok ? (toast.success('Nama diperbarui.'), router.refresh()) : toast.error(r.error);
  }
  async function setClass(u: U, class_id: string) {
    const r = await call(`/api/users/${u.id}`, 'PATCH', { class_id: class_id || null });
    r.ok ? (toast.success('Kelas diperbarui.'), router.refresh()) : toast.error(r.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1"><Label htmlFor="q">Cari</Label><Input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama atau username" /></div>
        <div><Label htmlFor="rf">Role</Label>
          <select id="rf" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={sel}>
            <option value="">Semua</option>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <Button onClick={() => setOpen((o) => !o)}>{open ? 'Tutup form' : 'Tambah akun'}</Button>
      </div>

      {open ? (
        <form onSubmit={create} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
          {error ? <div className="sm:col-span-2"><Alert>{error}</Alert></div> : null}
          <div><Label htmlFor="role">Role</Label><select id="role" value={f.role} onChange={set('role')} className={sel}>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><Label htmlFor="full_name">Nama lengkap</Label><Input id="full_name" value={f.full_name} onChange={set('full_name')} required /></div>
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={f.email} onChange={set('email')} required /></div>
          <div><Label htmlFor="username">Username (opsional)</Label><Input id="username" value={f.username} onChange={set('username')} autoCapitalize="none" /></div>
          <div><Label htmlFor="password">Password awal</Label><Input id="password" type="text" value={f.password} onChange={set('password')} required /></div>
          {f.role === 'murid' ? <>
            <div><Label htmlFor="nis">NIS</Label><Input id="nis" value={f.nis} onChange={set('nis')} required /></div>
            <div><Label htmlFor="class_id">Kelas</Label><select id="class_id" value={f.class_id} onChange={set('class_id')} className={sel}><option value="">Belum ada kelas</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </> : null}
          {f.role === 'guru_piket' ? <div><Label htmlFor="nip">NIP</Label><Input id="nip" value={f.nip} onChange={set('nip')} /></div> : null}
          {f.role === 'orang_tua' ? <>
            <div><Label htmlFor="phone">No. HP / WhatsApp</Label><Input id="phone" value={f.phone} onChange={set('phone')} inputMode="tel" /></div>
            <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-medium">Anak (boleh lebih dari satu)</legend>
              <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700 sm:grid-cols-2">
                {students.map((s) => (
                  <label key={s.id} className="flex items-center gap-2"><input type="checkbox" checked={f.student_ids.includes(s.id)}
                    onChange={(e) => setF((p) => ({ ...p, student_ids: e.target.checked ? [...p.student_ids, s.id] : p.student_ids.filter((x) => x !== s.id) }))} /> {s.full_name}</label>
                ))}
              </div></fieldset>
          </> : null}
          <div className="sm:col-span-2"><Button type="submit" loading={busy}>Simpan akun</Button></div>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800"><tr><th className="p-3">Nama</th><th className="p-3">Role</th><th className="p-3">Kelas</th><th className="p-3">Status</th><th className="p-3 text-right">Aksi</th></tr></thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="p-3">{u.full_name}<div className="text-xs text-slate-400">{u.username ?? '-'}</div></td>
                <td className="p-3">{ROLE_LABEL[u.role]}</td>
                <td className="p-3">{u.role === 'murid'
                  ? <select aria-label={`Kelas ${u.full_name}`} value={u.class_id ?? ''} onChange={(e) => setClass(u, e.target.value)} className="rounded border border-slate-300 bg-white px-1 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="">-</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  : (u.class_id ? className.get(u.class_id) : '-')}</td>
                <td className="p-3">{u.is_active ? <span className="text-green-600">Aktif</span> : <span className="text-red-600">Nonaktif</span>}</td>
                <td className="space-x-2 p-3 text-right text-xs">
                  <button className="text-indigo-600 hover:underline" onClick={() => rename(u)}>Ubah nama</button>
                  <button className="text-indigo-600 hover:underline" onClick={() => reset(u)}>Reset password</button>
                  <button className="text-red-600 hover:underline" onClick={() => toggle(u)}>{u.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                </td>
              </tr>
            ))}
            {shown.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-slate-500">Tidak ada pengguna yang cocok.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
