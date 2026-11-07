# Sistem Absensi Kehadiran Sekolah

Next.js 14 (App Router) + TypeScript, Tailwind, Supabase (Postgres, Auth, RLS, Realtime, Storage), siap deploy ke Vercel.
Fitur: QR dinamis berganti 30–60 detik, scan kamera, verifikasi GPS (geofence Haversine), peta realtime, 4 role (Admin, Guru Piket, Murid, Orang Tua), izin/sakit dengan bukti, laporan + ekspor Excel/PDF/cetak, notifikasi realtime (opsional email/WhatsApp).

## Struktur
```
src/app/(auth)/        login, lupa-password, reset-password
src/app/(dashboard)/   admin, guru-piket, murid, orang-tua, sesi, scan, izin, laporan, profil
src/app/api/           auth, session, qr, scan, users, leave, attendance, reports
src/components/        ui, layout, charts, map, qr, notifications
src/lib/               supabase (client/server/admin), qr-token, haversine, notify, validators, ...
supabase/migrations/   0001 skema+trigger+realtime, 0002 RLS, 0003 statistik, 0004 storage
supabase/seed.sql      data + akun demo
```

## Langkah setup
1. **Buat proyek Supabase** di supabase.com. Catat Project URL, anon key, dan service_role key (Project Settings → API).
2. **Jalankan SQL** di SQL Editor, berurutan: `0001_schema.sql`, `0002_rls.sql`, `0003_dashboard_stats.sql`, `0004_storage_assets.sql`, lalu `seed.sql`. (Atau dengan Supabase CLI: `supabase link` lalu `supabase db push`, kemudian jalankan `seed.sql`.)
3. **Auth → URL Configuration**: isi *Site URL* dengan URL aplikasi, dan tambahkan *Redirect URLs*: `http://localhost:3000/auth/callback` dan `https://DOMAIN-ANDA/auth/callback` (wajib untuk reset password).
4. **Auth → Providers → Email**: pengaturan "Confirm email" tidak memengaruhi akun yang dibuat admin (sudah terkonfirmasi). Untuk email reset password yang andal di produksi, atur SMTP sendiri (Auth → SMTP Settings).
5. **Environment**: salin `.env.example` menjadi `.env.local`, isi semua nilai. `QR_TOKEN_SECRET` minimal 32 karakter acak (mis. `openssl rand -base64 48`). `SUPABASE_SERVICE_ROLE_KEY` hanya untuk server, jangan pernah diberi prefix `NEXT_PUBLIC_`.
6. **Jalankan lokal**: `npm install` lalu `npm run dev` (http://localhost:3000). Kamera dan GPS hanya jalan di HTTPS atau `localhost`.
7. **Deploy ke Vercel**: push ke Git, Import Project di Vercel, isi env variables yang sama (`NEXT_PUBLIC_APP_URL` = URL produksi), Deploy. Setelah deploy, perbarui Site URL dan Redirect URL di Supabase.
8. **Pengaturan awal**: login sebagai admin → *Pengaturan* (klik peta untuk menaruh titik sekolah, atur radius), *Data Master* (tahun ajaran, kelas, mapel, jadwal), *Pengguna* atau *Impor Murid*.

## Akun demo (dari seed.sql)
Password semua akun: `Demo@12345`. **Ganti atau hapus akun demo sebelum dipakai sungguhan.**

| Role | Email | Username |
|---|---|---|
| Admin | admin@demo.sekolah.id | admin |
| Guru Piket | guru@demo.sekolah.id | guru |
| Murid | murid@demo.sekolah.id | murid |
| Murid (anak kedua) | murid2@demo.sekolah.id | murid2 |
| Orang Tua (2 anak) | ortu@demo.sekolah.id | ortu |

Login bisa memakai email atau username. Koordinat sekolah di seed hanya placeholder.

## Alur pemakaian singkat
Guru piket: *Sesi Absensi* → buka sesi → tampilkan QR (tombol Layar penuh untuk proyektor) → pantau daftar dan peta realtime → tutup sesi (yang belum scan otomatis Alfa, atau Izin/Sakit bila sudah disetujui). Murid: *Scan Absen* → izinkan kamera dan lokasi. Orang tua menerima notifikasi di aplikasi.

## Notifikasi email / WhatsApp (opsional)
Isi `RESEND_API_KEY` (+ `RESEND_FROM`) untuk email, dan/atau `WA_WEBHOOK_URL` (+ `WA_WEBHOOK_TOKEN`) untuk gateway WhatsApp milik Anda yang menerima `POST {"to","message"}`. Kosongkan untuk menonaktifkan. Kode ada di `src/lib/notify/`.

## Keamanan
RLS aktif di semua tabel; scan dan pembuatan akun ditulis server dengan service role; token QR bertanda tangan HMAC dan kedaluwarsa; rate limit di endpoint login, QR, dan scan; middleware memblokir halaman role lain dan mencabut akses akun nonaktif pada request berikutnya; logout otomatis setelah 30 menit tidak aktif.

## Troubleshooting
- **Login gagal padahal password benar**: pastikan seed sudah dijalankan; cek akun tidak nonaktif; cek `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` benar.
- **Data kosong / "permission denied"**: urutan migrasi harus 0001 → 0002 → 0003 → 0004. Murid tanpa kelas atau guru tanpa jadwal/wali kelas tidak melihat kelasnya karena RLS. Atur wali kelas di Data Master.
- **Env belum terbaca**: di Vercel, ubah env lalu *Redeploy*. Variabel `NEXT_PUBLIC_*` ditanam saat build. Lokal: restart `npm run dev`.
- **Kamera/GPS tidak jalan**: wajib HTTPS (atau localhost) dan izin browser diberikan. Akurasi GPS di atas 100 m ditolak, pindah ke area terbuka.
- **QR "kedaluwarsa"**: scan QR terbaru di layar; jam perangkat server dan murid tidak perlu sama, tetapi koneksi harus stabil.
- **Reset password tidak sampai / tautan tidak valid**: periksa Redirect URL di Supabase dan batas pengiriman email bawaan (gunakan SMTP sendiri).
- **Peta/realtime tidak update**: pastikan migrasi 0001 sukses (menambahkan `attendances` dan `notifications` ke publikasi `supabase_realtime`).
- **Impor murid gagal**: nama kelas di file harus persis sama dengan Data Master; email tidak boleh sudah terdaftar.
