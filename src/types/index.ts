import type { Role } from '@/lib/roles';

export type AttendanceStatus = 'hadir' | 'terlambat' | 'alfa' | 'izin' | 'sakit' | 'di_luar_area';
export type SessionStatus = 'draft' | 'open' | 'closed';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface Profile { id: string; full_name: string; role: Role; username: string | null; is_active: boolean }
export interface SchoolSettings {
  name: string; logo_url: string | null; lat: number; lng: number; radius_m: number;
  geofence_mode: 'reject' | 'flag'; start_time: string; late_tolerance_min: number;
}
export interface ReportRow {
  tanggal: string; sesi: string; kelas: string; nis: string; nama: string; status: AttendanceStatus;
  waktu: string; jarak_m: number | null; catatan: string;
}
