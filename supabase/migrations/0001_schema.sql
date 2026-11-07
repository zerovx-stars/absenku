-- Sistem Absensi Kehadiran Sekolah: skema inti (Supabase/PostgreSQL)
create extension if not exists pgcrypto;

create type user_role as enum ('admin','guru_piket','murid','orang_tua');
create type attendance_status as enum ('hadir','terlambat','alfa','izin','sakit','di_luar_area');
create type session_status as enum ('draft','open','closed');
create type leave_type as enum ('izin','sakit');
create type leave_status as enum ('pending','approved','rejected');
create type geofence_mode as enum ('reject','flag');

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  username text unique,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_touch before update on profiles for each row execute function touch_updated_at();

create table academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_date date not null,
  end_date date not null check (end_date > start_date),
  is_active boolean not null default false
);
-- hanya satu tahun ajaran aktif
create unique index academic_years_one_active on academic_years (is_active) where is_active;

create table teachers (
  profile_id uuid primary key references profiles(id) on delete cascade,
  nip text unique
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references academic_years(id) on delete restrict,
  name text not null,
  grade smallint not null check (grade between 1 and 12),
  homeroom_teacher_id uuid references teachers(profile_id) on delete set null,
  unique (academic_year_id, name)
);

create table students (
  profile_id uuid primary key references profiles(id) on delete cascade,
  nis text not null unique,
  class_id uuid references classes(id) on delete set null
);
create index students_class_idx on students(class_id);

create table parents (
  profile_id uuid primary key references profiles(id) on delete cascade,
  phone text
);

create table parent_student (
  parent_id uuid not null references parents(profile_id) on delete cascade,
  student_id uuid not null references students(profile_id) on delete cascade,
  relation text not null default 'orang tua',
  primary key (parent_id, student_id)
);
create index parent_student_student_idx on parent_student(student_id);

create table subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  teacher_id uuid references teachers(profile_id) on delete set null,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null check (end_time > start_time)
);
create index schedules_class_idx on schedules(class_id, day_of_week);
create index schedules_teacher_idx on schedules(teacher_id);

create table attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  schedule_id uuid references schedules(id) on delete set null,
  title text not null,
  opened_by uuid not null references profiles(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  late_tolerance_min integer not null default 10 check (late_tolerance_min >= 0),
  qr_interval_sec integer not null default 30 check (qr_interval_sec between 30 and 60),
  status session_status not null default 'draft',
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index sessions_class_status_idx on attendance_sessions(class_id, status);
create index sessions_opened_by_idx on attendance_sessions(opened_by);

create table qr_tokens (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references attendance_sessions(id) on delete cascade,
  nonce text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index qr_tokens_session_exp_idx on qr_tokens(session_id, expires_at);

create table attendances (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references attendance_sessions(id) on delete cascade,
  student_id uuid not null references students(profile_id) on delete cascade,
  status attendance_status not null,
  scanned_at timestamptz,            -- null untuk Alfa otomatis
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  accuracy_m real,
  distance_m real,
  in_area boolean,
  device_id text,
  user_agent text,
  note text,
  changed_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (session_id, student_id)    -- cegah absen ganda
);
create index attendances_student_idx on attendances(student_id, scanned_at desc);
create index attendances_session_device_idx on attendances(session_id, device_id);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(profile_id) on delete cascade,
  session_id uuid references attendance_sessions(id) on delete set null,
  leave_date date not null default (now() at time zone 'Asia/Jakarta')::date,
  type leave_type not null,
  reason text not null,
  proof_path text,
  status leave_status not null default 'pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index leave_student_idx on leave_requests(student_id, leave_date desc);
create index leave_status_idx on leave_requests(status);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, is_read, created_at desc);

create table school_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'Sekolah Saya',
  logo_url text,
  lat double precision not null default -6.2,
  lng double precision not null default 106.816666,
  radius_m integer not null default 100 check (radius_m > 0),
  geofence_mode geofence_mode not null default 'flag',
  start_time time not null default '07:00',
  late_tolerance_min integer not null default 10,
  updated_at timestamptz not null default now()
);
insert into school_settings (id) values (1);
create trigger trg_settings_touch before update on school_settings for each row execute function touch_updated_at();

create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on audit_logs(created_at desc);

-- Rate limiting serverless (dipanggil dari Route Handler dengan service role)
create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

create or replace function hit_rate_limit(p_key text, p_limit int, p_window_sec int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_window timestamptz; v_count int;
begin
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_sec) * p_window_sec);
  insert into rate_limits(key, window_start, count) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = rate_limits.count + 1
  returning count into v_count;
  delete from rate_limits where window_start < now() - interval '1 day';
  return v_count <= p_limit;   -- true = masih diizinkan
end $$;
revoke all on function hit_rate_limit(text,int,int) from public, anon, authenticated;
grant execute on function hit_rate_limit(text,int,int) to service_role;

-- Notifikasi otomatis saat status absensi berubah
create or replace function notify_on_attendance() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text; v_title text; v_body text; v_opener uuid;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
  select full_name into v_name from profiles where id = new.student_id;
  v_title := case new.status
    when 'hadir' then 'Anak Anda hadir'
    when 'terlambat' then 'Anak Anda terlambat'
    when 'alfa' then 'Anak Anda alfa'
    when 'izin' then 'Izin anak Anda dicatat'
    when 'sakit' then 'Sakit anak Anda dicatat'
    else 'Absen di luar area sekolah' end;
  v_body := v_name || ' tercatat ' || replace(new.status::text,'_',' ') || ' pukul '
    || to_char(coalesce(new.scanned_at, now()) at time zone 'Asia/Jakarta','HH24:MI') || ' WIB.';

  insert into notifications(user_id, title, body, data)
  select ps.parent_id, v_title, v_body,
         jsonb_build_object('attendance_id', new.id, 'student_id', new.student_id, 'status', new.status)
  from parent_student ps where ps.student_id = new.student_id;

  if new.status in ('terlambat','alfa','di_luar_area') then
    select opened_by into v_opener from attendance_sessions where id = new.session_id;
    if v_opener is not null then
      insert into notifications(user_id, title, body, data)
      values (v_opener, replace(v_title,'Anak Anda','Murid'), v_body,
              jsonb_build_object('attendance_id', new.id, 'student_id', new.student_id, 'status', new.status));
    end if;
  end if;
  return new;
end $$;
create trigger trg_attendance_notify after insert or update of status on attendances
  for each row execute function notify_on_attendance();

-- Realtime
alter publication supabase_realtime add table attendances, notifications;
