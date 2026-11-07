-- Data demo. Password semua akun: Demo@12345  (WAJIB diganti di produksi)
do $$
declare r record;
begin
  for r in select * from (values
    ('00000000-0000-4000-8000-000000000001'::uuid,'admin@demo.sekolah.id','admin','Admin Demo','admin'::user_role),
    ('00000000-0000-4000-8000-000000000002'::uuid,'guru@demo.sekolah.id','guru','Bu Rina (Guru Piket)','guru_piket'::user_role),
    ('00000000-0000-4000-8000-000000000003'::uuid,'murid@demo.sekolah.id','murid','Budi Santoso','murid'::user_role),
    ('00000000-0000-4000-8000-000000000004'::uuid,'murid2@demo.sekolah.id','murid2','Siti Santoso','murid'::user_role),
    ('00000000-0000-4000-8000-000000000005'::uuid,'ortu@demo.sekolah.id','ortu','Pak Santoso','orang_tua'::user_role)
  ) as v(id, email, username, full_name, role) loop
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
      raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
      confirmation_token,recovery_token,email_change,email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', r.id,'authenticated','authenticated', r.email,
      crypt('Demo@12345', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}','{}', now(), now(), '','','','')
    on conflict (id) do nothing;
    insert into auth.identities (id,user_id,provider_id,provider,identity_data,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(), r.id, r.id::text,'email',
      jsonb_build_object('sub', r.id::text,'email', r.email,'email_verified', true), now(), now(), now())
    on conflict do nothing;
    insert into profiles (id, role, full_name, username) values (r.id, r.role, r.full_name, r.username)
    on conflict (id) do nothing;
  end loop;
end $$;

insert into academic_years (id,name,start_date,end_date,is_active)
values ('10000000-0000-4000-8000-000000000001','2026/2027','2026-07-13','2027-06-26',true) on conflict do nothing;
insert into teachers (profile_id, nip) values ('00000000-0000-4000-8000-000000000002','198001012005012001') on conflict do nothing;
insert into classes (id,academic_year_id,name,grade,homeroom_teacher_id)
values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','X IPA 1',10,'00000000-0000-4000-8000-000000000002') on conflict do nothing;
insert into students (profile_id, nis, class_id) values
  ('00000000-0000-4000-8000-000000000003','2026001','20000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000004','2026002','20000000-0000-4000-8000-000000000001') on conflict do nothing;
insert into parents (profile_id, phone) values ('00000000-0000-4000-8000-000000000005','081200000000') on conflict do nothing;
insert into parent_student (parent_id, student_id, relation) values   -- satu orang tua, dua anak
  ('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000003','ayah'),
  ('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000004','ayah') on conflict do nothing;
insert into subjects (id, code, name) values
  ('30000000-0000-4000-8000-000000000001','MTK','Matematika'),
  ('30000000-0000-4000-8000-000000000002','BIN','Bahasa Indonesia') on conflict do nothing;
insert into schedules (class_id,subject_id,teacher_id,day_of_week,start_time,end_time) values
  ('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',1,'07:00','08:30'),
  ('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002',1,'08:30','10:00');

-- Titik sekolah: koordinat PLACEHOLDER, ubah dari dashboard admin
update school_settings set name = 'SMA Demo Nusantara', lat = -6.2, lng = 106.816666, radius_m = 100,
  geofence_mode = 'flag', start_time = '07:00', late_tolerance_min = 10 where id = 1;
