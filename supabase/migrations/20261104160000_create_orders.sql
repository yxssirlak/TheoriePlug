-- Bestellingen: aangemaakt als 'pending', na betaling (Mollie webhook of mock) 'paid'.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  package_slug text not null,
  amount_cents integer not null,
  payment_method text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'canceled', 'expired')),
  marketing_opt_in boolean not null default false,
  provider text not null default 'mock',
  provider_payment_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);

alter table public.orders enable row level security;

-- Gebruikers mogen alleen hun eigen bestellingen lezen; schrijven gaat via de service role.
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select to authenticated
  using ((select auth.uid()) = user_id);
