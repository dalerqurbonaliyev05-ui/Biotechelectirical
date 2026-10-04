-- =====================================================================
-- FIZIKA ILOVASI — server funksiyalari (RPC)
-- Baholash serverda: javoblar mijozga test tugaguncha ko'rsatilmaydi.
-- =====================================================================

-- ---------- Profilni saqlash ----------
create or replace function public.fizika_save_profile(
  p_full_name text, p_phone text, p_role_type text, p_grade int,
  p_region text, p_district text default null, p_school text default null,
  p_avatar text default null, p_target text default null)
returns public.fizika_profiles
language plpgsql security definer set search_path = public as $$
declare r public.fizika_profiles;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_role_type not in ('student','abiturient') then raise exception 'bad_role'; end if;
  if p_role_type = 'student' and (p_grade is null or p_grade < 6 or p_grade > 11) then
    raise exception 'grade_required';
  end if;
  insert into fizika_profiles(id, full_name, phone, role_type, grade, region, district, school, avatar, target_university, is_admin)
  values (auth.uid(), coalesce(nullif(trim(p_full_name),''), 'Foydalanuvchi'), nullif(trim(p_phone),''), p_role_type,
          case when p_role_type='student' then p_grade else null end,
          coalesce(nullif(p_region,''),'Toshkent shahri'), p_district, p_school, coalesce(p_avatar,'⚛️'), p_target,
          exists(select 1 from fizika_admin_emails e where lower(e.email)=lower(coalesce(auth.jwt()->>'email',''))))
  on conflict (id) do update set
    full_name = excluded.full_name, phone = excluded.phone, role_type = excluded.role_type,
    grade = excluded.grade, region = excluded.region, district = excluded.district, school = excluded.school,
    avatar = excluded.avatar, target_university = excluded.target_university,
    is_admin = fizika_profiles.is_admin or excluded.is_admin, updated_at = now()
  returning * into r;
  return r;
end $$;

create or replace function public.fizika_me() returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.fizika_profiles; rw jsonb; st jsonb;
begin
  select * into p from fizika_profiles where id = auth.uid();
  if not found then return null; end if;
  select coalesce(jsonb_agg(reward_id), '[]') into rw from fizika_user_rewards where user_id = auth.uid();
  select jsonb_build_object(
    'tests', count(*) filter (where status='finished'),
    'perfect', count(*) filter (where status='finished' and total>0 and correct=total),
    'correct', coalesce(sum(correct) filter (where status='finished'),0),
    'answered', coalesce(sum(total) filter (where status='finished'),0),
    'daily_today', exists(select 1 from fizika_attempts a2 where a2.user_id=auth.uid() and a2.mode='daily'
                            and a2.status='finished' and (a2.started_at at time zone 'Asia/Tashkent')::date = (now() at time zone 'Asia/Tashkent')::date)
  ) into st from fizika_attempts where user_id = auth.uid();
  return to_jsonb(p) || jsonb_build_object('rewards', rw, 'stats', st);
end $$;

-- ---------- Ichki: savolni mijozga yuboriladigan ko'rinishi ----------
create or replace function public.fizika__q_public(q public.fizika_questions) returns jsonb
language sql immutable as $$
  select jsonb_build_object('id', q.id, 'qtype', q.qtype, 'difficulty', q.difficulty, 'stem', q.stem,
     'options', q.options, 'tasks', q.tasks, 'figure', q.figure, 'full_image', q.full_image, 'options_image', q.options_image,
     'topic', q.topic, 'source', q.source, 'exam_tag', q.exam_tag,
     'parts', case when q.qtype='open2' then jsonb_array_length(coalesce(q.answer->'parts','[]')) else null end,
     'unit_hint', q.answer->>'unit');
$$;

