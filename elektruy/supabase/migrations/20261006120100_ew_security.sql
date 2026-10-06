-- ElektrUy: helper functions, guard triggers, RLS policies and grants.

create index if not exists ew_admins_user_idx on public.ew_admins (user_id);

-- ---------------------------------------------------------------- helpers
create or replace function ew_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.ew_admins a
      on a.user_id = u.id
      or (a.email = lower(u.email) and u.email_confirmed_at is not null)
    where u.id = auth.uid()
  );
$$;

create or replace function ew_private.is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and not exists (select 1 from public.ew_profiles p where p.id = auth.uid() and p.is_banned);
$$;

create or replace function ew_private.owns_project(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.ew_projects p where p.id = p_project and p.user_id = auth.uid());
$$;

-- Guards only apply to API callers; internal definer code and service_role bypass them.
create or replace function ew_private.is_api_caller()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('authenticated', 'anon');
$$;

revoke all on all functions in schema ew_private from public;
grant execute on function ew_private.is_admin(), ew_private.is_active(),
  ew_private.owns_project(uuid), ew_private.is_api_caller() to authenticated, service_role;

-- ---------------------------------------------------------------- generic triggers
create or replace function ew_private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger ew_profiles_touch before update on public.ew_profiles
  for each row execute function ew_private.touch_updated_at();
create trigger ew_projects_touch before update on public.ew_projects
  for each row execute function ew_private.touch_updated_at();
create trigger ew_lessons_touch before update on public.ew_lessons
  for each row execute function ew_private.touch_updated_at();
create trigger ew_materials_touch before update on public.ew_materials
  for each row execute function ew_private.touch_updated_at();
create trigger ew_material_prices_touch before update on public.ew_material_prices
  for each row execute function ew_private.touch_updated_at();
create trigger ew_electricians_touch before update on public.ew_electricians
  for each row execute function ew_private.touch_updated_at();
create trigger ew_reviews_touch before update on public.ew_reviews
  for each row execute function ew_private.touch_updated_at();
create trigger ew_lesson_progress_touch before update on public.ew_lesson_progress
  for each row execute function ew_private.touch_updated_at();

-- Bump the parent lesson's updated_at when any child row changes so the app's
-- incremental lesson sync (updated_at > last_sync) picks it up.
create or replace function ew_private.bump_lesson()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lesson uuid;
  v_row jsonb := to_jsonb(coalesce(new, old));
begin
  if tg_table_name in ('ew_lesson_translations', 'ew_lesson_steps', 'ew_quiz_questions') then
    v_lesson := (v_row ->> 'lesson_id')::uuid;
  elsif tg_table_name = 'ew_lesson_step_translations' then
    select s.lesson_id into v_lesson from public.ew_lesson_steps s where s.id = (v_row ->> 'step_id')::uuid;
  elsif tg_table_name = 'ew_quiz_question_translations' then
    select q.lesson_id into v_lesson from public.ew_quiz_questions q where q.id = (v_row ->> 'question_id')::uuid;
  end if;
  if v_lesson is not null then
    update public.ew_lessons set updated_at = now() where id = v_lesson;
  end if;
  return null;
end $$;

create trigger ew_lesson_tr_bump after insert or update or delete on public.ew_lesson_translations
  for each row execute function ew_private.bump_lesson();
create trigger ew_lesson_steps_bump after insert or update or delete on public.ew_lesson_steps
  for each row execute function ew_private.bump_lesson();
create trigger ew_lesson_step_tr_bump after insert or update or delete on public.ew_lesson_step_translations
  for each row execute function ew_private.bump_lesson();
create trigger ew_quiz_bump after insert or update or delete on public.ew_quiz_questions
  for each row execute function ew_private.bump_lesson();
create trigger ew_quiz_tr_bump after insert or update or delete on public.ew_quiz_question_translations
  for each row execute function ew_private.bump_lesson();

-- ---------------------------------------------------------------- guard triggers
create or replace function ew_private.guard_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if ew_private.is_api_caller() and not ew_private.is_admin() then
    if tg_op = 'INSERT' then
      new.is_banned := false;
    else
      new.is_banned := old.is_banned;
    end if;
  end if;
  return new;
end $$;
create trigger ew_profiles_guard before insert or update on public.ew_profiles
  for each row execute function ew_private.guard_profile();

create or replace function ew_private.guard_electrician()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not ew_private.is_api_caller() or ew_private.is_admin() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.status := 'pending';
    new.rating_avg := 0;
    new.rating_count := 0;
    new.admin_note := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
  else
    if old.status = 'blocked' then
      raise exception 'ew: blocked profile cannot be edited' using errcode = '42501';
    end if;
    new.user_id := old.user_id;
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
    new.admin_note := old.admin_note;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    -- any self-edit sends the profile back to moderation
    new.status := 'pending';
  end if;
  return new;
