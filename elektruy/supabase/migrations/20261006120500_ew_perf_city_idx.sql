-- Advisor fix: cover the ew_electricians.city foreign key.
create index if not exists ew_electricians_city_idx on public.ew_electricians (city);