-- ---------- Testni boshlash ----------
create or replace function public.fizika_start_test(
  p_mode text, p_size int default 20, p_grade int default null, p_topic text default null,
  p_exam_tag text default null, p_qtype text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  prof public.fizika_profiles;
  ids bigint[];
  att uuid;
  instant boolean := true;
  ttl text;
  today date := (now() at time zone 'Asia/Tashkent')::date;
  aud text;
  sz int := greatest(5, least(coalesce(p_size,20), 60));
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into prof from fizika_profiles where id = uid;
  if not found then raise exception 'no_profile'; end if;
  if prof.is_blocked then raise exception 'blocked'; end if;
  aud := prof.role_type;

  if p_mode = 'grade_test' then
    select array_agg(id) into ids from (
      select id from fizika_questions
      where active and qtype in ('mc') and grades @> array[coalesce(p_grade, prof.grade)]::smallint[]
        and (p_topic is null or topic = p_topic)
      order by random() limit sz) s;
    ttl := coalesce(p_grade, prof.grade) || '-sinf testi';
  elsif p_mode = 'topic' then
    select array_agg(id) into ids from (
      select id from fizika_questions where active and qtype='mc' and topic = p_topic
        and (p_grade is null or grades @> array[p_grade]::smallint[])
      order by difficulty, random() limit sz) s;
    ttl := 'Mavzu bo''yicha test';
  elsif p_mode = 'abit_test' then
    select array_agg(id) into ids from (
      select id from fizika_questions where active and qtype='mc' and 'abiturient' = any(audience)
        and (p_topic is null or topic = p_topic)
      order by random() limit sz) s;
    ttl := sz || ' talik variant';
  elsif p_mode = 'open' then
    select array_agg(id) into ids from (
      select id from fizika_questions where active and qtype in ('open','open2')
        and (p_grade is null or grades @> array[p_grade]::smallint[] or 'abiturient' = any(audience) and p_grade is null)
        and (p_topic is null or topic = p_topic)
      order by random() limit sz) s;
    ttl := 'Javobini o''zi yozadigan testlar';
  elsif p_mode = 'daily' then
    -- kunlik: hamma uchun bir xil, osondan qiyinga
    select array_agg(id order by difficulty, h) into ids from (
      select id, difficulty, h from (
        select id, difficulty, md5(id::text || today::text || aud) h,
               row_number() over (partition by difficulty order by md5(id::text || today::text || aud)) rn
        from fizika_questions
        where active and qtype='mc' and verified
          and (aud = 'abiturient' and 'abiturient' = any(audience)
               or aud = 'student' and (grades @> array[prof.grade]::smallint[] or prof.grade >= 10 and 'abiturient' = any(audience)))
      ) r order by rn, difficulty limit 20
    ) s;
    ttl := 'Kunlik test · ' || to_char(today, 'DD.MM.YYYY');
  elsif p_mode = 'milliy' then
    instant := false;
    if p_exam_tag is not null then
      select array_agg(id order by (case qtype when 'mc' then 0 when 'matching' then 1 else 2 end), (source_ref)) into ids
      from (select id, qtype, (regexp_replace(coalesce(source_ref,'0'),'\D','','g'))::int as source_ref
            from fizika_questions where active and exam_tag = p_exam_tag) s;
      ttl := 'Milliy sertifikat · ' || p_exam_tag;
    else
      select array_agg(id) into ids from (
        (select id from (select id, difficulty from fizika_questions where active and qtype='mc' and 'abiturient' = any(audience) and verified
           order by random() limit 32) a order by difficulty)
        union all
        (select id from fizika_questions where active and qtype='matching' order by random() limit 1)
        union all
        (select id from fizika_questions where active and qtype='open2' order by random() limit 10)
      ) s;
      ttl := 'Milliy sertifikat · sinov varianti';
    end if;
  else
    raise exception 'bad_mode';
  end if;

  if ids is null or array_length(ids,1) is null then raise exception 'no_questions'; end if;

  insert into fizika_attempts(user_id, mode, title, grade, topic, question_ids, total, instant_feedback, meta)
  values (uid, p_mode, ttl, coalesce(p_grade, prof.grade), p_topic, ids, array_length(ids,1), instant,
          jsonb_build_object('exam_tag', p_exam_tag, 'size', sz))
  returning id into att;

  return jsonb_build_object('attempt_id', att, 'title', ttl, 'instant_feedback', instant, 'mode', p_mode,
     'time_limit_min', case when p_mode='milliy' then 150 else null end,
     'questions', (select jsonb_agg(fizika__q_public(q) order by array_position(ids, q.id))
                   from fizika_questions q where q.id = any(ids)));
end $$;

-- ---------- Ichki: baholash ----------
create or replace function public.fizika__grade(q public.fizika_questions, a jsonb) returns numeric
language plpgsql immutable as $$
declare pts numeric := 0; k text; i int; n numeric; c numeric; tol numeric;
begin
  if a is null then return 0; end if;
  if q.qtype = 'mc' then
    return case when upper(a #>> '{}') = upper(q.answer #>> '{}') then 1 else 0 end;
  elsif q.qtype = 'matching' then
    for k in select jsonb_object_keys(q.answer) loop
      if upper(coalesce(a->>k,'')) = upper(q.answer->>k) then pts := pts + 1; end if;
    end loop;
    return round(pts / greatest(1, (select count(*) from jsonb_object_keys(q.answer))), 2);
  elsif q.qtype in ('open','open2') then
    for i in 0 .. jsonb_array_length(q.answer->'parts') - 1 loop
      c := nullif(q.answer->'parts'->i->>'num','')::numeric;
      begin n := nullif(a->'parts'->i->>'num','')::numeric; exception when others then n := null; end;
      if c is not null and n is not null then
        tol := greatest(abs(c) * 0.02, 1e-12);
        if abs(n - c) <= tol then pts := pts + 1; end if;
      elsif lower(regexp_replace(coalesce(a->'parts'->i->>'text',''),'[\s‘''`ʻ’]','','g'))
            = lower(regexp_replace(coalesce(q.answer->'parts'->i->>'text',''),'[\s‘''`ʻ’]','','g'))
            and coalesce(a->'parts'->i->>'text','') <> '' then
        pts := pts + 1;
      end if;
    end loop;
    return round(pts / greatest(1, jsonb_array_length(q.answer->'parts')), 2);
  end if;
  return 0;
end $$;

-- ---------- Javob berish ----------
create or replace function public.fizika_answer(p_attempt uuid, p_question bigint, p_answer jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare at public.fizika_attempts; q public.fizika_questions; pts numeric; ex public.fizika_attempt_items;
begin
  select * into at from fizika_attempts where id = p_attempt and user_id = auth.uid();
  if not found then raise exception 'no_attempt'; end if;
  if at.status <> 'active' then raise exception 'finished'; end if;
  if not (p_question = any(at.question_ids)) then raise exception 'bad_question'; end if;
  select * into q from fizika_questions where id = p_question;
  select * into ex from fizika_attempt_items where attempt_id = p_attempt and question_id = p_question;
  if found and at.instant_feedback then
    pts := ex.points;  -- birinchi javob hisoblanadi
  else
    pts := fizika__grade(q, p_answer);
    insert into fizika_attempt_items(attempt_id, question_id, user_id, answer, is_correct, points)
    values (p_attempt, p_question, auth.uid(), p_answer, pts >= 0.999, pts)
    on conflict (attempt_id, question_id) do update set answer = excluded.answer,
      is_correct = excluded.is_correct, points = excluded.points, answered_at = now();
  end if;
  if at.instant_feedback then
    return jsonb_build_object('points', pts, 'correct', pts >= 0.999, 'answer', q.answer, 'explanation', q.explanation);
  end if;
  return jsonb_build_object('saved', true);
end $$;

-- ---------- Ichki: seriya, nishonlar ----------
create or replace function public.fizika__touch(uid uuid, add_xp int, add_coins int) returns void
language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'Asia/Tashkent')::date; p public.fizika_profiles; ns int;
begin
  -- faqat ichki funksiyalardan chaqiriladi (to'g'ridan-to'g'ri RPC orqali XP qo'shib bo'lmaydi)
  if coalesce(current_setting('fizika.internal', true), '') <> '1' then raise exception 'forbidden'; end if;
  select * into p from fizika_profiles where id = uid for update;
  ns := case when p.last_active = today then p.streak when p.last_active = today - 1 then p.streak + 1 else 1 end;
  update fizika_profiles set xp = xp + greatest(add_xp,0), coins = coins + greatest(add_coins,0),
    streak = ns, best_streak = greatest(best_streak, ns), last_active = today, updated_at = now()
  where id = uid;
  -- avtomatik nishonlar
  insert into fizika_user_rewards(user_id, reward_id)
  select uid, r.id from fizika_rewards r, fizika_profiles pr
  where pr.id = uid and r.active and r.kind <> 'gift'
    and (r.audience = 'all' or r.audience = pr.role_type)
    and (r.rule ? 'xp' is false or pr.xp >= (r.rule->>'xp')::int)
    and (r.rule ? 'streak' is false or pr.best_streak >= (r.rule->>'streak')::int)
    and (r.rule ? 'tests' is false or (select count(*) from fizika_attempts where user_id=uid and status='finished') >= (r.rule->>'tests')::int)
    and (r.rule ? 'perfect' is false or (select count(*) from fizika_attempts where user_id=uid and status='finished' and total>=5 and correct=total) >= (r.rule->>'perfect')::int)
    and (r.rule ? 'games' is false or (select count(*) from fizika_game_scores where user_id=uid) >= (r.rule->>'games')::int)
    and (r.rule ? 'daily' is false or (select count(*) from fizika_attempts where user_id=uid and mode='daily' and status='finished') >= (r.rule->>'daily')::int)
    and (r.rule ? 'milliy' is false or (select count(*) from fizika_attempts where user_id=uid and mode='milliy' and status='finished') >= (r.rule->>'milliy')::int)
    and r.rule <> '{}'::jsonb
  on conflict do nothing;
end $$;

-- ---------- Testni yakunlash ----------
create or replace function public.fizika_finish_test(p_attempt uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare at public.fizika_attempts; corr int; pts numeric; xp int := 0; coins int := 0; before_rw jsonb; after_rw jsonb;
        daily_done boolean; today date := (now() at time zone 'Asia/Tashkent')::date; ball numeric;
begin
  select * into at from fizika_attempts where id = p_attempt and user_id = auth.uid() for update;
  if not found then raise exception 'no_attempt'; end if;
  select coalesce(jsonb_agg(reward_id),'[]') into before_rw from fizika_user_rewards where user_id = auth.uid();
  if at.status = 'active' then
    select count(*) filter (where i.is_correct), coalesce(sum(i.points),0),
           coalesce(sum(i.points * (3 + q.difficulty * 2)),0)::int
      into corr, pts, xp
    from fizika_attempt_items i join fizika_questions q on q.id = i.question_id where i.attempt_id = p_attempt;
    -- milliy sertifikat bo'yicha TAXMINIY ball (maks. 75): 1-32 -> 1.3, 33-35 -> 2.2 (har biri), 36-45 -> 2.68
    if at.mode = 'milliy' then
      select coalesce(sum(case q.qtype when 'mc' then 1.3 * i.points when 'matching' then 6.6 * i.points else 2.68 * i.points end),0)
        into ball from fizika_attempt_items i join fizika_questions q on q.id=i.question_id where i.attempt_id=p_attempt;
    end if;
    coins := corr;
    if at.total >= 5 and corr = at.total then xp := xp + 25; coins := coins + 10; end if;
    if at.mode = 'daily' then
      select exists(select 1 from fizika_attempts where user_id=auth.uid() and mode='daily' and status='finished'
                    and (started_at at time zone 'Asia/Tashkent')::date = today) into daily_done;
      if daily_done then xp := xp / 4; else xp := xp + 30; coins := coins + 5; end if;
    end if;
    update fizika_attempts set status='finished', finished_at=now(), correct=corr,
      score = round(100.0 * pts / greatest(total,1), 2), xp_earned = xp, coins_earned = coins,
      meta = meta || case when ball is not null then jsonb_build_object('milliy_ball', round(ball,1)) else '{}'::jsonb end
    where id = p_attempt returning * into at;
    perform set_config('fizika.internal', '1', true);
    perform fizika__touch(auth.uid(), xp, coins);
  end if;
  select coalesce(jsonb_agg(reward_id),'[]') into after_rw from fizika_user_rewards where user_id = auth.uid();
  return jsonb_build_object(
    'attempt', to_jsonb(at),
    'new_rewards', (select coalesce(jsonb_agg(to_jsonb(r)),'[]') from fizika_rewards r
                    where r.id in (select jsonb_array_elements_text(after_rw)) and not (before_rw ? r.id)),
    'review', (select jsonb_agg(jsonb_build_object('question', fizika__q_public(q), 'answer', q.answer,
                 'explanation', q.explanation, 'given', i.answer, 'points', coalesce(i.points,0))
                 order by array_position(at.question_ids, q.id))
               from fizika_questions q left join fizika_attempt_items i on i.attempt_id = at.id and i.question_id = q.id
               where q.id = any(at.question_ids)));
end $$;

-- ---------- O'yin natijasi ----------
create or replace function public.fizika_record_game(p_game text, p_score int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare today_xp int; add int; before_rw jsonb; after_rw jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select coalesce(sum(xp_earned),0) into today_xp from fizika_game_scores
   where user_id = auth.uid() and (created_at at time zone 'Asia/Tashkent')::date = (now() at time zone 'Asia/Tashkent')::date;
  add := greatest(0, least(coalesce(p_score,0), 60, 300 - today_xp));
  select coalesce(jsonb_agg(reward_id),'[]') into before_rw from fizika_user_rewards where user_id = auth.uid();
  insert into fizika_game_scores(user_id, game, score, xp_earned) values (auth.uid(), left(p_game,40), greatest(p_score,0), add);
  perform set_config('fizika.internal', '1', true);
  perform fizika__touch(auth.uid(), add, add / 10);
  select coalesce(jsonb_agg(reward_id),'[]') into after_rw from fizika_user_rewards where user_id = auth.uid();
  return jsonb_build_object('xp', add, 'capped', add < least(coalesce(p_score,0),60),
    'new_rewards', (select coalesce(jsonb_agg(to_jsonb(r)),'[]') from fizika_rewards r
                    where r.id in (select jsonb_array_elements_text(after_rw)) and not (before_rw ? r.id)));
end $$;

-- ---------- Sovg'ani tangalar evaziga olish ----------
create or replace function public.fizika_claim_reward(p_reward text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.fizika_rewards; p public.fizika_profiles;
begin
  select * into r from fizika_rewards where id = p_reward and active;
  if not found then raise exception 'no_reward'; end if;
  select * into p from fizika_profiles where id = auth.uid() for update;
  if exists(select 1 from fizika_user_rewards where user_id=auth.uid() and reward_id=p_reward) then raise exception 'already'; end if;
  if r.audience <> 'all' and r.audience <> p.role_type then raise exception 'not_for_you'; end if;
  if p.coins < r.cost_coins then raise exception 'not_enough_coins'; end if;
  update fizika_profiles set coins = coins - r.cost_coins where id = auth.uid();
  insert into fizika_user_rewards(user_id, reward_id) values (auth.uid(), p_reward);
  return jsonb_build_object('ok', true, 'coins', p.coins - r.cost_coins);
end $$;

-- ---------- Reyting ----------
create or replace function public.fizika_leaderboard(
  p_scope text default 'uz', p_region text default null, p_role text default null,
  p_grade int default null, p_period text default 'all', p_limit int default 50)
returns table(rank bigint, user_id uuid, full_name text, avatar text, region text, grade smallint, role_type text, xp bigint, is_me boolean)
language sql stable security definer set search_path = public as $$
  with base as (
    select p.id, p.full_name, p.avatar, p.region, p.grade, p.role_type,
      case when p_period = 'week' then
        coalesce((select sum(a.xp_earned) from fizika_attempts a where a.user_id=p.id and a.status='finished' and a.finished_at > now() - interval '7 days'),0)
      + coalesce((select sum(g.xp_earned) from fizika_game_scores g where g.user_id=p.id and g.created_at > now() - interval '7 days'),0)
      else p.xp end::bigint as pts
    from fizika_profiles p
    where not p.is_blocked
      and (p_scope <> 'region' or p.region = p_region)
      and (p_role is null or p.role_type = p_role)
      and (p_grade is null or p.grade = p_grade)
  ), ranked as (
    select rank() over (order by pts desc) rk, * from base
  )
  select rk, id, full_name, avatar, region, grade, role_type, pts, id = auth.uid()
  from ranked where rk <= greatest(least(p_limit,200),1) or id = auth.uid()
  order by rk limit greatest(least(p_limit,200),1) + 1;
$$;

create or replace function public.fizika_region_stats(p_role text default null)
returns table(region text, users bigint, total_xp bigint, avg_xp numeric)
language sql stable security definer set search_path = public as $$
  select region, count(*), sum(xp)::bigint, round(avg(xp),1) from fizika_profiles
  where not is_blocked and (p_role is null or role_type = p_role)
  group by region order by avg(xp) desc;
$$;

-- ---------- Xato haqida xabar ----------
create or replace function public.fizika_report(p_question bigint, p_message text) returns void
language sql security definer set search_path = public as $$
  insert into fizika_reports(user_id, question_id, message) values (auth.uid(), p_question, left(p_message, 1000));
$$;

-- ---------- Mavzular bo'yicha savollar soni ----------
create or replace function public.fizika_catalog() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'topics', (select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'grades', t.grades, 'section', t.section,
                 'count', (select count(*) from fizika_questions q where q.active and q.topic = t.id and q.qtype='mc')) order by t.sort)
               from fizika_topics t),
    'exams', (select jsonb_agg(distinct exam_tag) from fizika_questions where exam_tag is not null and active),
    'by_grade', (select jsonb_object_agg(g, c) from (select unnest(grades) g, count(*) c from fizika_questions where active and qtype='mc' group by 1) s),
    'tg', (select coalesce(jsonb_object_agg(topic || ':' || g, c), '{}') from (select topic, unnest(grades) g, count(*) c from fizika_questions where active and qtype='mc' and topic is not null group by 1, 2) s),
    'open_count', (select count(*) from fizika_questions where active and qtype in ('open','open2')),
    'total', (select count(*) from fizika_questions where active));
$$;

-- ---------- ADMIN ----------
create or replace function public.fizika_admin_import(p_rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not fizika_is_admin() then raise exception 'forbidden'; end if;
  insert into fizika_questions(ext_id, source, source_ref, topic, grades, audience, qtype, difficulty, stem, options, tasks,
                               answer, explanation, figure, full_image, options_image, exam_tag, verified, created_by)
  select r->>'ext_id', coalesce(r->>'source','admin'), r->>'source_ref', r->>'topic',
         coalesce((select array_agg(x::smallint) from jsonb_array_elements_text(r->'grades') x), '{}'),
         coalesce((select array_agg(x) from jsonb_array_elements_text(r->'audience') x), '{student,abiturient}'),
         r->>'qtype', coalesce((r->>'difficulty')::smallint, 2), r->>'stem', r->'options', r->'tasks', r->'answer',
         r->>'explanation', r->>'figure', r->>'full_image', r->>'options_image', r->>'exam_tag', coalesce((r->>'verified')::boolean,false), auth.uid()
  from jsonb_array_elements(p_rows) r
  where r->>'topic' is null or exists(select 1 from fizika_topics t where t.id = r->>'topic')
  on conflict (ext_id) do update set source=excluded.source, source_ref=excluded.source_ref, topic=excluded.topic,
    grades=excluded.grades, audience=excluded.audience, qtype=excluded.qtype, difficulty=excluded.difficulty,
    stem=excluded.stem, options=excluded.options, tasks=excluded.tasks, answer=excluded.answer,
    explanation=excluded.explanation, figure=excluded.figure, full_image=excluded.full_image, options_image=excluded.options_image, exam_tag=excluded.exam_tag,
    verified=excluded.verified, updated_at=now();
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.fizika_admin_stats() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not fizika_is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'users', (select count(*) from fizika_profiles),
    'students', (select count(*) from fizika_profiles where role_type='student'),
    'abiturients', (select count(*) from fizika_profiles where role_type='abiturient'),
    'by_grade', (select coalesce(jsonb_object_agg(grade, c),'{}') from (select grade, count(*) c from fizika_profiles where grade is not null group by grade) s),
    'by_region', (select coalesce(jsonb_object_agg(region, c),'{}') from (select region, count(*) c from fizika_profiles group by region) s),
    'questions', (select count(*) from fizika_questions),
    'unverified', (select count(*) from fizika_questions where not verified),
    'attempts', (select count(*) from fizika_attempts where status='finished'),
    'attempts_7d', (select coalesce(jsonb_object_agg(d, c),'{}') from (
        select to_char((started_at at time zone 'Asia/Tashkent')::date,'MM-DD') d, count(*) c from fizika_attempts
        where started_at > now() - interval '7 days' group by 1) s),
    'active_today', (select count(*) from fizika_profiles where last_active = (now() at time zone 'Asia/Tashkent')::date),
    'reports_new', (select count(*) from fizika_reports where status='new'),
    'hardest', (select coalesce(jsonb_agg(x),'[]') from (
        select q.id, left(q.stem,120) stem, count(*) n, round(avg(case when i.is_correct then 1 else 0 end)*100) pct
        from fizika_attempt_items i join fizika_questions q on q.id=i.question_id
        group by q.id, q.stem having count(*) >= 3 order by avg(case when i.is_correct then 1 else 0 end) limit 10) x)
  );
end $$;

-- Ruxsatlar
revoke execute on function public.fizika__touch(uuid,int,int) from public, anon, authenticated;
revoke execute on function public.fizika__grade(public.fizika_questions, jsonb) from public, anon, authenticated;
grant execute on function public.fizika_save_profile(text,text,text,int,text,text,text,text,text) to authenticated;
grant execute on function public.fizika_me() to authenticated;
grant execute on function public.fizika_start_test(text,int,int,text,text,text) to authenticated;
grant execute on function public.fizika_answer(uuid,bigint,jsonb) to authenticated;
grant execute on function public.fizika_finish_test(uuid) to authenticated;
grant execute on function public.fizika_record_game(text,int) to authenticated;
grant execute on function public.fizika_claim_reward(text) to authenticated;
grant execute on function public.fizika_leaderboard(text,text,text,int,text,int) to authenticated;
grant execute on function public.fizika_region_stats(text) to authenticated;
grant execute on function public.fizika_report(bigint,text) to authenticated;
grant execute on function public.fizika_catalog() to authenticated, anon;
grant execute on function public.fizika_admin_import(jsonb) to authenticated;
grant execute on function public.fizika_admin_stats() to authenticated;
revoke execute on function public.fizika_save_profile(text,text,text,int,text,text,text,text,text) from anon;
revoke execute on function public.fizika_start_test(text,int,int,text,text,text) from anon;
revoke execute on function public.fizika_answer(uuid,bigint,jsonb) from anon;
revoke execute on function public.fizika_finish_test(uuid) from anon;
revoke execute on function public.fizika_record_game(text,int) from anon;
revoke execute on function public.fizika_admin_import(jsonb) from anon;
revoke execute on function public.fizika_admin_stats() from anon;
