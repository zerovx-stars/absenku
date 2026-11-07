'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Alert, AuthCard, Button, FieldError, Input, Label } from '@/components/ui/primitives';
import { createClient } from '@/lib/supabase/client';
import { resetSchema, type ResetInput } from '@/lib/validators';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetInput>({ resolver: zodResolver(resetSchema) });

  async function onSubmit({ password }: ResetInput) {
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) { setError('Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru dari halaman lupa password.'); return; }
    toast.success('Password berhasil diubah.');
    router.replace('/');
    router.refresh();
  }

  return (
    <AuthCard title="Buat password baru" subtitle="Minimal 8 karakter, mengandung huruf dan angka.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error ? <Alert>{error}</Alert> : null}
        <div>
          <Label htmlFor="password">Password baru</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          <FieldError message={errors.password?.message} />
        </div>
        <div>
          <Label htmlFor="confirm">Konfirmasi password</Label>
          <Input id="confirm" type="password" autoComplete="new-password" {...register('confirm')} />
          <FieldError message={errors.confirm?.message} />
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>Simpan password</Button>
      </form>
    </AuthCard>
  );
}
