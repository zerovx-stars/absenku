import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { QrScanner } from '@/components/qr/qr-scanner';

export default async function ScanPage() {
  const me = await getMe();
  if (!me || me.role !== 'murid') redirect('/');
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Scan Absen</h1>
      <QrScanner />
    </div>
  );
}
