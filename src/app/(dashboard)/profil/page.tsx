'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Alert, Button, FieldError, Input, Label } from '@/components/ui/primitives';
import { createClient } from '@/lib/supabase/client';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validators';

export default function ProfilPage() {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(v: ChangePasswordInput) {
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setError('Sesi tidak valid. Silakan masuk kembali.'); return; }
    // Verifikasi password lama sebelum mengganti
    const check = await supabase.auth.signInWithPassword({ email: user.email, password: v.current });
    if (check.error) { setError('Password saat ini salah.'); return; }
    const { error } = await supabase.auth.updateUser({ password: v.password });
    if (error) { setError('Gagal mengganti password. Coba lagi.'); return; }
    toast.success('Password berhasil diganti.');
    reset();
  }

  return (
    <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-xl font-semibold">Ganti password</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
        {error ? <Alert>{error}</Alert> : null}
        <div><Label htmlFor="current">Password saat ini</Label><Input id="current" type="password" autoComplete="current-password" {...register('current')} /><FieldError message={errors.current?.message} /></div>
        <div><Label htmlFor="password">Password baru</Label><Input id="password" type="password" autoComplete="new-password" {...register('password')} /><FieldError message={errors.password?.message} /></div>
        <div><Label htmlFor="confirm">Konfirmasi password baru</Label><Input id="confirm" type="password" autoComplete="new-password" {...register('confirm')} /><FieldError message={errors.confirm?.message} /></div>
        <Button type="submit" loading={isSubmitting}>Simpan</Button>
      </form>
    </section>
  );
}
