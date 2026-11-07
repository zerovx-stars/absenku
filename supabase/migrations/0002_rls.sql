-- Row Level Security. Fungsi helper security definer menghindari rekursi policy.
-- Catatan: akun nonaktif -> app_role() = null -> semua policy menolak.

create or replace function app_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and is_active
$$;
create or replace function is_active_user() returns boolean
language sql stable security definer set search_path = public as $$ select app_role() is not null $$;
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$ select coalesce(app_role() = 'admin', false) $$;

-- Admin, atau guru piket yang mengampu/mewali/membuka sesi di kelas tersebut
create or replace function teacher_manages_class(p_class uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_role() = 'admin', false) or (app_role() = 'guru_piket' and (
    exists (select 1 from classes c where c.id = p_class and c.homeroom_teacher_id = auth.uid())
    or exists (select 1 from schedules s where s.class_id = p_class and s.teacher_id = auth.uid())
    or exists (select 1 from attendance_sessions a where a.class_id = p_class and a.opened_by = auth.uid())))
$$;

create or replace function can_see_student(p_student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_active_user() and (
    p_student = auth.uid() or app_role() = 'admin'
    or exists (select 1 from parent_student ps where ps.student_id = p_student and ps.parent_id = auth.uid())
    or exists (select 1 from students s where s.profile_id = p_student and teacher_manages_class(s.class_id)))
$$;

alter table profiles enable row level security;
alter table academic_years enable row level security;
alter table teachers enable row level security;
alter table classes enable row level security;
alter table students enable row level security;
alter table parents enable row level security;
alter table parent_student enable row level security;
alter table subjects enable row level security;
alter table schedules enable row level security;
alter table attendance_sessions enable row level security;
alter table qr_tokens enable row level security;       -- tanpa policy: hanya service role
alter table attendances enable row level security;
alter table leave_requests enable row level security;
alter table notifications enable row level security;
alter table school_settings enable row level security;
alter table audit_logs enable row level security;
alter table rate_limits enable row level security;     -- tanpa policy: hanya service role

-- Data referensi: semua pengguna aktif boleh baca, hanya admin yang menulis
do $$ declare t text; begin
  foreach t in array array['academic_years','classes','subjects','schedules','teachers','school_settings'] loop
    execute format('create policy %I on %I for select to authenticated using (is_active_user())', t || '_read', t);
    execute format('create policy %I on %I for all to authenticated using (is_admin()) with check (is_admin())', t || '_admin', t);
  end loop;
end $$;

-- profiles: diri sendiri, admin, murid yang boleh dilihat, dan nama guru
create policy profiles_read on profiles for select to authenticated using (
  (id = auth.uid() and is_active_user()) or is_admin()
  or (role = 'guru_piket' and is_active_user())
  or (role = 'murid' and can_see_student(id)));
create policy profiles_admin on profiles for all to authenticated using (is_admin()) with check (is_admin());

create policy students_read on students for select to authenticated using (can_see_student(profile_id));
create policy students_admin on students for all to authenticated using (is_admin()) with check (is_admin());

create policy parents_read on parents for select to authenticated using (profile_id = auth.uid() or is_admin());
create policy parents_admin on parents for all to authenticated using (is_admin()) with check (is_admin());

create policy parent_student_read on parent_student for select to authenticated
  using (parent_id = auth.uid() or student_id = auth.uid() or is_admin());
create policy parent_student_admin on parent_student for all to authenticated using (is_admin()) with check (is_admin());

-- Sesi: guru terkait (CRUD), murid kelas tersebut (baca)
create policy sessions_read on attendance_sessions for select to authenticated using (
  teacher_manages_class(class_id)
  or exists (select 1 from students s where s.profile_id = auth.uid() and s.class_id = attendance_sessions.class_id and is_active_user()));
create policy sessions_write on attendance_sessions for all to authenticated
  using (teacher_manages_class(class_id))
  with check (teacher_manages_class(class_id) and opened_by = auth.uid());

-- Absensi: scan murid ditulis server (service role); guru/admin boleh koreksi manual
create policy attendances_read on attendances for select to authenticated using (can_see_student(student_id));
create policy attendances_staff_write on attendances for all to authenticated
  using (exists (select 1 from attendance_sessions a where a.id = session_id and teacher_manages_class(a.class_id)))
  with check (exists (select 1 from attendance_sessions a where a.id = session_id and teacher_manages_class(a.class_id)));

create policy leave_read on leave_requests for select to authenticated using (can_see_student(student_id));
create policy leave_insert on leave_requests for insert to authenticated
  with check (student_id = auth.uid() and is_active_user() and status = 'pending');
create policy leave_review on leave_requests for update to authenticated
  using (exists (select 1 from students s where s.profile_id = student_id and teacher_manages_class(s.class_id)))
  with check (exists (select 1 from students s where s.profile_id = student_id and teacher_manages_class(s.class_id)));

create policy notifications_read on notifications for select to authenticated using (user_id = auth.uid() and is_active_user());
create policy notifications_update on notifications for update to authenticated
  using (user_id = auth.uid() and is_active_user()) with check (user_id = auth.uid());

create policy audit_admin_read on audit_logs for select to authenticated using (is_admin());

-- Storage: bukti izin/sakit (folder = id murid)
insert into storage.buckets (id, name, public) values ('leave-proofs', 'leave-proofs', false) on conflict do nothing;
create policy proofs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'leave-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy proofs_read on storage.objects for select to authenticated
  using (bucket_id = 'leave-proofs' and can_see_student(((storage.foldername(name))[1])::uuid));
