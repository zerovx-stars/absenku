import { Suspense } from 'react';
import { AuthCard } from '@/components/ui/primitives';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <AuthCard title="Masuk" subtitle="Gunakan email atau username akun sekolah Anda.">
      <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