end $$;
create trigger ew_electricians_guard before insert or update on public.ew_electricians
  for each row execute function ew_private.guard_electrician();

create or replace function ew_private.guard_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if ew_private.is_api_caller() and not ew_private.is_admin() then
    if tg_op = 'INSERT' then
      new.hidden := false;
      new.user_id := auth.uid();
      if not exists (select 1 from public.ew_electricians e
                     where e.id = new.electrician_id and e.status = 'approved'
                       and e.user_id is distinct from auth.uid()) then
        raise exception 'ew: cannot review this electrician' using errcode = '42501';
      end if;
    else
      new.hidden := old.hidden;
      new.user_id := old.user_id;
      new.electrician_id := old.electrician_id;
    end if;
  end if;
  return new;
end $$;
create trigger ew_reviews_guard before insert or update on public.ew_reviews
  for each row execute function ew_private.guard_review();

create or replace function ew_private.refresh_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := coalesce(new.electrician_id, old.electrician_id);
begin
  update public.ew_electricians e
     set rating_avg = coalesce((select round(avg(r.rating)::numeric, 2) from public.ew_reviews r
                                where r.electrician_id = v_id and not r.hidden), 0),
         rating_count = (select count(*) from public.ew_reviews r where r.electrician_id = v_id and not r.hidden)
   where e.id = v_id;
  return null;
end $$;
create trigger ew_reviews_rating after insert or update or delete on public.ew_reviews
  for each row execute function ew_private.refresh_rating();

create or replace function ew_private.guard_work_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if ew_private.is_api_caller() and not ew_private.is_admin() then
    -- users may only flag a result as wrong and leave feedback
    new.user_id := old.user_id;
    new.project_id := old.project_id;
    new.image_paths := old.image_paths;
    new.lang := old.lang;
    new.overall := old.overall;
    new.result := old.result;
    new.admin_status := old.admin_status;
    new.admin_note := old.admin_note;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger ew_work_checks_guard before update on public.ew_work_checks
  for each row execute function ew_private.guard_work_check();

create or replace function ew_private.guard_report()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if ew_private.is_api_caller() and not ew_private.is_admin() then
    new.user_id := auth.uid();
    new.status := 'open';
    new.admin_note := null;
    new.resolved_at := null;
    new.resolved_by := null;
  elsif tg_op = 'UPDATE' and new.status in ('resolved', 'rejected') and old.status is distinct from new.status then
    new.resolved_at := now();
    new.resolved_by := auth.uid();
  end if;
  return new;
end $$;
create trigger ew_reports_guard before insert or update on public.ew_reports
  for each row execute function ew_private.guard_report();

-- config versioning: every change bumps version and is copied into history
create or replace function ew_private.config_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger ew_app_config_version before insert or update on public.ew_app_config
  for each row execute function ew_private.config_version();

create or replace function ew_private.config_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ew_app_config_history (key, value, version, changed_by)
  values (new.key, new.value, new.version, new.updated_by);
  return null;
end $$;
create trigger ew_app_config_hist after insert or update on public.ew_app_config
  for each row execute function ew_private.config_history();

-- audit log of admin actions
create or replace function ew_private.audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
begin
  if not ew_private.is_admin() then
    return null;
  end if;
  insert into public.ew_audit_log (actor_id, actor_email, action, table_name, row_pk, old_data, new_data)
  values (auth.uid(), auth.jwt() ->> 'email', lower(tg_op), tg_table_name,
          coalesce(v_row ->> 'id', v_row ->> 'key', v_row ->> 'email', v_row ->> 'lesson_id',
                   v_row ->> 'step_id', v_row ->> 'question_id', v_row ->> 'material_id', v_row ->> 'code'),
          v_old, v_new);
  return null;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'ew_admins', 'ew_app_config', 'ew_legal_texts', 'ew_lessons', 'ew_lesson_translations',
    'ew_lesson_steps', 'ew_lesson_step_translations', 'ew_quiz_questions', 'ew_quiz_question_translations',
    'ew_materials', 'ew_material_translations', 'ew_material_prices', 'ew_regions', 'ew_electricians',
    'ew_reviews', 'ew_work_checks', 'ew_reports', 'ew_profiles'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function ew_private.audit()',
      t || '_audit', t);
  end loop;
end $$;

revoke all on all functions in schema ew_private from public;
grant execute on function ew_private.is_admin(), ew_private.is_active(),
  ew_private.owns_project(uuid), ew_private.is_api_caller() to authenticated, service_role;

