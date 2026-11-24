-- ════════════════════════════════════════════════════════════════
-- 0009 — Mehmon rejimi (anonim kirish), kodni yangilash, bloklash, mehmonni talabaga bog'lash
--
-- Mehmon = Supabase anonim foydalanuvchisi (auth.users'da bor, profiles'da YO'Q). Shuning uchun dars jadvallaridagi
-- `student_id` endi `auth.users` ga ishora qiladi (talaba ham, mehmon ham). Semestr reytingi faqat guruh ro'yxatidagi
-- talabalar (profiles) bo'yicha hisoblanadi → bog'lanmagan mehmon reytingga kirmaydi.
-- ════════════════════════════════════════════════════════════════

alter table public.session_participants drop constraint session_participants_student_id_fkey,
  add constraint session_participants_student_id_fkey foreign key (student_id) references auth.users (id) on delete cascade;
alter table public.attendance drop constraint attendance_student_id_fkey,
  add constraint attendance_student_id_fkey foreign key (student_id) references auth.users (id) on delete cascade;
alter table public.session_answers drop constraint session_answers_student_id_fkey,
  add constraint session_answers_student_id_fkey foreign key (student_id) references auth.users (id) on delete cascade;
alter table public.scores drop constraint scores_student_id_fkey,
  add constraint scores_student_id_fkey foreign key (student_id) references auth.users (id) on delete cascade;

alter table public.session_participants
  add column is_guest boolean not null default false,
  add column guest_name text check (guest_name is null or length(btrim(guest_name)) between 2 and 60),
  add column guest_group text check (guest_group is null or length(guest_group) <= 60),
  add column linked_student_id uuid references public.profiles (id) on delete set null,
  add column blocked boolean not null default false,
  add constraint guest_has_name check (not is_guest or guest_name is not null);

alter table public.lecture_sessions
  add column allow_guests boolean not null default true,
  add column min_attendance_ratio numeric(3, 2) not null default 0.80 check (min_attendance_ratio between 0 and 1),
  add column top_reactors integer not null default 1 check (top_reactors between 1 and 10),
  add column show_reactor_names boolean not null default false,
  add column bonus_enabled boolean not null default true,
  add column confused_enabled boolean not null default true,
  add column share_annotations boolean not null default false;

-- Qo'shilish (talaba YOKI mehmon). Bloklangan ishtirokchi qayta kira olmaydi.
drop function public.app_join_session(text, uuid, public.attendance_mode, text);
create function public.app_join_session(
  p_code text, p_user_id uuid, p_mode public.attendance_mode, p_token text,
  p_is_guest boolean default false, p_guest_name text default null, p_guest_group text default null
) returns table (out_session_id uuid, out_mode public.attendance_mode, out_rejoin integer, out_status public.session_status)
language plpgsql security definer set search_path = public as $$
declare
  s public.lecture_sessions%rowtype;
  st public.profiles%rowtype;
  p public.session_participants%rowtype;
  v_mode public.attendance_mode;
begin
  select * into s from public.lecture_sessions where code = p_code and status = 'active';
  if not found then raise exception 'session_not_found'; end if;

  if p_is_guest then
    if not s.allow_guests then raise exception 'guests_not_allowed'; end if;
    if p_guest_name is null or length(btrim(p_guest_name)) < 2 then raise exception 'guest_name_required'; end if;
    if exists (select 1 from public.profiles where id = p_user_id) then raise exception 'forbidden'; end if;
  else
    select * into st from public.profiles where id = p_user_id and role = 'student' and is_active;
    if not found then raise exception 'forbidden'; end if;
    if s.group_id is not null and st.group_id is distinct from s.group_id then raise exception 'not_your_group'; end if;
  end if;

  select * into p from public.session_participants where session_id = s.id and student_id = p_user_id for update;
  if found then
    if p.blocked then raise exception 'blocked'; end if;
    v_mode := case when p.mode = 'auditorium' or p_mode = 'auditorium' then 'auditorium'::public.attendance_mode else 'remote'::public.attendance_mode end;
    update public.session_participants set join_token = p_token, mode = v_mode, rejoin_count = rejoin_count + 1, last_seen_at = now() where id = p.id;
    update public.attendance set mode = v_mode where session_id = s.id and student_id = p_user_id;
    return query select s.id, v_mode, p.rejoin_count + 1, s.status;
  else
    insert into public.session_participants (session_id, student_id, join_token, mode, is_guest, guest_name, guest_group)
    values (s.id, p_user_id, p_token, p_mode, p_is_guest, case when p_is_guest then btrim(p_guest_name) end, case when p_is_guest then nullif(btrim(p_guest_group), '') end);
    insert into public.attendance (session_id, student_id, mode) values (s.id, p_user_id, p_mode);
    return query select s.id, p_mode, 0, s.status;
  end if;
end $$;

-- Kodni yangilash: eski kod darhol bekor bo'ladi (mavjud ishtirokchilar sessiya id bilan ishlaydi)
create function public.app_rotate_session_code(p_session_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_code text; tries int := 0;
begin
  perform 1 from public.lecture_sessions where id = p_session_id and status = 'active' for update;
  if not found then raise exception 'session_ended'; end if;
  loop
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      update public.lecture_sessions set code = v_code, rev = rev + 1 where id = p_session_id;
      return v_code;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 20 then raise exception 'code_exhausted'; end if;
    end;
  end loop;
end $$;

-- Dars TUGAGACH mehmonni ro'yxatdagi talabaga bog'lash: javoblar, ballar, davomat o'sha talabaga o'tadi.
create function public.app_link_guest(p_session_id uuid, p_participant_id uuid, p_student_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s public.lecture_sessions%rowtype; g public.session_participants%rowtype;
begin
  select * into s from public.lecture_sessions where id = p_session_id for update;
  if not found then raise exception 'not_found'; end if;
  if s.status <> 'ended' then raise exception 'session_active'; end if;
  select * into g from public.session_participants where id = p_participant_id and session_id = p_session_id for update;
  if not found or not g.is_guest or g.linked_student_id is not null then raise exception 'not_found'; end if;
  if not exists (select 1 from public.profiles where id = p_student_id and role = 'student' and is_active) then raise exception 'forbidden'; end if;
  if exists (select 1 from public.session_participants where session_id = p_session_id and student_id = p_student_id) then raise exception 'student_already_joined'; end if;

  update public.session_answers set student_id = p_student_id where session_id = p_session_id and student_id = g.student_id;
  update public.scores set student_id = p_student_id where session_id = p_session_id and student_id = g.student_id;
  update public.attendance set student_id = p_student_id where session_id = p_session_id and student_id = g.student_id;
  update public.session_participants set student_id = p_student_id, linked_student_id = p_student_id where id = g.id;
end $$;

revoke execute on function
  public.app_join_session(text, uuid, public.attendance_mode, text, boolean, text, text),
  public.app_rotate_session_code(uuid),
  public.app_link_guest(uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function
  public.app_join_session(text, uuid, public.attendance_mode, text, boolean, text, text),
  public.app_rotate_session_code(uuid),
  public.app_link_guest(uuid, uuid, uuid)
to service_role;

-- Sozlama o'zgarganda `rev` oshadi (doska/talabalar yangilanishni oladi)
create function public.app_session_touch(p_session_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.lecture_sessions set rev = rev + 1 where id = p_session_id
$$;
revoke execute on function public.app_session_touch(uuid) from public, anon, authenticated;
grant execute on function public.app_session_touch(uuid) to service_role;
