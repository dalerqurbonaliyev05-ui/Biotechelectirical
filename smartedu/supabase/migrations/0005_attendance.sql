-- ════════════════════════════════════════════════════════════════
-- 0005 — Jonli darsga qo'shilish va davomat (+ RLS)
--
-- Davomat "ehtimoliy signal": QR (vaqt chegarali, yangilanib turadigan token) auditoriyada
-- bo'lish ehtimolini oshiradi, lekin o'zi to'liq himoya EMAS (rasmga olib uzatish, boshqa
-- qurilma orqali skanerlash mumkin). Shuning uchun qatnashish turi (auditoriya/masofadan)
-- va qayta kirishlar soni alohida qayd qilinadi — o'qituvchi o'zi baholaydi. docs/attendance.md
-- ════════════════════════════════════════════════════════════════

create type public.attendance_mode as enum ('auditorium', 'remote');

create table public.session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lecture_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  -- Javob berish uchun maxfiy token. Har qayta kirishda YANGILANADI: eski qurilma tokeni bekor bo'ladi.
  join_token text not null,
  mode public.attendance_mode not null,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  rejoin_count integer not null default 0,   -- takroriy kirishlar soni (signal)
  unique (session_id, student_id)
);
create index session_participants_session_idx on public.session_participants (session_id);

create table public.attendance (
  session_id uuid not null references public.lecture_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  mode public.attendance_mode not null,
  marked_at timestamptz not null default now(),
  primary key (session_id, student_id)
);
create index attendance_student_idx on public.attendance (student_id);

alter table public.session_participants enable row level security;
alter table public.attendance enable row level security;

-- Ishtirokchilar (token bor!): talabaga KO'RINMAYDI. O'qituvchi o'z sessiyasini, admin hammasini ko'radi.
create policy participants_admin on public.session_participants for select to authenticated using (public.is_admin());
create policy participants_teacher on public.session_participants for select to authenticated
  using (public.is_teacher() and public.session_visible(session_id));

create policy attendance_admin on public.attendance for select to authenticated using (public.is_admin());
create policy attendance_teacher on public.attendance for select to authenticated
  using (public.is_teacher() and public.session_visible(session_id));
create policy attendance_own on public.attendance for select to authenticated using (student_id = auth.uid());

-- Qo'shilish (service_role). Birinchi kirish: yozuv yaratadi. Takroriy kirish: token YANGILANADI,
-- rejoin_count oshadi; turi faqat yaxshilanadi (remote → auditorium), hech qachon pasaymaydi.
create function public.app_join_session(p_code text, p_student_id uuid, p_mode public.attendance_mode, p_token text)
returns table (out_session_id uuid, out_mode public.attendance_mode, out_rejoin integer, out_status public.session_status)
language plpgsql security definer set search_path = public as $$
declare
  s public.lecture_sessions%rowtype;
  st public.profiles%rowtype;
  p public.session_participants%rowtype;
  v_mode public.attendance_mode;
begin
  select * into s from public.lecture_sessions where code = p_code and status = 'active';
  if not found then raise exception 'session_not_found'; end if;
  select * into st from public.profiles where id = p_student_id and role = 'student' and is_active;
  if not found then raise exception 'forbidden'; end if;
  if s.group_id is not null and st.group_id is distinct from s.group_id then raise exception 'not_your_group'; end if;

  select * into p from public.session_participants where session_id = s.id and student_id = p_student_id for update;
  if found then
    v_mode := case when p.mode = 'auditorium' or p_mode = 'auditorium' then 'auditorium'::public.attendance_mode else 'remote'::public.attendance_mode end;
    update public.session_participants
      set join_token = p_token, mode = v_mode, rejoin_count = rejoin_count + 1, last_seen_at = now()
      where id = p.id;
    update public.attendance set mode = v_mode where session_id = s.id and student_id = p_student_id;
    return query select s.id, v_mode, p.rejoin_count + 1, s.status;
  else
    insert into public.session_participants (session_id, student_id, join_token, mode) values (s.id, p_student_id, p_token, p_mode);
    insert into public.attendance (session_id, student_id, mode) values (s.id, p_student_id, p_mode);
    return query select s.id, p_mode, 0, s.status;
  end if;
end $$;

revoke execute on function public.app_join_session(text, uuid, public.attendance_mode, text) from public, anon, authenticated;
grant execute on function public.app_join_session(text, uuid, public.attendance_mode, text) to service_role;
