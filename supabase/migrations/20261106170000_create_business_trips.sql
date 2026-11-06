create table public.business_trips (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  trip_date date not null,
  start_address text not null check (length(trim(start_address)) between 3 and 250),
  destination_address text not null check (length(trim(destination_address)) between 3 and 250),
  resolved_start text not null,
  resolved_destination text not null,
  purpose text not null check (length(trim(purpose)) between 1 and 250),
  one_way_meters integer not null check (one_way_meters between 0 and 100000000),
  return_trip boolean not null default false,
  distance_meters integer generated always as (one_way_meters * case when return_trip then 2 else 1 end) stored,
  rate_cents_per_km integer not null default 23 check (rate_cents_per_km = 23),
  total_cost_cents integer generated always as
    (round(one_way_meters::numeric * case when return_trip then 2 else 1 end * rate_cents_per_km / 1000)::integer) stored
);

alter table public.business_trips enable row level security;

create policy "business_trips_admin_read" on public.business_trips
  for select to authenticated using (public.is_admin());

create policy "business_trips_admin_insert" on public.business_trips
  for insert to authenticated with check (public.is_admin() and created_by = auth.uid());
