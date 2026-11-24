-- ════════════════════════════════════════════════════════════════
-- v2 · 10-bosqich: "Doskaga qarang", faollik (heartbeat), tanaffus, NB ro'yxati, saqlash muddati
-- ════════════════════════════════════════════════════════════════
-- Sezgir ma'lumot (kuzatish vaqti, reaksiyalar, NB): faqat shu dars o'qituvchisi/admin va talabaning o'zi.
-- Doska holatiga (SessionState) NB HECH QACHON kirmaydi: u faqat o'qituvchi sahifasida va API'sida.

alter table public.lecture_sessions
  add column focus_seq integer not null default 0,
  add column focus_at timestamptz,
  add column break_started_at timestamptz;

create table public.session_breaks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lecture_sessions (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  check (ended_at is null or ended_at >= started_at)
);
create index session_breaks_session_idx on public.session_breaks (session_id);
alter table public.session_breaks enable row level security;
create policy breaks_admin on public.session_breaks for select to authenticated using (public.is_admin());
create policy breaks_teacher on public.session_breaks for select to authenticated
  using (public.is_teacher() and public.session_visible(session_id));

-- Faollik hisoblagichlari (serverdagi vaqt bo'yicha; mijoz soatiga ishonilmaydi)
alter table public.session_participants
  add column present_seconds integer not null default 0,
  add column hidden_seconds integer not null default 0,
  add column last_ping_at timestamptz,
  add column last_ping_visible boolean;

-- Davomat natijasi: avtomatik holat + o'qituvchi tuzatishi (har bir tuzatish audit_log'da)
alter table public.attendance
  alter column mode drop not null,
  add column status text not null default 'present' check (status in ('present', 'nb')),
  add column attendance_ratio numeric(4, 3),
  add column present_seconds integer,
  add column override_status text check (override_status in ('present', 'nb')),
  add column override_by uuid references public.profiles (id) on delete set null,
  add column override_reason text,
  add column override_at timestamptz;

insert into public.app_settings (key, value) values ('activity_retention_days', '180')
on conflict (key) do nothing;

-- ── Funksiyalar (faqat service_role) ────────────────────────────
-- Heartbeat. Oraliq 120 s dan oshsa (qurilma uxlagan/oflayn) hisoblanmaydi; tanaffus vaqti chiqarib tashlanadi.
create function public.app_presence_ping(p_session_id uuid, p_student_id uuid, p_visible boolean)
returns table (out_focus_seq integer, out_on_break boolean, out_ended boolean)
language plpgsql security definer set search_path = public as $$
declare s public.lecture_sessions%rowtype; p public.session_participants%rowtype;
        raw numeric; overlap numeric; delta integer;
begin
  select * into s from public.lecture_sessions where id = p_session_id;
  if not found then raise exception 'not_found'; end if;
  select * into p from public.session_participants where session_id = p_session_id and student_id = p_student_id for update;
  if not found then raise exception 'not_participant'; end if;
  if p.blocked then raise exception 'blocked'; end if;
  if s.status <> 'active' then
    return query select s.focus_seq, false, true;
    return;
  end if;
  delta := 0;
  if p.last_ping_at is not null then
    raw := extract(epoch from (now() - p.last_ping_at));
    if raw > 0 and raw <= 120 then
      select coalesce(sum(greatest(0, extract(epoch from (least(coalesce(b.ended_at, now()), now()) - greatest(b.started_at, p.last_ping_at))))), 0)
        into overlap from public.session_breaks b where b.session_id = p_session_id;
      delta := greatest(0, floor(raw - overlap))::integer;
    end if;
  end if;
  update public.session_participants set
      present_seconds = present_seconds + case when coalesce(last_ping_visible, true) then delta else 0 end,
      hidden_seconds = hidden_seconds + case when coalesce(last_ping_visible, true) then 0 else delta end,
      last_ping_at = now(), last_ping_visible = p_visible, last_seen_at = now()
    where id = p.id;
  return query select s.focus_seq, s.break_started_at is not null, false;
end $$;

