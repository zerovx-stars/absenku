import Link from 'next/link';
import { GraduationCap, LogOut } from 'lucide-react';
import { ROLE_HOME, ROLE_LABEL, type Role } from '@/lib/roles';
import { IdleLogout } from './idle-logout';
import { NotificationBell } from '@/components/notifications/notification-bell';

const NAV: Record<Role, { href: string; label: string }[]> = {
  admin: [
    { href: '/admin', label: 'Beranda' }, { href: '/sesi', label: 'Sesi Absensi' }, { href: '/laporan', label: 'Laporan' },
    { href: '/izin/tinjau', label: 'Izin/Sakit' }, { href: '/admin/pengguna', label: 'Pengguna' },
    { href: '/admin/data', label: 'Data Master' }, { href: '/admin/impor', label: 'Impor Murid' }, { href: '/admin/pengaturan', label: 'Pengaturan' },
  ],
  guru_piket: [{ href: '/guru-piket', label: 'Beranda' }, { href: '/sesi', label: 'Sesi Absensi' }, { href: '/laporan', label: 'Laporan' }, { href: '/izin/tinjau', label: 'Izin/Sakit' }],
  murid: [{ href: '/murid', label: 'Beranda' }, { href: '/scan', label: 'Scan Absen' }, { href: '/izin', label: 'Izin/Sakit' }],
  orang_tua: [{ href: '/orang-tua', label: 'Beranda' }],
};

type Props = {
  profile: { full_name: string; role: Role }; userId: string;
  school: { name: string; logo_url: string | null }; children: React.ReactNode;
};

export function DashboardShell({ profile, userId, school, children }: Props) {
  const nav = [...NAV[profile.role], { href: '/profil', label: 'Profil' }];
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <IdleLogout />
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 print:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href={ROLE_HOME[profile.role]} className="flex shrink-0 items-center gap-2 font-semibold">
            {school.logo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={school.logo_url} alt="" className="h-6 w-6 rounded object-cover" />
              : <GraduationCap className="h-5 w-5 text-indigo-600" aria-hidden />}
            <span className="hidden max-w-[10rem] truncate sm:inline">{school.name}</span>
          </Link>
          <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto whitespace-nowrap text-sm" aria-label="Menu utama">
            {nav.map((n) => <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">{n.label}</Link>)}
          </nav>
          <NotificationBell userId={userId} />
          <div className="hidden text-right text-xs md:block">
            <p className="font-medium">{profile.full_name}</p>
            <p className="text-slate-500 dark:text-slate-400">{ROLE_LABEL[profile.role]}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
              <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Keluar</span>
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
