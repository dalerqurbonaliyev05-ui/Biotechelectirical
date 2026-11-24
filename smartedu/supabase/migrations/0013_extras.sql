-- ════════════════════════════════════════════════════════════════
-- v2 · 15-bosqich (ixtiyoriy): anonim savol qutisi va tezkor so'rov
-- ════════════════════════════════════════════════════════════════
-- Savol qutisi: talaba dars paytida savol yozadi (standart: ANONIM — o'qituvchi sahifasida ham muallif ko'rsatilmaydi:
-- muallif identifikatori faqat serverda saqlanadi va API javoblariga hech qachon qo'shilmaydi). Boshqalar ovoz beradi.
create table public.session_asks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lecture_sessions (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (length(btrim(body)) between 3 and 300),
  anonymous boolean not null default true,
  on_board boolean not null default false,
  answered boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index session_asks_session_idx on public.session_asks (session_id);
create unique index session_asks_one_on_board on public.session_asks (session_id) where on_board;

create table public.session_ask_votes (
  ask_id uuid not null references public.session_asks (id) on delete cascade,
  voter_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ask_id, voter_id)
);

-- Tezkor so'rov (balli emas, to'g'ri javobsiz): ha/yo'q yoki 2–6 variant
create table public.session_polls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lecture_sessions (id) on delete cascade,
  body text not null check (length(btrim(body)) between 3 and 200),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
create unique index session_polls_one_open on public.session_polls (session_id) where closed_at is null;
create table public.session_poll_votes (
  poll_id uuid not null references public.session_polls (id) on delete cascade,
  voter_id uuid not null references auth.users (id) on delete cascade,
  option_id text not null,
  primary key (poll_id, voter_id)
);

alter table public.session_asks enable row level security;
alter table public.session_ask_votes enable row level security;
alter table public.session_polls enable row level security;
alter table public.session_poll_votes enable row level security;

-- Savol qutisi: to'g'ridan-to'g'ri o'qish FAQAT muallifning o'ziga (anonimlik); o'qituvchi/doska serverdagi API orqali (muallifsiz).
create policy asks_own on public.session_asks for select to authenticated using (author_id = auth.uid());
create policy ask_votes_own on public.session_ask_votes for select to authenticated using (voter_id = auth.uid());
-- So'rov: o'qituvchi/admin ko'radi (natija), ovozlar — faqat o'zining ovozi talabaga
create policy polls_admin on public.session_polls for select to authenticated using (public.is_admin());
create policy polls_teacher on public.session_polls for select to authenticated using (public.is_teacher() and public.session_visible(session_id));
create policy poll_votes_own on public.session_poll_votes for select to authenticated using (voter_id = auth.uid());
create policy poll_votes_teacher on public.session_poll_votes for select to authenticated
  using (public.is_teacher() and exists (select 1 from public.session_polls p where p.id = poll_id and public.session_visible(p.session_id)));

create function public.app_ask_create(p_session_id uuid, p_student_id uuid, p_body text, p_anonymous boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare s public.lecture_sessions%rowtype; part public.session_participants%rowtype; v uuid;
begin
  select * into s from public.lecture_sessions where id = p_session_id;
  if not found then raise exception 'not_found'; end if;
  if s.status <> 'active' then raise exception 'session_ended'; end if;
  select * into part from public.session_participants where session_id = p_session_id and student_id = p_student_id;
  if not found then raise exception 'not_participant'; end if;
  if part.blocked then raise exception 'blocked'; end if;
  if p_body is null or length(btrim(p_body)) < 3 or length(btrim(p_body)) > 300 then raise exception 'validation'; end if;
  if (select count(*) from public.session_asks where session_id = p_session_id and author_id = p_student_id) >= 5 then raise exception 'ask_limit'; end if;
  insert into public.session_asks (session_id, author_id, body, anonymous) values (p_session_id, p_student_id, btrim(p_body), coalesce(p_anonymous, true)) returning id into v;
  return v;
end $$;

-- "Men ham shuni so'ramoqchiman": har talaba bitta ovoz; qayta bosish — o'zgarmaydi
create function public.app_ask_vote(p_ask_id uuid, p_voter_id uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare a public.session_asks%rowtype; part public.session_participants%rowtype;
begin
  select * into a from public.session_asks where id = p_ask_id;
  if not found or a.hidden then raise exception 'not_found'; end if;
  if (select status from public.lecture_sessions where id = a.session_id) <> 'active' then raise exception 'session_ended'; end if;
  select * into part from public.session_participants where session_id = a.session_id and student_id = p_voter_id;
  if not found then raise exception 'not_participant'; end if;
  if part.blocked then raise exception 'blocked'; end if;
  insert into public.session_ask_votes (ask_id, voter_id) values (p_ask_id, p_voter_id) on conflict do nothing;
  return (select count(*) from public.session_ask_votes where ask_id = p_ask_id)::integer;
end $$;

-- O'qituvchi boshqaruvi (huquq API'da tekshiriladi). Doskaga bitta savol chiqadi; rev oshadi.
create function public.app_ask_moderate(p_ask_id uuid, p_session_id uuid, p_on_board boolean, p_answered boolean, p_hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
declare a public.session_asks%rowtype;
begin
  select * into a from public.session_asks where id = p_ask_id and session_id = p_session_id for update;
  if not found then raise exception 'not_found'; end if;
  if p_on_board is true then
    update public.session_asks set on_board = false where session_id = p_session_id and on_board;
  end if;
  update public.session_asks set
    on_board = case when coalesce(p_hidden, hidden) then false else coalesce(p_on_board, on_board) end,
    answered = coalesce(p_answered, answered),
    hidden = coalesce(p_hidden, hidden)
  where id = p_ask_id;
  update public.lecture_sessions set rev = rev + 1 where id = p_session_id;
end $$;

create function public.app_poll_open(p_session_id uuid, p_body text, p_options jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare s public.lecture_sessions%rowtype; v uuid;
begin
  select * into s from public.lecture_sessions where id = p_session_id for update;
  if not found then raise exception 'not_found'; end if;
  if s.status <> 'active' then raise exception 'session_ended'; end if;
  update public.session_polls set closed_at = now() where session_id = p_session_id and closed_at is null;
  insert into public.session_polls (session_id, body, options) values (p_session_id, btrim(p_body), p_options) returning id into v;
  update public.lecture_sessions set rev = rev + 1 where id = p_session_id;
  return v;
end $$;

create function public.app_poll_close(p_session_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.lecture_sessions where id = p_session_id for update;
  update public.session_polls set closed_at = now() where session_id = p_session_id and closed_at is null;
  if not found then raise exception 'no_open_poll'; end if;
  update public.lecture_sessions set rev = rev + 1 where id = p_session_id;
end $$;

create function public.app_poll_vote(p_poll_id uuid, p_voter_id uuid, p_option_id text) returns void
language plpgsql security definer set search_path = public as $$
declare po public.session_polls%rowtype; part public.session_participants%rowtype;
begin
  select * into po from public.session_polls where id = p_poll_id;
  if not found then raise exception 'not_found'; end if;
  if po.closed_at is not null then raise exception 'closed'; end if;
  select * into part from public.session_participants where session_id = po.session_id and student_id = p_voter_id;
  if not found then raise exception 'not_participant'; end if;
  if part.blocked then raise exception 'blocked'; end if;
  if not exists (select 1 from jsonb_array_elements(po.options) o where o->>'id' = p_option_id) then raise exception 'validation'; end if;
  begin
    insert into public.session_poll_votes (poll_id, voter_id, option_id) values (p_poll_id, p_voter_id, p_option_id);
  exception when unique_violation then
    raise exception 'duplicate';
  end;
end $$;

revoke execute on function
  public.app_ask_create(uuid, uuid, text, boolean), public.app_ask_vote(uuid, uuid),
  public.app_ask_moderate(uuid, uuid, boolean, boolean, boolean),
  public.app_poll_open(uuid, text, jsonb), public.app_poll_close(uuid), public.app_poll_vote(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function
  public.app_ask_create(uuid, uuid, text, boolean), public.app_ask_vote(uuid, uuid),
  public.app_ask_moderate(uuid, uuid, boolean, boolean, boolean),
  public.app_poll_open(uuid, text, jsonb), public.app_poll_close(uuid), public.app_poll_vote(uuid, uuid, text)
to service_role;
