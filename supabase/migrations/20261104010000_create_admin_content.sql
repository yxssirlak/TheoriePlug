-- Content voor de overige platform-tabs, beheerbaar via het beheerdashboard.

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  image_url text,
  options text[] not null check (array_length(options, 1) between 2 and 4),
  correct_option integer not null default 0,
  explanation text,
  category text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  front text not null,
  back text not null,
  category text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.cheat_sheet_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  category text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.adas_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['exam_questions', 'flashcards', 'cheat_sheet_items', 'adas_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s_read" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_admin_write" on public.%1$I', t);
    execute format(
      'create policy "%1$s_read" on public.%1$I for select to authenticated using ((is_published and public.has_active_access()) or public.is_admin())', t);
    execute format(
      'create policy "%1$s_admin_write" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Beheerders mogen alle gebruikers en hun toegang inzien (tab "Gebruikers")
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles for select to authenticated using (public.is_admin());
drop policy if exists "user_access_select_admin" on public.user_access;
create policy "user_access_select_admin" on public.user_access for select to authenticated using (public.is_admin());
