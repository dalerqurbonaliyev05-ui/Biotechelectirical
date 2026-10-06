-- ElektrUy: RPCs. Public wrappers are SECURITY INVOKER; anything that needs elevated
-- rights lives in ew_private (not exposed by PostgREST) and checks the caller itself.

-- Create/refresh the caller's profile from their Google metadata (called after sign-in).
create or replace function public.ew_ensure_profile(p_language text default null)
returns public.ew_profiles
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(auth.jwt() -> 'user_metadata', '{}'::jsonb);
  v_row public.ew_profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  insert into public.ew_profiles (id, display_name, avatar_url, language)
  values (auth.uid(),
          left(coalesce(nullif(v_meta ->> 'full_name', ''), nullif(v_meta ->> 'name', '')), 120),
          left(coalesce(nullif(v_meta ->> 'avatar_url', ''), nullif(v_meta ->> 'picture', '')), 1000),
          case when p_language in ('uz', 'ru', 'en') then p_language else 'uz' end)
  on conflict (id) do update
    set display_name = coalesce(public.ew_profiles.display_name, excluded.display_name),
        avatar_url = coalesce(excluded.avatar_url, public.ew_profiles.avatar_url)
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.ew_am_i_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select ew_private.is_admin();
$$;

-- Which legal texts the caller must (re-)accept: latest published version vs accepted version.
create or replace function public.ew_consent_status()
returns table (kind text, required_version int, accepted_version int)
language sql
stable
security invoker
set search_path = ''
as $$
  with req as (
    select l.kind, max(l.version) as v
    from public.ew_legal_texts l
    where l.published and l.kind in ('disclaimer', 'privacy')
    group by l.kind
  )
  select r.kind, r.v,
         coalesce((select max(c.version) from public.ew_consents c
                   where c.user_id = auth.uid() and c.type = r.kind), 0)
  from req r;
$$;

-- ------------------------------------------------------------- admin RPCs
create or replace function ew_private.admin_stats(p_days int)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 30), 365));
  v_from timestamptz := date_trunc('day', now()) - make_interval(days => v_days - 1);
begin
  if not ew_private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users_total', (select count(*) from public.ew_profiles),
    'users_new', (select count(*) from public.ew_profiles where created_at >= v_from),
    'projects_total', (select count(*) from public.ew_projects),
    'projects_out_of_scope', (select count(*) from public.ew_projects where out_of_scope),
    'projects_per_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d::date, 'count', coalesce(c.n, 0)) order by d)
      from generate_series(v_from, date_trunc('day', now()), interval '1 day') d
      left join (select date_trunc('day', created_at) as day, count(*) as n
                 from public.ew_projects where created_at >= v_from group by 1) c on c.day = d), '[]'::jsonb),
    'ai_calls_per_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d::date,
                                          'estimate', coalesce(c.est, 0), 'check', coalesce(c.chk, 0),
                                          'failed', coalesce(c.bad, 0)) order by d)
      from generate_series(v_from, date_trunc('day', now()), interval '1 day') d
      left join (select date_trunc('day', created_at) as day,
                        count(*) filter (where fn = 'estimate-room') as est,
                        count(*) filter (where fn = 'check-work') as chk,
                        count(*) filter (where not ok) as bad
                 from public.ew_ai_calls where created_at >= v_from group by 1) c on c.day = d), '[]'::jsonb),
    'ai_calls_total', (select count(*) from public.ew_ai_calls where created_at >= v_from),
    'work_checks', coalesce((
      select jsonb_object_agg(coalesce(overall, 'none'), n)
      from (select overall, count(*) as n from public.ew_work_checks where created_at >= v_from group by 1) x),
      '{}'::jsonb),
    'work_checks_flagged', (select count(*) from public.ew_work_checks where flagged_wrong and admin_status = 'none'),
    'top_lessons', coalesce((
      select jsonb_agg(x order by x.started desc)
      from (select l.slug, count(*) as started, count(p.completed_at) as completed
            from public.ew_lesson_progress p join public.ew_lessons l on l.id = p.lesson_id
            group by l.slug order by count(*) desc limit 10) x), '[]'::jsonb),
    'reports_open', (select count(*) from public.ew_reports where status in ('open', 'in_review')),
    'electricians_pending', (select count(*) from public.ew_electricians where status = 'pending'),
    'electricians_approved', (select count(*) from public.ew_electricians where status = 'approved')
  );
end $$;

create or replace function ew_private.admin_list_users(p_search text, p_limit int, p_offset int)
returns table (
  id uuid, email text, display_name text, language text, region text, is_banned boolean,
  created_at timestamptz, last_sign_in_at timestamptz, projects int, work_checks int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not ew_private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.display_name, p.language, p.region, p.is_banned,
           p.created_at, u.last_sign_in_at,
           (select count(*)::int from public.ew_projects pr where pr.user_id = p.id),
           (select count(*)::int from public.ew_work_checks w where w.user_id = p.id)
    from public.ew_profiles p
    join auth.users u on u.id = p.id
    where p_search is null or p_search = ''
       or u.email ilike '%' || p_search || '%'
       or p.display_name ilike '%' || p_search || '%'
    order by p.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 200))
    offset greatest(0, coalesce(p_offset, 0));
end $$;

revoke all on function ew_private.admin_stats(int), ew_private.admin_list_users(text, int, int) from public;
grant execute on function ew_private.admin_stats(int), ew_private.admin_list_users(text, int, int) to authenticated;

create or replace function public.ew_admin_stats(p_days int default 30)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select ew_private.admin_stats(p_days);
$$;

create or replace function public.ew_admin_list_users(p_search text default null, p_limit int default 50, p_offset int default 0)
returns table (
  id uuid, email text, display_name text, language text, region text, is_banned boolean,
  created_at timestamptz, last_sign_in_at timestamptz, projects int, work_checks int
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from ew_private.admin_list_users(p_search, p_limit, p_offset);
$$;

revoke all on function public.ew_ensure_profile(text), public.ew_am_i_admin(), public.ew_consent_status(),
  public.ew_admin_stats(int), public.ew_admin_list_users(text, int, int) from public, anon;
grant execute on function public.ew_ensure_profile(text), public.ew_am_i_admin(), public.ew_consent_status(),
  public.ew_admin_stats(int), public.ew_admin_list_users(text, int, int) to authenticated;
