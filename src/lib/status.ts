export const STATUS_LABEL: Record<string, string> = {
  hadir: 'Hadir', terlambat: 'Terlambat', alfa: 'Alfa', izin: 'Izin', sakit: 'Sakit', di_luar_area: 'Di Luar Area',
};
export const STATUS_COLOR: Record<string, string> = {
  hadir: '#16a34a', terlambat: '#f59e0b', alfa: '#6b7280', izin: '#3b82f6', sakit: '#8b5cf6', di_luar_area: '#ef4444',
};
export const wib = (iso: string | null, opts: Intl.DateTimeFormatOptions = { timeStyle: 'short' }) =>
  iso ? new Intl.DateTimeFormat('id-ID', { ...opts, timeZone: 'Asia/Jakarta' }).format(new Date(iso)) : '-';
