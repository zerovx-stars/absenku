-- Bucket publik untuk logo sekolah; hanya admin yang boleh menulis
insert into storage.buckets (id, name, public) values ('school-assets', 'school-assets', true) on conflict do nothing;
create policy school_assets_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'school-assets' and is_admin()) with check (bucket_id = 'school-assets' and is_admin());
