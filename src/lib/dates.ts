// Semua tanggal bisnis memakai zona waktu Asia/Jakarta (WIB)
export const dayWib = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
export const todayWib = () => dayWib(new Date());
export const wibDayRange = (day: string) => ({ from: `${day}T00:00:00+07:00`, to: `${day}T23:59:59.999+07:00` });
// Relasi 1-ke-1 dari PostgREST bisa berupa objek atau array
export function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}
export const isPresent = (status: string) => status === 'hadir' || status === 'terlambat';
