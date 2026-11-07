import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { ImportStudents } from './import-students';

export default async function ImporPage() {
  const me = await getMe();
  if (!me || me.role !== 'admin') redirect('/');
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Impor Murid</h1>
      <ImportStudents />
    </div>
  );
}
