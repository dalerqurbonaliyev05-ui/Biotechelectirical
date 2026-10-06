-- RLS smoke test for ElektrUy. Runs entirely inside a transaction and ROLLS BACK,
-- so it is safe to run against the live project (SQL editor or MCP execute_sql).
-- Needs at least two rows in auth.users (uses the first two by creation time).
begin;

create temp table _u on commit drop as
  select id, row_number() over (order by created_at) as n from auth.users order by created_at limit 2;
grant select on _u to authenticated, anon;
create temp table _r (name text, ok boolean) on commit drop;
grant insert, select on _r to authenticated, anon;

-- ------------------------------------------------------------------ user A
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from _u where n = 1), 'role', 'authenticated')::text, true);

select public.ew_ensure_profile('en');
insert into _r values ('A: profile created', exists (select 1 from public.ew_profiles where id = auth.uid()));

update public.ew_profiles set is_banned = true where id = auth.uid();
insert into _r values ('A: cannot self-ban (guard)',
  (select not is_banned from public.ew_profiles where id = auth.uid()));

insert into public.ew_projects (id, title) values ('00000000-0000-4000-8000-00000000a001', 'A room');
insert into _r values ('A: owns project', exists (select 1 from public.ew_projects where id = '00000000-0000-4000-8000-00000000a001'));

insert into public.ew_electricians (name, phone, city, status, rating_avg)
values ('Test Elektrik', '+998 90 123 45 67', 'tashkent_city', 'approved', 5);
insert into _r values ('A: electrician forced to pending',
  (select status = 'pending' and rating_avg = 0 from public.ew_electricians where user_id = auth.uid()));

insert into _r values ('A: sees 10 published lessons', (select count(*) = 10 from public.ew_lessons));
insert into _r values ('A: not admin', not public.ew_am_i_admin());
insert into _r values ('A: cannot read audit log', (select count(*) = 0 from public.ew_audit_log));
insert into _r values ('A: config readable', (select count(*) >= 9 from public.ew_app_config));

-- non-admin write to catalogue must fail
do $$ begin
  begin
    update public.ew_materials set default_price = 1 where key = 'socket';
    insert into _r values ('A: material update blocked', not found);
  exception when others then
    insert into _r values ('A: material update blocked', true);
  end;
end $$;

-- ------------------------------------------------------------------ user B
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from _u where n = 2), 'role', 'authenticated')::text, true);
insert into _r values ('B: cannot see A project',
  not exists (select 1 from public.ew_projects where id = '00000000-0000-4000-8000-00000000a001'));
insert into _r values ('B: cannot see A pending electrician',
  not exists (select 1 from public.ew_electricians where name = 'Test Elektrik'));
do $$ begin
  begin
    insert into public.ew_markers (project_id, type) values ('00000000-0000-4000-8000-00000000a001', 'socket');
    insert into _r values ('B: cannot add marker to A project', false);
  exception when others then
    insert into _r values ('B: cannot add marker to A project', true);
  end;
end $$;

-- ------------------------------------------------------------------ anon
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.ew_lessons limit 1;
    insert into _r values ('anon: no table access', false);
  exception when insufficient_privilege then
    insert into _r values ('anon: no table access', true);
  end;
end $$;

reset role;
select name, ok from _r;
rollback;
