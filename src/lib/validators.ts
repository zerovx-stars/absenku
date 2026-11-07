import { z } from 'zod';
export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Isi email atau username.'),
  password: z.string().min(6, 'Password minimal 6 karakter.'),
  remember: z.boolean(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const emailSchema = z.object({ email: z.string().trim().email('Format email tidak valid.') });
export type EmailInput = z.infer<typeof emailSchema>;

const newPassword = z.string().min(8, 'Minimal 8 karakter.').regex(/[A-Za-z]/, 'Harus mengandung huruf.').regex(/\d/, 'Harus mengandung angka.');
export const resetSchema = z.object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Konfirmasi password tidak sama.' });
export type ResetInput = z.infer<typeof resetSchema>;

export const changePasswordSchema = z.object({ current: z.string().min(1, 'Isi password saat ini.'), password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Konfirmasi password tidak sama.' });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const createSessionSchema = z.object({
  class_id: z.string().uuid('Pilih kelas.'),
  title: z.string().trim().min(3, 'Judul minimal 3 karakter.').max(100),
  starts_at: z.string().datetime({ message: 'Jam mulai tidak valid.' }),
  ends_at: z.string().datetime({ message: 'Jam selesai tidak valid.' }),
  late_tolerance_min: z.number().int().min(0).max(120),
  qr_interval_sec: z.number().int().min(30, 'Interval QR 30–60 detik.').max(60, 'Interval QR 30–60 detik.'),
}).refine((v) => new Date(v.ends_at) > new Date(v.starts_at), { path: ['ends_at'], message: 'Jam selesai harus setelah jam mulai.' });

export const sessionActionSchema = z.object({ action: z.enum(['open', 'close']) });

export const scanSchema = z.object({
  token: z.string().min(20).max(1000),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000),
  device_id: z.string().min(8).max(100),
});

export const ROLE_ENUM = z.enum(['admin', 'guru_piket', 'murid', 'orang_tua']);
const STATUS_ENUM = z.enum(['hadir', 'terlambat', 'alfa', 'izin', 'sakit', 'di_luar_area']);

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email tidak valid.'),
  username: z.string().trim().min(3, 'Username minimal 3 karakter.').max(30).regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya huruf, angka, titik, garis bawah, atau strip.').optional(),
  full_name: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(100),
  password: newPassword,
  role: ROLE_ENUM,
  nis: z.string().trim().min(1).max(30).optional(),
  nip: z.string().trim().max(30).optional(),
  phone: z.string().trim().max(20).optional(),
  class_id: z.string().uuid().optional(),
  student_ids: z.array(z.string().uuid()).max(10).optional(),
}).refine((v) => v.role !== 'murid' || !!v.nis, { path: ['nis'], message: 'NIS wajib diisi untuk murid.' });
export type NewUser = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  full_name: z.string().trim().min(2).max(100).optional(),
  is_active: z.boolean().optional(),
  password: newPassword.optional(),
  class_id: z.string().uuid().nullable().optional(),
  student_ids: z.array(z.string().uuid()).max(10).optional(),
});

export const importSchema = z.object({
  offset: z.number().int().min(0).default(0),
  rows: z.array(z.object({
    full_name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email(),
    nis: z.string().trim().min(1).max(30),
    class_name: z.string().trim().max(50).optional(),
  })).min(1).max(50),
});

export const leaveActionSchema = z.object({ action: z.enum(['approve', 'reject']) });
export const attendancePatchSchema = z.object({ status: STATUS_ENUM, note: z.string().trim().min(3, 'Isi alasan perubahan (minimal 3 karakter).').max(300) });
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid.');
export const reportQuerySchema = z.object({
  from: day, to: day, class_id: z.string().uuid().optional(), student_id: z.string().uuid().optional(), status: STATUS_ENUM.optional(),
}).refine((v) => v.from <= v.to && (Date.parse(v.to) - Date.parse(v.from)) / 864e5 <= 366, { path: ['to'], message: 'Rentang tanggal maksimal 366 hari.' });
