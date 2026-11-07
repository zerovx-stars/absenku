'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Alert, Button, FieldError, Input, Label } from '@/components/ui/primitives';
import { loginSchema, type LoginInput } from '@/lib/validators';

const MESSAGES: Record<string, string> = {
  nonaktif: 'Akun Anda dinonaktifkan atau tidak ditemukan.',
  idle: 'Anda keluar otomatis karena tidak aktif selama 30 menit.',
  tautan: 'Tautan tidak valid atau sudah kedaluwarsa.',
  sesi: 'Sesi Anda berakhir. Silakan masuk kembali.',
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get('error');
  const [error, setError] = useState<string | null>(initial ? MESSAGES[initial] ?? null : null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '', remember: true },
  });

  async function onSubmit(values: LoginInput) {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error ?? 'Gagal masuk. Coba lagi.'); return; }
      toast.success('Berhasil masuk.');
      const next = params.get('next');
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : body.redirect);
      router.refresh();
    } catch {
      setError('Tidak dapat terhubung ke server. Periksa koneksi Anda.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error ? <Alert>{error}</Alert> : null}
      <div>
        <Label htmlFor="identifier">Email atau username</Label>
        <Input id="identifier" autoComplete="username" autoCapitalize="none" {...register('identifier')} />
        <FieldError message={errors.identifier?.message} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
        <FieldError message={errors.password?.message} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register('remember')} /> Ingat saya
        </label>
        <Link href="/lupa-password" className="text-indigo-600 hover:underline dark:text-indigo-400">Lupa password?</Link>
      </div>
      <Button type="submit" className="w-full" loading={isSubmitting}>Masuk</Button>
    </form>
  );
}
