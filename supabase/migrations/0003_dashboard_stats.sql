-- Fungsi statistik dashboard admin. Semua dijaga is_admin() sehingga non-admin menerima hasil kosong.
-- p_bucket: 'day' | 'week' | 'month' (harian / mingguan / bulanan), zona waktu Asia/Jakarta.
create or replace function dashboard_daily(p_days int default 14, p_bucket text default 'day')
returns table(day date, hadir bigint, terlambat bigint, alfa bigint, izin bigint, sakit bigint, di_luar_area bigint)
language sql stable security definer set search_path = public as $$
  select date_trunc(case when p_bucket in ('day','week','month') then p_bucket else 'day' end,
                    s.starts_at at time zone 'Asia/Jakarta')::date as day,
    count(*) filter (where a.status = 'hadir'),
    count(*) filter (where a.status = 'terlambat'),
    count(*) filter (where a.status = 'alfa'),
    count(*) filter (where a.status = 'izin'),
    count(*) filter (where a.status = 'sakit'),
    count(*) filter (where a.status = 'di_luar_area')
  from attendances a join attendance_sessions s on s.id = a.session_id
  where is_admin() and s.starts_at >= now() - make_interval(days => p_days)
  group by 1 order by 1
$$;

-- Ranking kelas: persentase kehadiran = (hadir + terlambat) / seluruh catatan
create or replace function dashboard_class_rank(p_days int default 30)
returns table(class_name text, total bigint, present bigint, pct numeric)
language sql stable security definer set search_path = public as $$
  select c.name, count(*),
    count(*) filter (where a.status in ('hadir','terlambat')),
    round(100.0 * count(*) filter (where a.status in ('hadir','terlambat')) / nullif(count(*), 0), 1)
  from attendances a
  join attendance_sessions s on s.id = a.session_id
  join classes c on c.id = s.class_id
  where is_admin() and s.starts_at >= now() - make_interval(days => p_days)
  group by c.name order by 4 desc nulls last
$$;

-- Murid yang sering terlambat / alfa
create or replace function dashboard_top_issues(p_days int default 30)
returns table(student_id uuid, full_name text, class_name text, late bigint, alfa bigint)
language sql stable security definer set search_path = public as $$
  select a.student_id, p.full_name, c.name,
    count(*) filter (where a.status = 'terlambat'), count(*) filter (where a.status = 'alfa')
  from attendances a
  join profiles p on p.id = a.student_id
  join students st on st.profile_id = a.student_id
  left join classes c on c.id = st.class_id
  join attendance_sessions s on s.id = a.session_id
  where is_admin() and a.status in ('terlambat','alfa') and s.starts_at >= now() - make_interval(days => p_days)
  group by a.student_id, p.full_name, c.name
  order by count(*) desc limit 10
$$;
