-- ElektrUy storage buckets. Object keys in private buckets must start with the
-- owner's user id: "<uid>/<project-or-check-id>/<file>".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('ew-project-photos', 'ew-project-photos', false, 6291456, array['image/jpeg', 'image/png', 'image/webp']),
  ('ew-work-checks', 'ew-work-checks', false, 6291456, array['image/jpeg', 'image/png', 'image/webp']),
  ('ew-lesson-media', 'ew-lesson-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- private, per-user folders
create policy ew_project_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'ew-project-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy ew_project_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'ew-project-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
              and (select ew_private.is_active()));
create policy ew_project_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'ew-project-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'ew-project-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy ew_project_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'ew-project-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- work-check photos: owner, plus admins for results the user flagged as wrong
create policy ew_work_checks_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'ew-work-checks' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or ((select ew_private.is_admin()) and exists (
      select 1 from public.ew_work_checks w where w.flagged_wrong and name = any (w.image_paths)))));
create policy ew_work_checks_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'ew-work-checks' and (storage.foldername(name))[1] = (select auth.uid())::text
              and (select ew_private.is_active()));
create policy ew_work_checks_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'ew-work-checks' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- lesson media: public read through the public URL, admin write
create policy ew_lesson_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'ew-lesson-media' and (select ew_private.is_admin()));
create policy ew_lesson_media_update on storage.objects for update to authenticated
  using (bucket_id = 'ew-lesson-media' and (select ew_private.is_admin()))
  with check (bucket_id = 'ew-lesson-media' and (select ew_private.is_admin()));
create policy ew_lesson_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'ew-lesson-media' and (select ew_private.is_admin()));
create policy ew_lesson_media_select on storage.objects for select to authenticated
  using (bucket_id = 'ew-lesson-media' and (select ew_private.is_admin()));