-- ---------------------------------------------------------------- grants
do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'ew\_%' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- policies
-- profiles
create policy ew_profiles_select on public.ew_profiles for select to authenticated
  using (id = (select auth.uid()) or (select ew_private.is_admin()));
create policy ew_profiles_insert on public.ew_profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy ew_profiles_update on public.ew_profiles for update to authenticated
  using (id = (select auth.uid()) or (select ew_private.is_admin()))
  with check (id = (select auth.uid()) or (select ew_private.is_admin()));
create policy ew_profiles_delete on public.ew_profiles for delete to authenticated
  using (id = (select auth.uid()) or (select ew_private.is_admin()));

-- admins: only admins see or edit the list
create policy ew_admins_all on public.ew_admins for all to authenticated
  using ((select ew_private.is_admin())) with check ((select ew_private.is_admin()));

-- config
create policy ew_app_config_select on public.ew_app_config for select to authenticated using (true);
create policy ew_app_config_insert on public.ew_app_config for insert to authenticated
  with check ((select ew_private.is_admin()));
create policy ew_app_config_update on public.ew_app_config for update to authenticated
  using ((select ew_private.is_admin())) with check ((select ew_private.is_admin()));
create policy ew_app_config_delete on public.ew_app_config for delete to authenticated
  using ((select ew_private.is_admin()));
create policy ew_app_config_history_select on public.ew_app_config_history for select to authenticated
  using ((select ew_private.is_admin()));

-- legal
create policy ew_legal_select on public.ew_legal_texts for select to authenticated
  using (published or (select ew_private.is_admin()));
create policy ew_legal_insert on public.ew_legal_texts for insert to authenticated
  with check ((select ew_private.is_admin()));
create policy ew_legal_update on public.ew_legal_texts for update to authenticated
  using ((select ew_private.is_admin())) with check ((select ew_private.is_admin()));
create policy ew_legal_delete on public.ew_legal_texts for delete to authenticated
  using ((select ew_private.is_admin()));

-- consents
create policy ew_consents_select on public.ew_consents for select to authenticated
  using (user_id = (select auth.uid()) or (select ew_private.is_admin()));
create policy ew_consents_insert on public.ew_consents for insert to authenticated
  with check (user_id = (select auth.uid()));

-- projects (+ photos, markers)
create policy ew_projects_select on public.ew_projects for select to authenticated
  using (user_id = (select auth.uid()) or (select ew_private.is_admin()));
create policy ew_projects_insert on public.ew_projects for insert to authenticated
  with check (user_id = (select auth.uid()) and (select ew_private.is_active()));
create policy ew_projects_update on public.ew_projects for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy ew_projects_delete on public.ew_projects for delete to authenticated
  using (user_id = (select auth.uid()));

create policy ew_photos_select on public.ew_project_photos for select to authenticated
  using (user_id = (select auth.uid()) or (select ew_private.is_admin()));
create policy ew_photos_insert on public.ew_project_photos for insert to authenticated
  with check (user_id = (select auth.uid()) and ew_private.owns_project(project_id)
              and storage_path like (select auth.uid())::text || '/%');
create policy ew_photos_update on public.ew_project_photos for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and ew_private.owns_project(project_id)
              and storage_path like (select auth.uid())::text || '/%');
create policy ew_photos_delete on public.ew_project_photos for delete to authenticated
  using (user_id = (select auth.uid()));

create policy ew_markers_select on public.ew_markers for select to authenticated
  using (user_id = (select auth.uid()) or (select ew_private.is_admin()));
create policy ew_markers_insert on public.ew_markers for insert to authenticated
  with check (user_id = (select auth.uid()) and ew_private.owns_project(project_id));
create policy ew_markers_update on public.ew_markers for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and ew_private.owns_project(project_id));
create policy ew_markers_delete on public.ew_markers for delete to authenticated
  using (user_id = (select auth.uid()));

-- lessons: published content readable by everyone signed in, admin writes
create policy ew_lessons_select on public.ew_lessons for select to authenticated
  using (published or (select ew_private.is_admin()));
create policy ew_lessons_write on public.ew_lessons for insert to authenticated
  with check ((select ew_private.is_admin()));
create policy ew_lessons_update on public.ew_lessons for update to authenticated
  using ((select ew_private.is_admin())) with check ((select ew_private.is_admin()));
create policy ew_lessons_delete on public.ew_lessons for delete to authenticated
  using ((select ew_private.is_admin()));

do $$
declare
  t text;
