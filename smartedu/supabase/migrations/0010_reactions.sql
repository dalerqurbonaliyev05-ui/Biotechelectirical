-- ════════════════════════════════════════════════════════════════
-- v2 · 9-bosqich: reaksiyalar ("Tushundim" / "Tushunmadim") va eng faol talabaga bonus savol
-- ════════════════════════════════════════════════════════════════
-- Sezgir ma'lumot: faqat shu dars o'qituvchisi (va admin) hamda talabaning o'zi ko'radi.
-- Yozish faqat server (service_role) orqali: ~5 soniyalik paketlar, har bir talaba/slayd/tur uchun yuqori chegara.

-- Bonus savol faqat belgilangan talabalarga (target_ids) ko'rinadi va javob oladi
alter table public.session_questions
  add column audience text not null default 'all' check (audience in ('all', 'targeted')),
  add column target_ids uuid[] not null default '{}',
  add constraint targeted_has_targets check (audience = 'all' or cardinality(target_ids) > 0);

create type public.reaction_kind as enum ('understood', 'confused');

create table public.session_reactions (
  session_id uuid not null references public.lecture_sessions (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  slide_no integer not null check (slide_no >= 1),
  kind public.reaction_kind not null,
  cnt integer not null default 0 check (cnt >= 0),
  updated_at timestamptz not null default now(),
  primary key (session_id, student_id, slide_no, kind)
);
create index session_reactions_session_idx on public.session_reactions (session_id, slide_no);

alter table public.session_reactions enable row level security;
create policy reactions_admin on public.session_reactions for select to authenticated using (public.is_admin());
create policy reactions_teacher on public.session_reactions for select to authenticated
  using (public.is_teacher() and public.session_visible(session_id));
create policy reactions_own on public.session_reactions for select to authenticated using (student_id = auth.uid());

-- Paketni yozish. Har bir chaqiruvda har tur uchun ko'pi bilan 5 ta qo'shiladi, har bir talaba/slayd/tur
-- uchun jami 20 dan oshmaydi (spamga qarshi). Bloklangan / ishtirokchi bo'lmagan / tugagan sessiya — rad.
create function public.app_add_reactions(
  p_session_id uuid, p_student_id uuid, p_slide integer, p_understood integer, p_confused integer
) returns table (out_understood integer, out_confused integer)
language plpgsql security definer set search_path = public as $$
declare s public.lecture_sessions%rowtype; part public.session_participants%rowtype;
        u integer := least(greatest(coalesce(p_understood, 0), 0), 5);
        c integer := least(greatest(coalesce(p_confused, 0), 0), 5);
begin
  select * into s from public.lecture_sessions where id = p_session_id;
  if not found then raise exception 'not_found'; end if;
  if s.status <> 'active' then raise exception 'session_ended'; end if;
  select * into part from public.session_participants where session_id = p_session_id and student_id = p_student_id;
  if not found then raise exception 'not_participant'; end if;
  if part.blocked then raise exception 'blocked'; end if;
  if p_slide < 1 or p_slide > coalesce((select page_count from public.lectures where id = s.lecture_id), 1) then
    raise exception 'validation';
  end if;
  if not s.confused_enabled then c := 0; end if;
  if u > 0 then
    insert into public.session_reactions (session_id, student_id, slide_no, kind, cnt)
    values (p_session_id, p_student_id, p_slide, 'understood', u)
    on conflict (session_id, student_id, slide_no, kind)
    do update set cnt = least(20, public.session_reactions.cnt + u), updated_at = now();
  end if;
  if c > 0 then
    insert into public.session_reactions (session_id, student_id, slide_no, kind, cnt)
    values (p_session_id, p_student_id, p_slide, 'confused', c)
    on conflict (session_id, student_id, slide_no, kind)
    do update set cnt = least(20, public.session_reactions.cnt + c), updated_at = now();
  end if;
  return query
    select coalesce(sum(cnt) filter (where kind = 'understood'), 0)::integer,
           coalesce(sum(cnt) filter (where kind = 'confused'), 0)::integer
    from public.session_reactions where session_id = p_session_id and slide_no = p_slide;
end $$;

-- "Eng faol" talabalar: reaksiyalar yig'indisi bo'yicha (teng bo'lsa — talaba id bo'yicha, ya'ni deterministik).
-- Bloklanganlar kirmaydi. Ommaviy tahlil uchun emas: bonus savol nishoni.
create function public.app_top_reactors(p_session_id uuid, p_limit integer)
returns table (out_student_id uuid, out_total integer)
language sql security definer set search_path = public as $$
  select r.student_id, sum(r.cnt)::integer as total
  from public.session_reactions r
  join public.session_participants p on p.session_id = r.session_id and p.student_id = r.student_id
  where r.session_id = p_session_id and not p.blocked
  group by r.student_id
  having sum(r.cnt) > 0
  order by total desc, r.student_id
  limit greatest(1, least(coalesce(p_limit, 1), 10))
$$;

-- Bonus savol: nishonli talabalar bilan ochiladi (app_open_session_question o'zgarmaydi — bu uning nishonli varianti)
create function public.app_open_targeted_question(
  p_session_id uuid, p_lecture_question_id uuid, p_question_id uuid, p_slide integer,
  p_limit integer, p_variant jsonb, p_opened_at timestamptz, p_targets uuid[]
) returns public.session_questions
language plpgsql security definer set search_path = public as $$
declare q public.session_questions%rowtype;
begin
  if p_targets is null or cardinality(p_targets) = 0 then raise exception 'validation'; end if;
  q := public.app_open_session_question(p_session_id, p_lecture_question_id, p_question_id, p_slide, p_limit, p_variant, p_opened_at);
  update public.session_questions set audience = 'targeted', target_ids = p_targets where id = q.id returning * into q;
  return q;
end $$;

revoke execute on function
  public.app_add_reactions(uuid, uuid, integer, integer, integer),
  public.app_top_reactors(uuid, integer),
  public.app_open_targeted_question(uuid, uuid, uuid, integer, integer, jsonb, timestamptz, uuid[])
from public, anon, authenticated;
grant execute on function
  public.app_add_reactions(uuid, uuid, integer, integer, integer),
  public.app_top_reactors(uuid, integer),
  public.app_open_targeted_question(uuid, uuid, uuid, integer, integer, jsonb, timestamptz, uuid[])
to service_role;
