-- ════════════════════════════════════════════════════════════════
-- 0004 — Jonli dars sessiyalari (doska holati) (+ RLS)
-- ════════════════════════════════════════════════════════════════

create type public.session_status as enum ('active', 'ended');

create table public.lecture_sessions (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  group_id uuid references public.groups (id) on delete set null,  -- bo'sh = istalgan talaba qo'shila oladi
  room_id uuid references public.rooms (id) on delete set null,
  code text not null check (code ~ '^[0-9]{6}$'),                   -- qo'shilish kodi
  status public.session_status not null default 'active',
  current_slide integer not null default 1 check (current_slide >= 1),
  rev integer not null default 0,           -- har o'zgarishda +1: mijozlar eskirgan hodisani tashlab yuboradi
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  check ((status = 'ended') = (ended_at is not null))
);
-- Kod faqat FAOL sessiyalar orasida noyob (tugaganidan keyin qayta ishlatilishi mumkin)
create unique index lecture_sessions_active_code on public.lecture_sessions (code) where status = 'active';
create index lecture_sessions_owner_idx on public.lecture_sessions (created_by, started_at desc);
create index lecture_sessions_lecture_idx on public.lecture_sessions (lecture_id);

create function public.session_owned(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lecture_sessions s where s.id = sid and s.created_by = auth.uid())
$$;
create function public.session_visible(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lecture_sessions s join public.lectures l on l.id = s.lecture_id
    where s.id = sid and (s.created_by = auth.uid() or public.teaches_subject(l.subject_id))
  )
$$;

alter table public.lecture_sessions enable row level security;
-- Talabaga to'g'ridan-to'g'ri kirish YO'Q: qo'shilish kod orqali, server API'si bilan.
create policy sessions_admin on public.lecture_sessions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy sessions_teacher_read on public.lecture_sessions for select to authenticated
  using (public.is_teacher() and (created_by = auth.uid() or public.lecture_visible(lecture_id)));
-- Yozish faqat server funksiyalari orqali (service_role)

-- 6 xonali kod bilan sessiya yaratish. Band kod chiqsa qayta urinadi.
create function public.app_create_session(p_lecture_id uuid, p_actor uuid, p_group_id uuid, p_room_id uuid)
returns public.lecture_sessions
language plpgsql security definer set search_path = public as $$
declare
  s public.lecture_sessions%rowtype;
  v_code text;
  tries int := 0;
begin
  if not exists (select 1 from public.lectures where id = p_lecture_id) then raise exception 'not_found'; end if;
  loop
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      insert into public.lecture_sessions (lecture_id, created_by, group_id, room_id, code)
      values (p_lecture_id, p_actor, p_group_id, p_room_id, v_code)
      returning * into s;
      return s;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 20 then raise exception 'code_exhausted'; end if;
    end;
  end loop;
end $$;

create function public.app_session_set_slide(p_session_id uuid, p_slide integer)
returns public.lecture_sessions
language plpgsql security definer set search_path = public as $$
declare s public.lecture_sessions%rowtype; pages int;
begin
  select * into s from public.lecture_sessions where id = p_session_id for update;
  if not found then raise exception 'not_found'; end if;
  if s.status <> 'active' then raise exception 'session_ended'; end if;
  select page_count into pages from public.lectures where id = s.lecture_id;
  if p_slide < 1 or p_slide > pages then raise exception 'slide_out_of_range'; end if;
  update public.lecture_sessions set current_slide = p_slide, rev = rev + 1 where id = p_session_id returning * into s;
  return s;
end $$;

create function public.app_session_end(p_session_id uuid)
returns public.lecture_sessions
language plpgsql security definer set search_path = public as $$
declare s public.lecture_sessions%rowtype;
begin
  select * into s from public.lecture_sessions where id = p_session_id for update;
  if not found then raise exception 'not_found'; end if;
  if s.status = 'ended' then return s; end if;
  update public.lecture_sessions set status = 'ended', ended_at = now(), rev = rev + 1 where id = p_session_id returning * into s;
  return s;
end $$;

revoke execute on function
  public.app_create_session(uuid, uuid, uuid, uuid),
  public.app_session_set_slide(uuid, integer),
  public.app_session_end(uuid)
from public, anon, authenticated;
grant execute on function
  public.app_create_session(uuid, uuid, uuid, uuid),
  public.app_session_set_slide(uuid, integer),
  public.app_session_end(uuid)
to service_role;