begin
  foreach t in array array['ew_lesson_translations', 'ew_lesson_steps', 'ew_quiz_questions'] loop
    execute format($f$create policy %I on public.%I for select to authenticated
      using ((select ew_private.is_admin()) or exists (select 1 from public.ew_lessons l
             where l.id = lesson_id and l.published))$f$, t || '_select', t);
  end loop;
  execute $f$create policy ew_lesson_step_translations_select on public.ew_lesson_step_translations
    for select to authenticated using ((select ew_private.is_admin()) or exists (
      select 1 from public.ew_lesson_steps s join public.ew_lessons l on l.id = s.lesson_id
      where s.id = step_id and l.published))$f$;
  execute $f$create policy ew_quiz_question_translations_select on public.ew_quiz_question_translations
    for select to authenticated using ((select ew_private.is_admin()) or exists (
      select 1 from public.ew_quiz_questions q join public.ew_lessons l on l.id = q.lesson_id
      where q.id = question_id and l.published))$f$;

  -- admin-only writes for content & catalogue tables
  foreach t in array array['ew_lesson_translations', 'ew_lesson_steps', 'ew_lesson_step_translations',
                           'ew_quiz_questions', 'ew_quiz_question_translations', 'ew_regions',
                           'ew_materials', 'ew_material_translations', 'ew_material_prices'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check ((select ew_private.is_admin()))',
                   t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select ew_private.is_admin())) with check ((select ew_private.is_admin()))',
                   t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select ew_private.is_admin()))',
                   t || '_delete', t);
  end loop;

  foreach t in array array['ew_regions', 'ew_materials', 'ew_material_translations', 'ew_material_prices'] loop
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select', t);
  end loop;
end $$;

-- lesson progress
create policy ew_progress_select on public.ew_lesson_progress for select to authenticated
  using (user_id = (select auth.uid()) or (select ew_private.is_admin()));
create policy ew_progress_insert on public.ew_lesson_progress for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy ew_progress_update on public.ew_lesson_progress for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy ew_progress_delete on public.ew_lesson_progress for delete to authenticated
  using (user_id = (select auth.uid()));

-- electricians
create policy ew_electricians_select on public.ew_electricians for select to authenticated
  using (status = 'approved' or user_id = (select auth.uid()) or (select ew_private.is_admin()));
create policy ew_electricians_insert on public.ew_electricians for insert to authenticated
  with check ((select ew_private.is_admin())
              or (user_id = (select auth.uid()) and (select ew_private.is_active())));
create policy ew_electricians_update on public.ew_electricians for update to authenticated
  using (user_id = (select auth.uid()) or (select ew_private.is_admin()))
  with check (user_id = (select auth.uid()) or (select ew_private.is_admin()));
create policy ew_electricians_delete on public.ew_electricians for delete to authenticated
  using (user_id = (select auth.uid()) or (select ew_private.is_admin()));

-- reviews
create policy ew_reviews_select on public.ew_reviews for select to authenticated
  using (user_id = (select auth.uid()) or (select ew_private.is_admin())
         or (not hidden and exists (select 1 from public.ew_electricians e
                                    where e.id = electrician_id and e.status = 'approved')));
create policy ew_reviews_insert on public.ew_reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and (select ew_private.is_active()));
create policy ew_reviews_update on public.ew_reviews for update to authenticated
  using (user_id = (select auth.uid()) or (select ew_private.is_admin()))
  with check (user_id = (select auth.uid()) or (select ew_private.is_admin()));
create policy ew_reviews_delete on public.ew_reviews for delete to authenticated
  using (user_id = (select auth.uid()) or (select ew_private.is_admin()));

-- work checks: rows are written by the check-work edge function (service_role)
create policy ew_work_checks_select on public.ew_work_checks for select to authenticated
  using (user_id = (select auth.uid()) or (select ew_private.is_admin()));
create policy ew_work_checks_update on public.ew_work_checks for update to authenticated
  using (user_id = (select auth.uid()) or (select ew_private.is_admin()))
  with check (user_id = (select auth.uid()) or (select ew_private.is_admin()));
create policy ew_work_checks_delete on public.ew_work_checks for delete to authenticated
  using (user_id = (select auth.uid()));

-- AI call log: admin read only; written by edge functions with service_role
create policy ew_ai_calls_select on public.ew_ai_calls for select to authenticated
  using ((select ew_private.is_admin()));

-- reports
create policy ew_reports_select on public.ew_reports for select to authenticated
  using (user_id = (select auth.uid()) or (select ew_private.is_admin()));
create policy ew_reports_insert on public.ew_reports for insert to authenticated
  with check (user_id = (select auth.uid()) and (select ew_private.is_active()));
create policy ew_reports_update on public.ew_reports for update to authenticated
  using ((select ew_private.is_admin())) with check ((select ew_private.is_admin()));
create policy ew_reports_delete on public.ew_reports for delete to authenticated
  using ((select ew_private.is_admin()));

-- audit log: admin read only, written by trigger
create policy ew_audit_log_select on public.ew_audit_log for select to authenticated
  using ((select ew_private.is_admin()));
