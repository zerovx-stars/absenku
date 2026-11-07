'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AuthCard, Button, FieldError, Input, Label } from '@/components/ui/primitives';
import { createClient } from '@/lib/supabase/client';
import { emailSchema, type EmailInput } from '@/lib/validators';

export default function LupaPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EmailInput>({ resolver: zodResolver(emailSchema) });

  async function onSubmit({ email }: EmailInput) {
    setError(null);
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${base}/auth/callback?next=/reset-password` });
    if (error && error.status === 429) { setError('Terlalu banyak permintaan. Coba lagi beberapa menit lagi.'); return; }
    setSent(true); // pesan sama untuk semua email agar tidak membocorkan akun terdaftar
  }

  return (
    <AuthCard title="Lupa password" subtitle="Kami kirim tautan reset ke email akun Anda.">
      {sent ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">Jika email terdaftar, tautan reset password sudah dikirim. Periksa kotak masuk dan folder spam.</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error ? <Alert>{error}</Alert> : null}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            <FieldError message={errors.email?.message} />
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>Kirim tautan reset</Button>
        </form>
      )}
      <Link href="/login" className="mt-6 block text-center text-sm text-indigo-600 hover:underline dark:text-indigo-400">Kembali ke halaman masuk</Link>
    </AuthCard>
  );
}
