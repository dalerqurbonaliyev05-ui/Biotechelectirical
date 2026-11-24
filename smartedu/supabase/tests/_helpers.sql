-- Test yordamchilari (har bir test fayli boshida: \i supabase/tests/_helpers.sql)
create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end $$;

create function pg_temp.expect(label text, got bigint, want bigint) returns void language plpgsql as $$
begin
  if got is distinct from want then
    raise exception 'TEST YIQILDI [%]: kutilgan %, olingan %', label, want, got;
  end if;
  raise notice 'ok  - %', label;
end $$;

-- stmt xato bilan tugashi va xabarda `needle` bo'lishi kerak
create function pg_temp.expect_error(label text, stmt text, needle text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if position(needle in sqlerrm) = 0 then
      raise exception 'TEST YIQILDI [%]: kutilgan xato "%", olingan "%"', label, needle, sqlerrm;
    end if;
    raise notice 'ok  - %', label;
    return;
  end;
  raise exception 'TEST YIQILDI [%]: xato kutilgan edi, lekin bajarildi', label;
end $$;
