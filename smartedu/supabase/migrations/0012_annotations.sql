-- ════════════════════════════════════════════════════════════════
-- v2 · 11-bosqich: slayd ustidagi izohlar (chizma va KaTeX matn)
-- ════════════════════════════════════════════════════════════════
-- Har bir (dars, slayd) uchun bitta JSON hujjat: [{t:'s',...}, {t:'x',...}]. Koordinatalar 0..1 (slayd o'lchamiga nisbatan).
-- Yozish faqat server orqali (o'qituvchi tekshiriladi); talabalarga faqat `share_annotations` yoqilgan bo'lsa API beradi.
create table public.session_annotations (
  session_id uuid not null references public.lecture_sessions (id) on delete cascade,
  slide_no integer not null check (slide_no >= 1),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and pg_column_size(items) <= 262144),
  updated_at timestamptz not null default now(),
  primary key (session_id, slide_no)
);
alter table public.session_annotations enable row level security;
create policy annotations_admin on public.session_annotations for select to authenticated using (public.is_admin());
create policy annotations_teacher on public.session_annotations for select to authenticated
  using (public.is_teacher() and public.session_visible(session_id));

create function public.app_save_annotations(p_session_id uuid, p_slide integer, p_items jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare s public.lecture_sessions%rowtype;
begin
  select * into s from public.lecture_sessions where id = p_session_id;
  if not found then raise exception 'not_found'; end if;
  if s.status <> 'active' then raise exception 'session_ended'; end if;
  if p_slide < 1 or p_slide > coalesce((select page_count from public.lectures where id = s.lecture_id), 1) then
    raise exception 'slide_out_of_range';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'validation'; end if;
  insert into public.session_annotations (session_id, slide_no, items) values (p_session_id, p_slide, p_items)
  on conflict (session_id, slide_no) do update set items = excluded.items, updated_at = now();
end $$;

revoke execute on function public.app_save_annotations(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.app_save_annotations(uuid, integer, jsonb) to service_role;
