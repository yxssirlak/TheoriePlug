create table if not exists public.profiles (
  id uuid primary key references auth.users (id),
  first_name text,
  last_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_days integer not null,
  price_cents integer not null,
  is_active boolean default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  package_id uuid not null references public.packages (id),
  payment_status text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists user_access_package_id_idx
  on public.user_access (package_id);

create index if not exists user_access_user_id_idx
  on public.user_access (user_id);

create index if not exists user_access_expires_at_idx
  on public.user_access (expires_at);

alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.user_access enable row level security;