create function public.app_focus_call(p_session_id uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  update public.lecture_sessions set focus_seq = focus_seq + 1, focus_at = now(), rev = rev + 1
    where id = p_session_id and status = 'active' returning focus_seq into v;
  if not found then raise exception 'session_ended'; end if;
  return v;
end $$;

create function public.app_break_start(p_session_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s public.lecture_sessions%rowtype;
begin
  select * into s from public.lecture_sessions where id = p_session_id for update;
  if not found then raise exception 'not_found'; end if;
  if s.status <> 'active' then raise exception 'session_ended'; end if;
  if s.break_started_at is not null then raise exception 'break_active'; end if;
  insert into public.session_breaks (session_id) values (p_session_id);
  update public.lecture_sessions set break_started_at = now(), rev = rev + 1 where id = p_session_id;
end $$;

create function public.app_break_end(p_session_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s public.lecture_sessions%rowtype;
begin
  select * into s from public.lecture_sessions where id = p_session_id for update;
  if not found then raise exception 'not_found'; end if;
  if s.break_started_at is null then raise exception 'no_break'; end if;
  update public.session_breaks set ended_at = now() where session_id = p_session_id and ended_at is null;
  update public.lecture_sessions set break_started_at = null, rev = rev + 1 where id = p_session_id;
end $$;

-- Dars tugagach hisoblangan natijalar: [{student_id, status, ratio, present_seconds, group_member}]
-- Qo'shilmagan guruh a'zosi uchun ham qator yaratiladi (mode NULL, status 'nb'). O'qituvchi tuzatishi (override_*) saqlanadi.
create function public.app_write_attendance_results(p_session_id uuid, p_rows jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare r jsonb; n integer := 0;
begin
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    insert into public.attendance (session_id, student_id, mode, status, attendance_ratio, present_seconds)
    values (p_session_id, (r->>'student_id')::uuid, null, r->>'status', (r->>'ratio')::numeric, (r->>'present_seconds')::integer)
    on conflict (session_id, student_id) do update
      set status = excluded.status, attendance_ratio = excluded.attendance_ratio, present_seconds = excluded.present_seconds;
    n := n + 1;
  end loop;
  return n;
end $$;

-- O'qituvchining qo'lda tuzatishi: sabab MAJBURIY, har safar audit_log'ga yoziladi.
create function public.app_override_attendance(
  p_session_id uuid, p_student_id uuid, p_status text, p_reason text, p_actor uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare a public.attendance%rowtype; old_status text;
begin
  if p_status not in ('present', 'nb') then raise exception 'validation'; end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then raise exception 'reason_required'; end if;
  if not exists (select 1 from public.profiles where id = p_student_id and role = 'student') then raise exception 'not_found'; end if;
  select * into a from public.attendance where session_id = p_session_id and student_id = p_student_id for update;
  if found then
    old_status := coalesce(a.override_status, a.status);
    update public.attendance set override_status = p_status, override_by = p_actor, override_reason = btrim(p_reason), override_at = now()
      where session_id = p_session_id and student_id = p_student_id;
  else
    old_status := 'nb';
    insert into public.attendance (session_id, student_id, mode, status, override_status, override_by, override_reason, override_at)
    values (p_session_id, p_student_id, null, 'nb', p_status, p_actor, btrim(p_reason), now());
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, subject_student_id, old_value, new_value, reason)
  values (p_actor, 'attendance.override', 'session', p_session_id, p_student_id,
          jsonb_build_object('status', old_status), jsonb_build_object('status', p_status), btrim(p_reason));
end $$;

-- Saqlash muddati: tugagan darslarning sezgir faollik ma'lumotlari p_days kundan keyin tozalanadi.
-- Davomat HOLATI (present/nb) o'quv yozuvi sifatida qoladi; reaksiyalar va vaqt hisoblagichlari o'chadi.
create function public.app_purge_activity(p_days integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cutoff timestamptz := now() - make_interval(days => greatest(p_days, 1)); v_react integer; v_part integer; v_att integer;
begin
  delete from public.session_reactions r using public.lecture_sessions s
    where s.id = r.session_id and s.status = 'ended' and s.ended_at < cutoff;
  get diagnostics v_react = row_count;
  update public.session_participants p set present_seconds = 0, hidden_seconds = 0, last_ping_at = null, last_ping_visible = null
    from public.lecture_sessions s
    where s.id = p.session_id and s.status = 'ended' and s.ended_at < cutoff
      and (p.present_seconds <> 0 or p.hidden_seconds <> 0 or p.last_ping_at is not null);
  get diagnostics v_part = row_count;
  update public.attendance a set attendance_ratio = null, present_seconds = null
    from public.lecture_sessions s
    where s.id = a.session_id and s.status = 'ended' and s.ended_at < cutoff
      and (a.attendance_ratio is not null or a.present_seconds is not null);
  get diagnostics v_att = row_count;
  return jsonb_build_object('reactions', v_react, 'participants', v_part, 'attendance', v_att);
end $$;

revoke execute on function
  public.app_presence_ping(uuid, uuid, boolean), public.app_focus_call(uuid),
  public.app_break_start(uuid), public.app_break_end(uuid),
  public.app_write_attendance_results(uuid, jsonb),
  public.app_override_attendance(uuid, uuid, text, text, uuid),
  public.app_purge_activity(integer)
from public, anon, authenticated;
grant execute on function
  public.app_presence_ping(uuid, uuid, boolean), public.app_focus_call(uuid),
  public.app_break_start(uuid), public.app_break_end(uuid),
  public.app_write_attendance_results(uuid, jsonb),
  public.app_override_attendance(uuid, uuid, text, text, uuid),
  public.app_purge_activity(integer)
to service_role;
